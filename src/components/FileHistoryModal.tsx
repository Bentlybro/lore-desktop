import { useEffect, useState } from "react";
import { X, FileClock } from "lucide-react";
import { useStore } from "../store";
import * as lore from "../lib/lore";
import type { FileRevision } from "../lib/lore";
import { DiffBody } from "./DiffView";
import { actionBadge } from "../lib/badges";
import { formatDate } from "../lib/format";

export function FileHistoryModal() {
  const { fileHistoryPath, closeFileHistory, current } = useStore();
  const [revs, setRevs] = useState<FileRevision[]>([]);
  const [sel, setSel] = useState<FileRevision | null>(null);
  const [diff, setDiff] = useState("");
  const [loading, setLoading] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!fileHistoryPath || !current) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setRevs([]);
    setSel(null);
    setDiff("");
    lore
      .fileHistory(current.path, fileHistoryPath)
      .then((r) => {
        if (!cancelled) setRevs(r);
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
  }, [fileHistoryPath, current]);

  if (!fileHistoryPath) return null;

  async function pick(rev: FileRevision) {
    if (!current || !fileHistoryPath) return;
    setSel(rev);
    setDiffLoading(true);
    setDiff("");
    const parent = (rev.parent && rev.parent[0]) || "";
    try {
      if (!parent || /^0+$/.test(parent)) {
        setDiff("(first revision of this file — nothing to diff against)");
      } else {
        const patch = await lore.revisionFileDiff(current.path, parent, rev.revision, fileHistoryPath);
        setDiff(patch || "(no textual diff — binary or unchanged)");
      }
    } catch (e: any) {
      setDiff(`(diff unavailable: ${e?.message ?? e})`);
    } finally {
      setDiffLoading(false);
    }
  }

  return (
    <div className="overlay" onClick={closeFileHistory}>
      <div className="modal fh-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <FileClock size={15} />
            <span className="fh-title mono">{fileHistoryPath}</span>
          </span>
          <button className="btn-ghost" onClick={closeFileHistory}>
            <X size={16} />
          </button>
        </div>
        <div className="fh-body">
          <div className="fh-list">
            {loading ? (
              <div className="placeholder">Loading…</div>
            ) : err ? (
              <div className="placeholder">{err}</div>
            ) : revs.length === 0 ? (
              <div className="placeholder">No history for this file</div>
            ) : (
              revs.map((r) => {
                const b = actionBadge(r.action);
                return (
                  <div
                    key={r.revision}
                    className={`history-row ${sel?.revision === r.revision ? "selected" : ""}`}
                    onClick={() => pick(r)}
                  >
                    <div className="history-top">
                      <span className={`badge ${b.cls}`}>{b.label}</span>
                      <span className="rev-num">#{r.revisionNumber}</span>
                      <span className="history-msg">{r.message ?? "(no message)"}</span>
                    </div>
                    <div className="history-sub">
                      <span className="hash">{r.revision.slice(0, 10)}</span>
                      {r.creator ? <span>· {r.creator}</span> : null}
                      {r.timestamp ? <span>· {formatDate(r.timestamp)}</span> : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="fh-diff">
            {sel ? (
              <>
                <div className="diff-header">
                  <FileClock size={14} />
                  <span className="mono">#{sel.revisionNumber}</span>
                </div>
                <DiffBody text={diff} loading={diffLoading} />
              </>
            ) : (
              <div className="diff empty">
                <FileClock />
                <span>Select a revision to view its diff</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
