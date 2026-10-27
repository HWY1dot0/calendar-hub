import { getNoteCountAsDots } from "./noteCount";

jest.mock("svelte/store", () => ({
  get: jest.fn(),
}));

jest.mock("src/io/weeklyNotes", () => ({
  getWeeklyNotesForDate: jest.fn(),
}));

jest.mock("src/io/dailyNoteIndex", () => ({
  getDailyNotesForDate: jest.fn(),
}));

jest.mock("../stores", () => ({
  dailyNotes: {},
  dailyNotesByDate: {},
  weeklyNotes: {},
  weeklyNotesByDate: {},
  settings: {},
}));

describe("noteCountSource", () => {
  it("creates one filled dot per note", () => {
    expect(getNoteCountAsDots(3)).toEqual([
      { color: "default", isFilled: true },
      { color: "default", isFilled: true },
      { color: "default", isFilled: true },
    ]);
  });

  it("does not create dots for zero notes", () => {
    expect(getNoteCountAsDots(0)).toEqual([]);
  });

  it("limits note count dots to five by default", () => {
    expect(getNoteCountAsDots(8)).toHaveLength(5);
  });

  it("honors a custom dot limit", () => {
    expect(getNoteCountAsDots(8, 5)).toHaveLength(5);
    expect(getNoteCountAsDots(2, 1)).toHaveLength(1);
  });
});
