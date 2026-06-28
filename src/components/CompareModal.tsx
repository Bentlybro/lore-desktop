import { useEffect, useState } from "react";
import { X, GitCompare, FileText } from "lucide-react";
import { useStore } from "../store";
import * as lore from "../lib/lore";
import type { CommitFile } from "../lib/lore";
import { DiffBody } from "./DiffView";
import { actionBadge } from "../lib/badges";
import { splitPath } from "../lib/paths";

export function CompareModal() {
  const { compare, closeCompare, current } = useStore();
  const [files, setFiles] = useState<CommitFile[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [diff, setDiff] = useState("");
  const [loading, setLoading] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!compare || !current) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setFiles([]);
    setSel(null);
    setDiff("");
    lore
      .commitFiles(current.path, compare.baseRev, compare.targetRev)
      .then((f) => {
        if (!cancelled) setFiles(f);
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.message ?? String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [compare, current]);

  if (!compare) return null;

  async function pick(path: string) {
    if (!current || !compare) return;
    setSel(path);
    setDiffLoading(true);
    setDiff("");
    try {
      const patch = await lore.revisionFileDiff(current.path, compare.baseRev, compare.targetRev, path);
      setDiff(patch || "(no textual diff — binary or unchanged)");
    } catch (e: any) {
      setDiff(`(diff unavailable: ${e?.message ?? e})`);
    } finally {
      setDiffLoading(false);
    }
  }

  return (
    <div className="overlay" onClick={closeCompare}>
      <div className="modal fh-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <GitCompare size={15} />
            <span className="fh-title">
              {compare.baseLabel} → {compare.targetLabel}
            </span>
          </span>
          <button className="btn-ghost" onClick={closeCompare}>
            <X size={16} />
          </button>
        </div>
        <div className="fh-body">
          <div className="fh-list">
            {loading ? (
              <div className="placeholder">Loading…</div>
            ) : err ? (
              <div className="placeholder">{err}</div>
            ) : files.length === 0 ? (
              <div className="placeholder">No differences</div>
            ) : (
              files.map((f) => {
                const b = actionBadge(f.action);
                const sp = splitPath(f.path);
                return (
                  <div
                    key={f.path}
                    className={`file-row ${sel === f.path ? "selected" : ""}`}
                    onClick={() => pick(f.path)}
                  >
                    <span className={`badge ${b.cls}`}>{b.label}</span>
                    <span className="file-path">
                      <span className="fp-dir">{sp.dir}</span>
                      <span className="fp-name">{sp.name}</span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <div className="fh-diff">
            {sel ? (
              <>
                <div className="diff-header">
                  <FileText size={14} />
                  <span className="mono">{sel}</span>
                </div>
                <DiffBody text={diff} loading={diffLoading} />
              </>
            ) : (
              <div className="diff empty">
                <GitCompare />
                <span>Select a file to view its diff</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
