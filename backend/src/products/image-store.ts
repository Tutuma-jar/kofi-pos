import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import type { ObjectId } from 'mongodb';

/**
 * Local persistent volume for product images (architecture §7). Files are
 * named only by generated ids, never by the original name, and have no
 * extension: the format comes from the validated metadata in MongoDB.
 */
export type StoredFile = { name: string; id: string | null; modifiedAt: Date };

export function createImageStore(directory: string) {
  const path = (id: ObjectId) => join(directory, id.toHexString());
  return {
    directory,
    async prepare() {
      await mkdir(directory, { recursive: true });
    },
    // Atomic publication: a reader never sees a partially written image.
    async write(id: ObjectId, bytes: Uint8Array) {
      await mkdir(directory, { recursive: true });
      const temporary = `${path(id)}.tmp`;
      try {
        await writeFile(temporary, bytes, { flag: 'wx' });
        await rename(temporary, path(id));
      } catch (error) {
        await rm(temporary, { force: true });
        throw error;
      }
    },
    read(id: ObjectId) {
      return readFile(path(id));
    },
    async remove(id: ObjectId) {
      await rm(path(id), { force: true });
    },
    async removeName(name: string) {
      if (!/^[a-f0-9]{24}(\.tmp)?$/.test(name)) return;
      await rm(join(directory, name), { force: true });
    },
    // Only files with the generated naming scheme are ever considered.
    async list(): Promise<StoredFile[]> {
      let names: string[];
      try {
        names = await readdir(directory);
      } catch (error) {
        if ((error as { code?: unknown }).code === 'ENOENT') return [];
        throw error;
      }
      const files: StoredFile[] = [];
      for (const name of names) {
        const match = /^([a-f0-9]{24})(\.tmp)?$/.exec(name);
        if (!match) continue;
        const info = await stat(join(directory, name));
        files.push({
          name,
          id: match[2] ? null : (match[1] ?? null),
          modifiedAt: info.mtime,
        });
      }
      return files;
    },
  };
}
export type ImageStore = ReturnType<typeof createImageStore>;
