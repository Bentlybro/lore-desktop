import { useStore } from "../store";

/** Renders a unified-diff string with blueprint-mono line styling. */
export function DiffBody({ text, loading }: { text: string; loading?: boolean }) {
  const lines = text.split("\n");
  return (
    <pre className="diff-body">
      {lines.map((line, i) => {
        let cls = "ctx";
        if (line.startsWith("+++") || line.startsWith("---")) cls = "meta";
        else if (line.startsWith("@@")) cls = "hunk";
        else if (line.startsWith("+")) cls = "add";
        else if (line.startsWith("-")) cls = "del";
        return (
          <div key={i} className={`dl ${cls}`}>
            {line || " "}
          </div>
        );
      })}
      {loading && <div className="dl ctx">loading…</div>}
    </pre>
  );
}

export function DiffView() {
  const { selectedPath, diff, diffLoading } = useStore();

  if (!selectedPath) {
    return <div className="diff empty">Select a file to view its diff</div>;
  }

  return (
    <div className="diff">
      <div className="diff-header">{selectedPath}</div>
      <DiffBody text={diff} loading={diffLoading} />
    </div>
  );
}
