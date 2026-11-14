import { createHash, randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open } from 'node:fs/promises';
import { dirname, isAbsolute, join, parse } from 'node:path';
import { requireValue } from './protocol.js';
const digest = (value) => createHash('sha256').update(value).digest('hex');
/** Immutable operation records survive host restarts; no credential is stored here. */
export class MagpieJournal {
    directory;
    constructor(directory) { this.directory = directory; }
    async prepare() {
        requireValue(isAbsolute(this.directory), 'Magpie refresh storage must be absolute.');
        const parents = [];
        for (let path = this.directory; path !== parse(path).root; path = dirname(path))
            parents.unshift(path);
        for (const path of parents) {
            try {
                await mkdir(path, { mode: 0o700 });
            }
            catch (error) {
                if (error.code !== 'EEXIST')
                    throw new Error('Magpie refresh storage is unavailable.');
            }
            const info = await lstat(path);
            requireValue(info.isDirectory() && !info.isSymbolicLink(), 'Magpie refresh storage contains an unsafe path.');
        }
        const info = await lstat(this.directory);
        requireValue((info.mode & 0o777) === 0o700 && info.uid === process.getuid?.(), 'Magpie refresh storage must be private (0700).');
    }
    path(binding) { return join(this.directory, `${digest(binding)}.json`); }
    async pending(binding) {
        await this.prepare();
        try {
            await lstat(this.path(binding));
            return true;
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return false;
            throw new Error('Magpie refresh state is unavailable.');
        }
    }
    async begin(binding) {
        await this.prepare();
        const path = this.path(binding);
        const record = { rotation: randomBytes(32).toString('hex'), started: Date.now() };
        let handle;
        try {
            handle = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
        }
        catch (error) {
            if (error.code !== 'EEXIST')
                throw new Error('Magpie refresh could not be recorded.');
        }
        if (handle) {
            try {
                await handle.writeFile(JSON.stringify(record));
                await handle.sync();
            }
            finally {
                await handle.close();
            }
            const directory = await open(this.directory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
            try {
                await directory.sync();
            }
            finally {
                await directory.close();
            }
        }
        const reader = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
        try {
            const info = await reader.stat();
            requireValue(info.isFile() && info.size < 256 && (info.mode & 0o777) === 0o600 && info.uid === process.getuid?.(), 'Magpie refresh record is unsafe.');
            const kept = JSON.parse(await reader.readFile('utf8'));
            requireValue(/^[a-f0-9]{64}$/.test(kept.rotation) && Number.isSafeInteger(kept.started) && kept.started > 0 && Date.now() >= kept.started && Date.now() - kept.started < 600_000, 'Magpie refresh recovery expired or is invalid. Reconnect this account.');
            // Sync even when recovering a record another host created before a crash.
            await reader.sync();
            return kept;
        }
        finally {
            await reader.close();
        }
    }
}
