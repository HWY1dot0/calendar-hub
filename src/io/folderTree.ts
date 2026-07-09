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
  return new Set(
    selectedFolders.flatMap((folder) => getAncestorPaths(folder))
  );
}
