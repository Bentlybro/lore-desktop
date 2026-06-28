// Parse a unified diff into rows with old/new line numbers for the gutter.
export type DiffRow = {
  kind: "hunk" | "add" | "del" | "ctx";
  oldLn?: number;
  newLn?: number;
  text: string;
};

export function parseDiff(text: string): DiffRow[] {
  const rows: DiffRow[] = [];
  let oldLn = 0;
  let newLn = 0;
  for (const raw of text.split("\n")) {
    if (raw.startsWith("@@")) {
      const m = raw.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) {
        oldLn = parseInt(m[1], 10);
        newLn = parseInt(m[2], 10);
      }
      rows.push({ kind: "hunk", text: raw });
    } else if (raw.startsWith("+++") || raw.startsWith("---")) {
      continue; // file headers — the UI shows its own
    } else if (raw.startsWith("+")) {
      rows.push({ kind: "add", newLn, text: raw.slice(1) });
      newLn++;
    } else if (raw.startsWith("-")) {
      rows.push({ kind: "del", oldLn, text: raw.slice(1) });
      oldLn++;
    } else {
      rows.push({ kind: "ctx", oldLn, newLn, text: raw.startsWith(" ") ? raw.slice(1) : raw });
      oldLn++;
      newLn++;
    }
  }
  return rows;
}

/** True when the text looks like a unified diff (vs. a placeholder message). */
export function looksLikeDiff(text: string): boolean {
  return text.includes("@@") || /^[+-]/m.test(text);
}
