import {
  FolderNode,
  flattenFolderTree,
  getAncestorPaths,
  getExpansionForSelection,
} from "./folderTree";

function node(path: string, children: FolderNode[] = []): FolderNode {
  const segments = path.split("/");
  return { path, name: segments[segments.length - 1], children };
}

const tree: FolderNode[] = [
  node("30 Macro", [
    node("30 Macro/Fed", [node("30 Macro/Fed/Speeches")]),
    node("30 Macro/US Eco"),
  ]),
  node("40 Logs", [node("40 Logs/Daily")]),
];

describe("folderTree", () => {
  it("shows only top-level folders when nothing is expanded", () => {
    const rows = flattenFolderTree(tree, new Set());

    expect(rows.map((row) => row.path)).toEqual(["30 Macro", "40 Logs"]);
    expect(rows[0]).toMatchObject({
      depth: 0,
      hasChildren: true,
      expanded: false,
    });
  });

  it("reveals children of expanded branches with their depth", () => {
    const rows = flattenFolderTree(tree, new Set(["30 Macro"]));

    expect(rows.map((row) => row.path)).toEqual([
      "30 Macro",
      "30 Macro/Fed",
      "30 Macro/US Eco",
      "40 Logs",
    ]);
    expect(rows[1]).toMatchObject({ depth: 1, hasChildren: true });
    expect(rows[2]).toMatchObject({ depth: 1, hasChildren: false });
  });

  it("keeps deeper branches hidden until every ancestor is expanded", () => {
    const rows = flattenFolderTree(tree, new Set(["30 Macro/Fed"]));

    expect(rows.map((row) => row.path)).toEqual(["30 Macro", "40 Logs"]);
  });

  it("lists ancestors of a nested path", () => {
    expect(getAncestorPaths("30 Macro/Fed/Speeches")).toEqual([
      "30 Macro",
      "30 Macro/Fed",
    ]);
    expect(getAncestorPaths("40 Logs")).toEqual([]);
  });

  it("expands exactly the branches that reveal the selection", () => {
    const expanded = getExpansionForSelection([
      "30 Macro/Fed/Speeches",
      "40 Logs/Daily",
    ]);

    expect(Array.from(expanded).sort()).toEqual([
      "30 Macro",
      "30 Macro/Fed",
      "40 Logs",
    ]);

    const rows = flattenFolderTree(tree, expanded);
    expect(rows.map((row) => row.path)).toContain("30 Macro/Fed/Speeches");
    expect(rows.map((row) => row.path)).toContain("40 Logs/Daily");
  });
});
