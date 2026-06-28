import { FileText } from "lucide-react";
import { useStore } from "../store";

type Row = { kind: "hunk" | "add" | "del" | "ctx"; oldLn?: number; newLn?: number; text: string };

function parseDiff(text: string): Row[] {
  const rows: Row[] = [];
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
      continue; // file headers — we show our own
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

export function DiffBody({ text, loading }: { text: string; loading?: boolean }) {
  if (loading) {
    return (
      <pre className="diff-body">
        <div className="dl">
          <span className="code" style={{ color: "var(--text-3)" }}>
            loading…
          </span>
        </div>
      </pre>
    );
  }
  const looksLikeDiff = text.includes("@@") || /^[+-]/m.test(text);
  if (!text || !looksLikeDiff) {
    return (
      <pre className="diff-body">
        <div className="dl">
          <span className="code" style={{ color: "var(--text-3)", padding: "8px 16px" }}>
            {text || "No changes to show"}
          </span>
        </div>
      </pre>
    );
  }
  const rows = parseDiff(text);
  return (
    <pre className="diff-body">
      {rows.map((r, i) =>
        r.kind === "hunk" ? (
          <div key={i} className="dl hunk">
            {r.text}
          </div>
        ) : (
          <div key={i} className={`dl ${r.kind}`}>
            <span className="gut">
              <span>{r.kind === "add" ? "" : (r.oldLn ?? "")}</span>
              <span>{r.kind === "del" ? "" : (r.newLn ?? "")}</span>
            </span>
            <span className="sign">{r.kind === "add" ? "+" : r.kind === "del" ? "−" : ""}</span>
            <span className="code">{r.text || " "}</span>
          </div>
        ),
      )}
    </pre>
  );
}

export function DiffView() {
  const { selectedPath, diff, diffLoading } = useStore();

  if (!selectedPath) {
    return (
      <div className="diff empty">
        <FileText />
        <span>Select a file to view its diff</span>
      </div>
    );
  }

  return (
    <div className="diff">
      <div className="diff-header">
        <FileText />
        {selectedPath}
      </div>
      <DiffBody text={diff} loading={diffLoading} />
    </div>
  );
}
