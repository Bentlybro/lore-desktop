import { useState } from "react";
import { useStore } from "../store";

export function BranchesView() {
  const { branches, switchBranch, createBranch, busy } = useStore();
  const [name, setName] = useState("");

  return (
    <div className="branches">
      <form
        className="new-branch"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            createBranch(name.trim());
            setName("");
          }
        }}
      >
        <input
          placeholder="new-branch-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" disabled={busy || !name.trim()}>
          Create
        </button>
      </form>
      <div className="list">
        {branches.map((b) => (
          <div key={b.id} className={`branch-row ${b.isCurrent ? "current" : ""}`}>
            <div className="branch-name">
              {b.isCurrent ? "● " : ""}
              {b.name}
            </div>
            {!b.isCurrent && (
              <button disabled={busy} onClick={() => switchBranch(b.name)}>
                Switch
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
