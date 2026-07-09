export interface FolderNode {
  path: string;
  name: string;
  children: FolderNode[];
}

export interface FolderRow {
  path: string;
  name: string;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
}

/**
 * Flattens a folder tree into the rows currently visible: a node shows only
 * when every ancestor is expanded, so collapsed branches keep the list short.
 */
export function flattenFolderTree(
  nodes: FolderNode[],
  expanded: Set<string>
): FolderRow[] {
  const rows: FolderRow[] = [];

  const visit = (node: FolderNode, depth: number): void => {
    const isExpanded = expanded.has(node.path);
    rows.push({
      path: node.path,
      name: node.name,
      depth,
      hasChildren: node.children.length > 0,
      expanded: isExpanded,
    });
    if (isExpanded) {
      node.children.forEach((child) => visit(child, depth + 1));
    }
  };

  nodes.forEach((node) => visit(node, 0));
  return rows;
}

/** Ancestor folder paths of `path`, excluding the path itself. */
export function getAncestorPaths(path: string): string[] {
  const segments = path.split("/");
  const ancestors: string[] = [];
  for (let end = 1; end < segments.length; end++) {
    ancestors.push(segments.slice(0, end).join("/"));
  }
  return ancestors;
}

/** Expansion state that reveals every folder in `selectedFolders`. */
export function getExpansionForSelection(
  selectedFolders: string[]
): Set<string> {
  return new Set(selectedFolders.flatMap(getAncestorPaths));
}

export type FolderSelectionState =
  | "selected"
  | "covered"
  | "partial"
  | "none";

/** The selected ancestor that covers `path`, or null when none does. */
export function getCoveringAncestor(
  path: string,
  selected: Set<string>
): string | null {
  return getAncestorPaths(path).find((ancestor) => selected.has(ancestor)) ??
    null;
}

/**
 * How a folder row should present: "selected" is an explicit entry in the
 * filter list, "covered" is inherited from a selected ancestor (the whole
 * subtree of a selected folder is scanned), "partial" marks a folder whose
 * descendants include an explicit selection, so collapsed branches still show
 * that something inside is active.
 */
export function getFolderSelectionState(
  path: string,
  selected: Set<string>
): FolderSelectionState {
  if (selected.has(path)) {
    return "selected";
  }
  if (getCoveringAncestor(path, selected)) {
    return "covered";
  }
  const prefix = `${path}/`;
  for (const entry of selected) {
    if (entry.startsWith(prefix)) {
      return "partial";
    }
  }
  return "none";
}

/**
 * Adds `folder` to the selection, dropping entries its subtree now covers so
 * the filter list stays minimal.
 */
export function addFolderToSelection(
  selectedFolders: string[],
  folder: string
): string[] {
  const prefix = `${folder}/`;
  return [
    ...selectedFolders.filter(
      (entry) => entry !== folder && !entry.startsWith(prefix)
    ),
    folder,
  ];
}
