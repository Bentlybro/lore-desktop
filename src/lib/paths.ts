// Repo-relative path helpers (paths always use "/" separators).

/** Split a path into its directory (with trailing slash) and file name. */
export function splitPath(p: string): { dir: string; name: string } {
  const i = p.lastIndexOf("/");
  return i >= 0 ? { dir: p.slice(0, i + 1), name: p.slice(i + 1) } : { dir: "", name: p };
}

/** Directory portion of a path, without a trailing slash ("" if at root). */
export function fileDir(p: string): string {
  const slash = p.lastIndexOf("/");
  return slash >= 0 ? p.slice(0, slash) : "";
}

/** Lower-case-insensitive file extension without the dot ("" if none). */
export function fileExt(p: string): string {
  const base = p.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1) : "";
}
