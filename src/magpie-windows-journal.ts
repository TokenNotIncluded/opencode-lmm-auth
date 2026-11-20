import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { LmmError, requireValue } from './protocol.ts';

let program: Promise<string> | undefined;
type Result = { exists: boolean; content: string | null };

/** Windows has SID/DACL security, not POSIX uid/mode bits. Never repair an existing ACL. */
export async function windowsJournal(directory: string, name: string, action: 'pending' | 'begin', content: string | null = null): Promise<Result> {
  requireValue(process.platform === 'win32', 'Windows journal is unavailable.');
  const systemRoot = process.env.SystemRoot;
  requireValue(typeof systemRoot === 'string' && isAbsolute(systemRoot), 'Windows journal is unavailable.');
  const executable = join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  // src is part of the existing package file list. This URL resolves identically
  // from the source module and from its compiled dist module.
  program ??= readFile(new URL('../src/magpie-windows-journal.ps1', import.meta.url), 'utf8');
  const fixedProgram = await program;
  const payload = JSON.stringify({ directory, name, action, content });
  requireValue(Buffer.byteLength(payload) <= 16384, 'Windows journal input is invalid.');
  const unavailable = () => new LmmError('invalid_response', 'Magpie refresh storage could not be verified on Windows.');
  return new Promise<Result>((resolve, reject) => {
    let inputFailed = false;
    const child = execFile(executable, ['-NoProfile', '-NonInteractive', '-Command', fixedProgram], {
      windowsHide: true, timeout: 5000, maxBuffer: 4096, encoding: 'utf8',
    }, (error, stdout) => {
      if (error || inputFailed) {
        let detail = '';
        try {
          const failure = JSON.parse(stdout);
          if (failure?.error === 'unverified_windows_journal'
            && ['input', 'compile', 'storage', 'result'].includes(failure.stage)
            && Number.isInteger(failure.nativeCode) && failure.nativeCode >= 0 && failure.nativeCode <= 65535) {
            detail = ' (' + failure.stage + ', native ' + failure.nativeCode + ')';
          }
        } catch { /* Keep failures fixed and credential-free. */ }
        reject(new LmmError('invalid_response', 'Magpie refresh storage could not be verified on Windows.' + detail));
        return;
      }
      try {
        const result: unknown = JSON.parse(stdout);
        if (!result || typeof result !== 'object' || Array.isArray(result)) throw unavailable();
        const value = result as Record<string, unknown>;
        if (Object.keys(value).sort().join(',') !== 'content,exists'
          || typeof value.exists !== 'boolean'
          || (value.content !== null && typeof value.content !== 'string')
          || (action === 'begin' && (!value.exists || typeof value.content !== 'string'))
          || (typeof value.content === 'string' && Buffer.byteLength(value.content) >= 256)) throw unavailable();
        resolve(value as Result);
      } catch { reject(unavailable()); }
    });
    if (!child.stdin) { inputFailed = true; child.kill(); return; }
    child.stdin.on('error', () => { inputFailed = true; child.kill(); });
    child.stdin.end(payload);
  });
}
