import { createHash } from 'node:crypto';
import { mkdir, open } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { LmmError } from "./protocol.js";
const FIXED_FAILURE = 'LMM refresh could not be safely recorded. Use /connect.';
const ALREADY_ATTEMPTED = 'LMM refresh was already attempted. Use /connect.';
export function refreshDigest(refresh) {
    return createHash('sha256').update(refresh, 'utf8').digest('hex');
}
/** Durable, credential-free fencing for one-shot refresh tokens. */
export class RefreshJournal {
    directory;
    constructor(directory) {
        if (!directory)
            throw new LmmError('refresh_storage_unverified', FIXED_FAILURE);
        this.directory = directory;
    }
    async begin(issuer, refresh) {
        const digest = refreshDigest(refresh);
        const marker = join(this.directory, `${refreshDigest(`${issuer}\n${digest}`)}.refresh`);
        let handle;
        try {
            const firstCreated = await mkdir(this.directory, { recursive: true, mode: 0o700 });
            handle = await open(marker, 'wx', 0o600);
            await handle.writeFile(JSON.stringify({ issuer, refresh_sha256: digest }) + '\n', 'utf8');
            await handle.sync();
            await handle.close();
            handle = undefined;
            // Windows FlushFileBuffers cannot flush a read-only directory handle.
            // The exclusive marker's file data is flushed above; process-crash and
            // concurrent replay fencing work, while sudden-power-loss directory
            // durability is weaker than the POSIX directory-fsync path.
            if (process.platform === 'win32')
                return;
            const directoryHandle = await open(this.directory, 'r');
            try {
                await directoryHandle.sync();
            }
            finally {
                await directoryHandle.close();
            }
            if (firstCreated) {
                const firstCreatedParent = dirname(resolve(firstCreated));
                let parent = dirname(resolve(this.directory));
                while (true) {
                    const parentHandle = await open(parent, 'r');
                    try {
                        await parentHandle.sync();
                    }
                    finally {
                        await parentHandle.close();
                    }
                    if (parent === firstCreatedParent || parent === dirname(parent))
                        break;
                    parent = dirname(parent);
                }
            }
        }
        catch (error) {
            await handle?.close().catch(() => { });
            if (error.code === 'EEXIST') {
                throw new LmmError('refresh_already_attempted', ALREADY_ATTEMPTED);
            }
            throw new LmmError('refresh_storage_unavailable', FIXED_FAILURE);
        }
    }
}
