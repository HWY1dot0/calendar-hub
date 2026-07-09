import {
  FolderNode,
  addFolderToSelection,
  flattenFolderTree,
  getAncestorPaths,
  getCoveringAncestor,
  getExpansionForSelection,
  getFolderSelectionState,
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

  it("derives row states from explicit selection, coverage, and descendants", () => {
    const selected = new Set(["30 Macro"]);

    expect(getFolderSelectionState("30 Macro", selected)).toBe("selected");
    expect(getFolderSelectionState("30 Macro/Fed", selected)).toBe("covered");
    expect(getFolderSelectionState("30 Macro/Fed/Speeches", selected)).toBe(
      "covered"
    );
    expect(getFolderSelectionState("40 Logs", selected)).toBe("none");

    const nested = new Set(["30 Macro/Fed/Speeches"]);
    expect(getFolderSelectionState("30 Macro", nested)).toBe("partial");
    expect(getFolderSelectionState("30 Macro/Fed", nested)).toBe("partial");
    expect(getFolderSelectionState("30 Macro/US Eco", nested)).toBe("none");
  });

  it("does not treat sibling folders sharing a name prefix as covered", () => {
    const selected = new Set(["30 Macro"]);

    expect(getFolderSelectionState("30 Macro Extra", selected)).toBe("none");
  });

  it("names the ancestor that covers a folder", () => {
    const selected = new Set(["30 Macro"]);

    expect(getCoveringAncestor("30 Macro/Fed/Speeches", selected)).toBe(
      "30 Macro"
    );
    expect(getCoveringAncestor("40 Logs/Daily", selected)).toBeNull();
  });

  it("prunes entries made redundant when their parent is selected", () => {
    expect(
      addFolderToSelection(["30 Macro/Fed", "40 Logs/Daily"], "30 Macro")
    ).toEqual(["40 Logs/Daily", "30 Macro"]);

    expect(addFolderToSelection(["30 Macro"], "30 Macro")).toEqual([
      "30 Macro",
    ]);
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
