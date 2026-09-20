import "client-only";

export type TemporaryDraftStore = {
  read(key: string): string;
  write(key: string, value: string): void;
  remove(key: string): void;
};

/**
 * Phase 2 temporary adapter. It intentionally stores only a local mock draft.
 * Replace this boundary with an authenticated, user-owned autosave service only
 * after shared identity, retention, deletion, and access rules are approved.
 */
export const temporaryDraftStore: TemporaryDraftStore = {
  read(key) {
    return window.localStorage.getItem(key) ?? "";
  },
  write(key, value) {
    window.localStorage.setItem(key, value);
  },
  remove(key) {
    window.localStorage.removeItem(key);
  },
};
