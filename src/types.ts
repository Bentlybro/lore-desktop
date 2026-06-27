// Shapes mirrored from the Rust backend (camelCase) and the lore --json event stream.

export interface RepoEntry {
  name: string;
  path: string;
  serverUrl: string;
}

export interface Settings {
  serverUrl: string;
  identity: string;
  lorePath: string;
  repos: RepoEntry[];
}

export interface LoreEvent {
  tagName: string;
  data: any;
}

export interface LoreOutcome {
  events: LoreEvent[];
  ok: boolean;
  error: string | null;
  errorCode: number | null;
}

// `repositoryStatusRevision` event data.
export interface StatusRevision {
  branchName: string;
  revisionNumber: number;
  revisionLocalNumber: number;
  revisionRemoteNumber: number;
  isLocalAhead: number;
  isRemoteAhead: number;
  remoteAvailable: number;
  remoteAuthorized: number;
  remoteBranchExist: number;
}

// Lean per-file row from the dedicated `lore_status` command (short keys keep
// the IPC payload small on huge repos): p=path, a=action, s=staged, d=dirty, c=conflict.
export interface FileRow {
  p: string;
  a: string;
  s: boolean;
  d: boolean;
  c: boolean;
}

export interface StatusPayload {
  ok: boolean;
  error: string | null;
  revision: StatusRevision | null;
  files: FileRow[];
  total: number;
}

export interface StatusSummary {
  adds: number;
  deletes: number;
  modifies: number;
  moves: number;
  copies: number;
}

export interface Branch {
  id: string;
  name: string;
  category: string;
  latest: string;
  creator: string;
  created: number;
  isCurrent: boolean;
  archived: boolean;
  location?: string;
}

export interface Revision {
  revision: string;
  revisionNumber: number;
  parent: string[];
  message?: string;
  timestamp?: number;
  creator?: string;
}
