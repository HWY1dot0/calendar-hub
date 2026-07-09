export interface FolderRule {
  path: string;
  excluded: boolean;
}

/**
 * Parses the folder-filter setting into rules. Entries are comma/newline
 * separated folder paths; a leading "-" marks an exclusion. "." and "/" mean
 * the vault root. Deeper rules beat shallower ones, so "30 Macro,
 * -30 Macro/Archive" scans 30 Macro except its Archive subtree.
 */
export function parseFolderRules(value: string): FolderRule[] {
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const excluded = entry.startsWith("-");
      const raw = excluded ? entry.slice(1).trim() : entry;
      const path = normalizeFolderPath(raw);
      return { path, excluded };
    });
}

export function serializeFolderRules(rules: FolderRule[]): string {
  return rules
    .map((rule) => (rule.excluded ? `-${rule.path}` : rule.path))
    .join(", ");
}

function normalizeFolderPath(path: string): string {
  const stripped = path.replace(/^\/+|\/+$/g, "");
  return stripped === "." ? "" : stripped;
}

function ruleDepth(rule: FolderRule): number {
  return rule.path === "" ? 0 : rule.path.split("/").length;
}

function folderMatchesRule(folderPath: string, rule: FolderRule): boolean {
  if (rule.path === "") {
    return true;
  }
  return (
    folderPath === rule.path || folderPath.startsWith(`${rule.path}/`)
  );
}

function fileMatchesRule(filePath: string, rule: FolderRule): boolean {
  if (rule.path === "") {
    return true;
  }
  return (
    filePath === `${rule.path}.md` || filePath.startsWith(`${rule.path}/`)
  );
}

function decide(
  rules: FolderRule[],
  matches: (rule: FolderRule) => boolean
): boolean {
  let decision: boolean | null = null;
  let decisionDepth = -1;

  for (const rule of rules) {
    if (!matches(rule)) {
      continue;
    }
    const depth = ruleDepth(rule);
    if (
      depth > decisionDepth ||
      (depth === decisionDepth && rule.excluded)
    ) {
      decision = !rule.excluded;
      decisionDepth = depth;
    }
  }

  if (decision !== null) {
    return decision;
  }
  // No rule matched: without any include rules the whole vault is in scope.
  return rules.every((rule) => rule.excluded);
}

/** Whether files directly inside `folderPath` are in scope. */
export function isFolderIncluded(
  folderPath: string,
  rules: FolderRule[]
): boolean {
  return decide(rules, (rule) => folderMatchesRule(folderPath, rule));
}

/** Whether the file at `filePath` is in scope. */
export function shouldIncludeFilePath(
  filePath: string,
  rules: FolderRule[]
): boolean {
  return decide(rules, (rule) => fileMatchesRule(filePath, rule));
}

export type FolderCheckState = "checked" | "partial" | "none";

/**
 * Checkbox state for a folder row: "checked" when its whole subtree is in
 * scope, "partial" when descendants mix in and out of scope (so collapsed
 * branches still reveal that something inside differs), "none" otherwise.
 */
export function getFolderCheckState(
  folderPath: string,
  rules: FolderRule[]
): FolderCheckState {
  const included = isFolderIncluded(folderPath, rules);
  const prefix = `${folderPath}/`;
  const mixed = rules.some(
    (rule) => rule.path.startsWith(prefix) && rule.excluded === included
  );
  if (mixed) {
    return "partial";
  }
  return included ? "checked" : "none";
}

/**
 * One click on a folder row: a cleanly included folder turns off (as an
 * exclusion when an ancestor still covers it), anything else becomes fully
 * included. Rules inside the folder's subtree are dropped either way, keeping
 * the filter list minimal.
 */
export function toggleFolderRule(
  folderPath: string,
  rules: FolderRule[]
): FolderRule[] {
  const state = getFolderCheckState(folderPath, rules);
  const prefix = `${folderPath}/`;
  const withoutSubtree = rules.filter(
    (rule) => rule.path !== folderPath && !rule.path.startsWith(prefix)
  );

  if (state === "checked") {
    if (isFolderIncluded(folderPath, withoutSubtree)) {
      return [...withoutSubtree, { path: folderPath, excluded: true }];
    }
    return withoutSubtree;
  }

  // Keep an include-scoped filter scoped: when pruning the subtree drops the
  // last include rule, an empty list would silently widen to the whole vault.
  const hadIncludes = rules.some((rule) => !rule.excluded);
  const stillHasIncludes = withoutSubtree.some((rule) => !rule.excluded);
  if (hadIncludes && !stillHasIncludes) {
    return [...withoutSubtree, { path: folderPath, excluded: false }];
  }

  if (isFolderIncluded(folderPath, withoutSubtree)) {
    return withoutSubtree;
  }
  return [...withoutSubtree, { path: folderPath, excluded: false }];
}
