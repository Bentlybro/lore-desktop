import type { StoreSet } from "./types";

/** Run an async action with busy state + error capture. */
export async function guard<T>(set: StoreSet, fn: () => Promise<T>): Promise<T | undefined> {
  set({ busy: true, error: null });
  try {
    return await fn();
  } catch (e: any) {
    set({ error: e?.message ?? String(e) });
    return undefined;
  } finally {
    set({ busy: false });
  }
}
