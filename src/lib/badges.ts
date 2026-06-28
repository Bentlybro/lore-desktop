// Single source of truth for the A/M/D/R/C change badges (label + CSS class).

export interface Badge {
  label: string;
  cls: string;
}

/** Map a change action (and optional conflict flag) to its badge. */
export function actionBadge(action: string, conflict = false): Badge {
  if (conflict) return { label: "C", cls: "b-con" };
  switch (action) {
    case "add":
      return { label: "A", cls: "b-add" };
    case "delete":
      return { label: "D", cls: "b-del" };
    case "move":
      return { label: "R", cls: "b-ren" };
    default:
      return { label: "M", cls: "b-mod" };
  }
}
