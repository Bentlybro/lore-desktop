// Core bridge to the Rust `lore` CLI adapter + shared event-stream helpers.
// Every api/* module builds on these; nothing here is lore-verb specific.
import { invoke, Channel } from "@tauri-apps/api/core";
import type { LoreEvent, LoreOutcome } from "../types";

/** Run a lore command and get the full event stream once it completes. */
export async function runLore(args: string[], cwd?: string): Promise<LoreOutcome> {
  return invoke<LoreOutcome>("run_lore", { args, cwd: cwd ?? null });
}

/** Run a lore command, streaming each event to `onEvent` as it arrives. */
export async function runLoreStream(
  args: string[],
  cwd: string | undefined,
  onEvent: (e: LoreEvent) => void,
): Promise<LoreOutcome> {
  const channel = new Channel<LoreEvent>();
  channel.onmessage = onEvent;
  return invoke<LoreOutcome>("run_lore_stream", {
    args,
    cwd: cwd ?? null,
    onEvent: channel,
  });
}

export class LoreError extends Error {
  code: number | null;
  constructor(message: string, code: number | null) {
    super(message);
    this.code = code;
    this.name = "LoreError";
  }
}

/** Throw if the outcome failed; otherwise return it. */
export function ensureOk(o: LoreOutcome): LoreOutcome {
  if (!o.ok) throw new LoreError(o.error ?? "lore command failed", o.errorCode);
  return o;
}

/** All event payloads with the given tag name. */
export const dataOf = (o: LoreOutcome, tag: string): any[] =>
  o.events.filter((e) => e.tagName === tag).map((e) => e.data);

/** First event payload with the given tag name, if any. */
export const firstData = (o: LoreOutcome, tag: string): any | undefined =>
  o.events.find((e) => e.tagName === tag)?.data;
