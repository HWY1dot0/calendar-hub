import moment from "moment";
import type { WorkspaceLeaf } from "obsidian";

import { tryToCreateDailyNote } from "src/io/dailyNotes";
import { tryToCreateWeeklyNote } from "src/io/weeklyNotes";
import type CalendarPlugin from "./main";
import CalendarView from "./view";

jest.mock("obsidian", () => ({
  FileView: class FileView {},
  ItemView: class ItemView {
    app = {
      workspace: { on: jest.fn() },
      vault: { on: jest.fn() },
      metadataCache: { on: jest.fn() },
    };
    registerEvent = jest.fn();
  },
  Notice: class Notice {},
  TFile: class TFile {},
  setIcon: jest.fn(),
}));

jest.mock("obsidian-daily-notes-interface", () => ({
  getDailyNoteSettings: jest.fn(),
}));

jest.mock("src/io/dailyNotes", () => ({
  createDailyNoteFile: jest.fn(),
  getDayDateFromFile: jest.fn(),
  tryToCreateDailyNote: jest.fn(),
}));

jest.mock("src/io/dailyNoteIndex", () => ({
  getDailyNotesForDate: jest.fn(() => []),
}));

jest.mock("src/io/weeklyNotes", () => ({
  getWeekDateFromFile: jest.fn(),
  getWeeklyNote: jest.fn(),
  getWeeklyNotesForDate: jest.fn(() => []),
  getWeeklyNoteSettings: jest.fn(),
  tryToCreateWeeklyNote: jest.fn(),
}));

jest.mock("./ui/Calendar.svelte", () => class Calendar {});
jest.mock("./ui/ListPanel.svelte", () => class ListPanel {});
jest.mock("./ui/fileMenu", () => ({ showFileMenu: jest.fn() }));
jest.mock("./ui/sources", () => ({
  customTagsSource: {},
  noteCountSource: {},
  streakSource: {},
  tasksSource: {},
}));
jest.mock("./ui/stores", () => {
  const store = (value: unknown) => ({
    subscribe: (run: (value: unknown) => void) => {
      run(value);
      return () => undefined;
    },
  });
  return {
    activeFile: { setFile: jest.fn() },
    dailyNotes: store([]),
    dailyNotesByDate: store({}),
    weeklyNotes: store([]),
    weeklyNotesByDate: store({}),
    settings: store({}),
  };
});

function createView(emptyDateClick: "create" | "select"): CalendarView {
  const view = new CalendarView({} as WorkspaceLeaf, {} as CalendarPlugin);
  (view as unknown as { settings: unknown }).settings = { emptyDateClick };
  return view;
}

describe("clicking a date or week with no notes", () => {
  const date = moment("2026-11-02");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates the notes by default", async () => {
    const view = createView("create");

    await view.openOrCreateDailyNote(date, false);
    await (view as unknown as {
      onClickWeek: typeof view.openOrCreateWeeklyNote;
    }).onClickWeek(date, false);

    expect(tryToCreateDailyNote).toHaveBeenCalledTimes(1);
    expect(tryToCreateWeeklyNote).toHaveBeenCalledTimes(1);
  });

  it("only selects when the click is set to select", async () => {
    const view = createView("select");

    await view.openOrCreateDailyNote(date, false);
    await (view as unknown as {
      onClickWeek: typeof view.openOrCreateWeeklyNote;
    }).onClickWeek(date, false);

    expect(tryToCreateDailyNote).not.toHaveBeenCalled();
    expect(tryToCreateWeeklyNote).not.toHaveBeenCalled();
  });

  it("still creates a weekly note from the explicit command", async () => {
    const view = createView("select");

    await view.openOrCreateWeeklyNote(date, false);

    expect(tryToCreateWeeklyNote).toHaveBeenCalledTimes(1);
  });
});
