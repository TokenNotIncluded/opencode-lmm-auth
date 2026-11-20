import { createHash, randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open } from 'node:fs/promises';
import { dirname, isAbsolute, join, parse } from 'node:path';
import { requireValue } from './protocol.ts';
import { windowsJournal } from './magpie-windows-journal.ts';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');

function parseRecord(content: string): { rotation: string; started: number } {
  const kept = JSON.parse(content);
  requireValue(/^[a-f0-9]{64}$/.test(kept.rotation) && Number.isSafeInteger(kept.started) && kept.started > 0 && Date.now() >= kept.started && Date.now() - kept.started < 600_000, 'Magpie refresh recovery expired or is invalid. Reconnect this account.');
  return kept;
}

/** Immutable operation records survive host restarts; no credential is stored here. */
export class MagpieJournal {
  readonly directory: string;
  constructor(directory: string) { this.directory = directory; }

  private async prepare() {
    requireValue(isAbsolute(this.directory), 'Magpie refresh storage must be absolute.');
    const parents: string[] = [];
    for (let path = this.directory; path !== parse(path).root; path = dirname(path)) parents.unshift(path);
    for (const path of parents) {
      try { await mkdir(path, { mode: 0o700 }); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw new Error('Magpie refresh storage is unavailable.'); }
      const info = await lstat(path);
      requireValue(info.isDirectory() && !info.isSymbolicLink(), 'Magpie refresh storage contains an unsafe path.');
    }
    const info = await lstat(this.directory);
    requireValue((info.mode & 0o777) === 0o700 && info.uid === process.getuid?.(), 'Magpie refresh storage must be private (0700).');
  }

  private path(binding: string) { return join(this.directory, `${digest(binding)}.json`); }

  async pending(binding: string): Promise<boolean> {
    if (process.platform === 'win32') return (await windowsJournal(this.directory, digest(binding) + '.json', 'pending')).exists;
    await this.prepare();
    try { await lstat(this.path(binding)); return true; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw new Error('Magpie refresh state is unavailable.'); }
  }

  async begin(binding: string): Promise<{ rotation: string; started: number }> {
    if (process.platform === 'win32') {
      const record = { rotation: randomBytes(32).toString('hex'), started: Date.now() };
      const result = await windowsJournal(this.directory, digest(binding) + '.json', 'begin', JSON.stringify(record));
      requireValue(typeof result.content === 'string', 'Magpie refresh state is unavailable.');
      return parseRecord(result.content);
    }
    await this.prepare();
    const path = this.path(binding);
    const record = { rotation: randomBytes(32).toString('hex'), started: Date.now() };
    let handle;
    try { handle = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw new Error('Magpie refresh could not be recorded.');
    }
    if (handle) {
      try { await handle.writeFile(JSON.stringify(record)); await handle.sync(); }
      finally { await handle.close(); }
      const directory = await open(this.directory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      try { await directory.sync(); } finally { await directory.close(); }
    }
    const reader = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const info = await reader.stat();
      requireValue(info.isFile() && info.size < 256 && (info.mode & 0o777) === 0o600 && info.uid === process.getuid?.(), 'Magpie refresh record is unsafe.');
      const kept = parseRecord(await reader.readFile('utf8'));
      // Sync even when recovering a record another host created before a crash.
      await reader.sync();
      return kept;
    } finally { await reader.close(); }
  }
}
