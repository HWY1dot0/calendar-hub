import moment from "moment";
import type { TFile } from "obsidian";

import { parseFolderRules } from "../io/folderRules";
import { buildListModel, getListKeysForDate } from "./listViewModel";

function file(path: string): TFile {
  const parts = path.split("/");
  const name = parts[parts.length - 1];
  return {
    basename: name.replace(/\.md$/, ""),
    name,
    path,
  } as TFile;
}

describe("listViewModel", () => {
  beforeEach(() => {
    window.moment = moment;
  });

  it("groups days under year and month with note counts, newest first", () => {
    const julyNote = file("Journal/2026-07-09.md");
    const julySecond = file("Work/log 2026-07-09.md");
    const juneNote = file("Journal/2026-06-01.md");
    const lastYearNote = file("Archive/2025-12-31.md");

    const model = buildListModel(
      {
        "2026-07-09": [julyNote, julySecond],
        "2026-06-01": [juneNote],
        "2025-12-31": [lastYearNote],
      },
      "month",
      "desc"
    );

    expect(model.map((year) => year.key)).toEqual(["2026", "2025"]);
    expect(model[0].noteCount).toBe(3);
    expect(model[0].subgroups.map((sub) => sub.key)).toEqual([
      "2026-07",
      "2026-06",
    ]);
    expect(model[0].subgroups[0].days[0].files).toEqual([
      julyNote,
      julySecond,
    ]);
  });

  it("renders the year grouping as a single label-less subgroup", () => {
    const model = buildListModel(
      {
        "2026-07-09": [file("Journal/2026-07-09.md")],
        "2026-06-01": [file("Journal/2026-06-01.md")],
      },
      "year",
      "desc"
    );

    expect(model).toHaveLength(1);
    expect(model[0].subgroups).toHaveLength(1);
    expect(model[0].subgroups[0].label).toBeNull();
    expect(model[0].subgroups[0].days.map((day) => day.dateStr)).toEqual([
      "2026-07-09",
      "2026-06-01",
    ]);
  });

  it("groups weeks under their ISO week-year", () => {
    // 2024-12-30 is a Monday belonging to ISO week 2025-W01.
    const model = buildListModel(
      {
        "2024-12-30": [file("Journal/2024-12-30.md")],
      },
      "week",
      "desc"
    );

    expect(model[0].key).toBe("2025");
    expect(model[0].subgroups[0].key).toBe("2025-W01");
  });

  it("flips ordering when ascending", () => {
    const model = buildListModel(
      {
        "2026-07-09": [file("a/2026-07-09.md")],
        "2026-06-01": [file("a/2026-06-01.md")],
      },
      "month",
      "asc"
    );

    expect(model[0].subgroups.map((sub) => sub.key)).toEqual([
      "2026-06",
      "2026-07",
    ]);
  });

  it("parses real date UIDs and skips invalid keys", () => {
    const model = buildListModel(
      {
        "day-2026-07-09T00:00:00+08:00": [file("Journal/2026-07-09.md")],
        "week-2026-07-06T00:00:00+08:00": [],
        "not a date": [file("Ideas/spark.md")],
      },
      "month",
      "desc"
    );

    expect(model).toHaveLength(1);
    expect(model[0].subgroups[0].days[0].dateStr).toBe("2026-07-09");
  });

  it("narrows to its own folder lens and drops emptied groups", () => {
    const macroNote = file("30 Macro/Fed/2026-07-09 fomc.md");
    const logNote = file("40 Logs/2026-07-09.md");
    const juneLogNote = file("40 Logs/2026-06-01.md");

    const model = buildListModel(
      {
        "2026-07-09": [macroNote, logNote],
        "2026-06-01": [juneLogNote],
      },
      "month",
      "desc",
      parseFolderRules("30 Macro")
    );

    expect(model).toHaveLength(1);
    expect(model[0].noteCount).toBe(1);
    expect(model[0].subgroups.map((sub) => sub.key)).toEqual(["2026-07"]);
    expect(model[0].subgroups[0].days[0].files).toEqual([macroNote]);
  });

  it("derives expansion keys that match the model keys", () => {
    const date = moment("2026-07-09", "YYYY-MM-DD");

    expect(getListKeysForDate(date, "month")).toEqual({
      yearKey: "2026",
      subgroupKey: "2026-07",
    });
    expect(getListKeysForDate(date, "quarter")).toEqual({
      yearKey: "2026",
      subgroupKey: "2026-Q3",
    });
  });
});
