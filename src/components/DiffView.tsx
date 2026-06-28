import { FileText } from "lucide-react";
import { useStore } from "../store";
import { parseDiff, looksLikeDiff } from "../lib/diff-parse";

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
  if (!text || !looksLikeDiff(text)) {
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
