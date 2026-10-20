export const AUTH_STORAGE_KEY = 'kofi.tab-authorization.v1';
export interface StoredAuthorization {
  token: string;
  binding: string;
  tabId: string;
  sessionId: string;
  localExpiresAt: number;
}
export interface TabLockManager {
  request(
    name: string,
    options: { mode: 'exclusive'; ifAvailable: true },
    callback: (lock: unknown | null) => Promise<void>,
  ): Promise<unknown>;
}

/** Best effort only: reload is not a cryptographic proof of a physical tab.
 * Native restore may be indistinguishable from reload. Server expiry still applies.
 * No queued acquisition, stealing, global lock, secret broadcast or unload revoke.
 */
export function createTabAuthorization(options: {
  storage: Storage | undefined;
  locks: TabLockManager | undefined;
  navigationType: () => string;
}) {
  const releases = new Map<StoredAuthorization, () => void>();
  let owned: StoredAuthorization | null = null;
  const clear = () => {
    options.storage?.removeItem(AUTH_STORAGE_KEY);
  };
  return {
    available() {
      if (!options.storage || !options.locks) return false;
      try {
        const key = `${AUTH_STORAGE_KEY}.probe`;
        options.storage.setItem(key, '1');
        options.storage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
    load(): StoredAuthorization | null {
      try {
        if (options.navigationType() !== 'reload') {
          clear();
          return null;
        }
        const raw = options.storage?.getItem(AUTH_STORAGE_KEY);
        if (!raw) return null;
        const value: unknown = JSON.parse(raw);
        if (typeof value !== 'object' || value === null) {
          clear();
          return null;
        }
        const data = value as Partial<StoredAuthorization>;
        if (
          ![data.token, data.binding, data.tabId].every(
            (s) => typeof s === 'string' && /^[A-Za-z0-9_-]{43}$/.test(s),
          ) ||
          typeof data.sessionId !== 'string' ||
          !/^[a-f0-9]{24}$/.test(data.sessionId) ||
          typeof data.localExpiresAt !== 'number' ||
          !Number.isFinite(data.localExpiresAt)
        ) {
          clear();
          return null;
        }
        return data as StoredAuthorization;
      } catch {
        return null;
      }
    },
    async acquire(
      value: StoredAuthorization,
      isCurrent: () => boolean = () => true,
    ): Promise<boolean> {
      if (!options.locks || !options.storage) return false;
      // Lock name uses the non-secret session ID, never token/binding.
      return new Promise<boolean>((resolve) => {
        void options
          .locks!.request(
            `kofi.session.${value.sessionId}`,
            { mode: 'exclusive', ifAvailable: true },
            async (lock) => {
              if (!isCurrent()) {
                resolve(false);
                return;
              }
              if (!lock) {
                try {
                  clear();
                } catch {
                  /* blocked storage */
                }
                resolve(false);
                return;
              }
              await new Promise<void>((unlock) => {
                try {
                  options.storage!.setItem(
                    AUTH_STORAGE_KEY,
                    JSON.stringify(value),
                  );
                  owned = value;
                  releases.set(value, unlock);
                  resolve(true);
                } catch {
                  resolve(false);
                  unlock();
                }
              });
            },
          )
          .catch(() => resolve(false));
      });
    },
    clear() {
      try {
        clear();
      } catch {
        /* Fail closed in memory too. */
      }
    },
    save(value: StoredAuthorization) {
      try {
        options.storage?.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    release(value?: StoredAuthorization) {
      if (value) {
        releases.get(value)?.();
        releases.delete(value);
        if (owned === value) owned = null;
      } else {
        owned = null;
        releases.forEach((unlock) => unlock());
        releases.clear();
      }
    },
    owns(value: StoredAuthorization) {
      return owned === value;
    },
  };
}
