// Barrel for the whole lore CLI surface. Import as `import * as lore from
// "./lib/lore"` and call lore.commit(), lore.branchList(), etc. The actual
// implementations live in ./core (the CLI bridge) and ./api/* (per-domain
// command wrappers) so individual areas stay small as features grow.
export * from "./core";
export * from "./api/settings";
export * from "./api/status";
export * from "./api/staging";
export * from "./api/reset";
export * from "./api/lock";
export * from "./api/commit";
export * from "./api/branch";
export * from "./api/history";
export * from "./api/revision";
export * from "./api/diff";
export * from "./api/repository";
export * from "./api/ignore";
export * from "./api/system";
