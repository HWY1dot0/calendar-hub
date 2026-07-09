import {
  getFolderCheckState,
  isFolderIncluded,
  parseFolderRules,
  serializeFolderRules,
  shouldIncludeFilePath,
  toggleFolderRule,
} from "./folderRules";

describe("folderRules", () => {
  it("parses include and exclude entries", () => {
    expect(parseFolderRules("30 Macro, -30 Macro/Archive")).toEqual([
      { path: "30 Macro", excluded: false },
      { path: "30 Macro/Archive", excluded: true },
    ]);
  });

  it("round-trips through serialization", () => {
    const rules = parseFolderRules("30 Macro, -30 Macro/Archive, 40 Logs");

    expect(parseFolderRules(serializeFolderRules(rules))).toEqual(rules);
  });

  it("keeps legacy include-only behavior", () => {
    const rules = parseFolderRules("30 Macro, 40 Logs");

    expect(shouldIncludeFilePath("30 Macro/Fed/note.md", rules)).toBe(true);
    expect(shouldIncludeFilePath("30 Macro.md", rules)).toBe(true);
    expect(shouldIncludeFilePath("Archive/note.md", rules)).toBe(false);
    expect(shouldIncludeFilePath("30 Macro Extra/note.md", rules)).toBe(false);
  });

  it("scans the whole vault when no rules are configured", () => {
    expect(shouldIncludeFilePath("anywhere/note.md", [])).toBe(true);
  });

  it("lets deeper rules win in either direction", () => {
    const rules = parseFolderRules(
      "30 Macro, -30 Macro/Fed, 30 Macro/Fed/Speeches"
    );

    expect(shouldIncludeFilePath("30 Macro/note.md", rules)).toBe(true);
    expect(shouldIncludeFilePath("30 Macro/Fed/note.md", rules)).toBe(false);
    expect(
      shouldIncludeFilePath("30 Macro/Fed/Speeches/note.md", rules)
    ).toBe(true);

    expect(isFolderIncluded("30 Macro/Fed", rules)).toBe(false);
    expect(isFolderIncluded("30 Macro/Fed/Speeches", rules)).toBe(true);
  });

  it("supports exclude-only filters against the whole vault", () => {
    const rules = parseFolderRules("-Archive");

    expect(shouldIncludeFilePath("Journal/note.md", rules)).toBe(true);
    expect(shouldIncludeFilePath("Archive/old.md", rules)).toBe(false);
  });

  it("derives checkbox states with mixed subtrees as partial", () => {
    const rules = parseFolderRules("30 Macro, -30 Macro/Fed");

    expect(getFolderCheckState("30 Macro", rules)).toBe("partial");
    expect(getFolderCheckState("30 Macro/Fed", rules)).toBe("none");
    expect(getFolderCheckState("30 Macro/US Eco", rules)).toBe("checked");
    expect(getFolderCheckState("40 Logs", rules)).toBe("none");
  });

  it("unchecks a covered subfolder by adding an exclusion", () => {
    const rules = parseFolderRules("30 Macro");

    const next = toggleFolderRule("30 Macro/Fed", rules);

    expect(serializeFolderRules(next)).toBe("30 Macro, -30 Macro/Fed");
  });

  it("restores inherited coverage when the exclusion is clicked again", () => {
    const rules = parseFolderRules("30 Macro, -30 Macro/Fed");

    const next = toggleFolderRule("30 Macro/Fed", rules);

    expect(serializeFolderRules(next)).toBe("30 Macro");
  });

  it("removes an explicit include without inventing an exclusion", () => {
    const rules = parseFolderRules("30 Macro, 40 Logs");

    const next = toggleFolderRule("40 Logs", rules);

    expect(serializeFolderRules(next)).toBe("30 Macro");
  });

  it("normalizes a partial branch to fully included on click", () => {
    const rules = parseFolderRules("30 Macro, -30 Macro/Fed");

    const next = toggleFolderRule("30 Macro", rules);

    expect(serializeFolderRules(next)).toBe("30 Macro");
    expect(getFolderCheckState("30 Macro/Fed", next)).toBe("checked");
  });

  it("prunes subtree rules when a parent is selected", () => {
    const rules = parseFolderRules("30 Macro/Fed, -30 Macro/US Eco");

    const next = toggleFolderRule("30 Macro", rules);

    expect(serializeFolderRules(next)).toBe("30 Macro");
  });
});
