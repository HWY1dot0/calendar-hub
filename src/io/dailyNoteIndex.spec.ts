import moment from "moment";
import type { App, TFile } from "obsidian";
import {
  getDailyNote,
  getDailyNoteSettings,
  getDateUID,
} from "obsidian-daily-notes-interface";

import {
  buildDailyNotesByDate,
  dailyNotesByDateToSingleNotes,
  getDateFromFilename,
  getDailyNotesForDate,
  singleDailyNotesToDailyNotesByDate,
} from "./dailyNoteIndex";

jest.mock("obsidian-daily-notes-interface", () => ({
  DEFAULT_DAILY_NOTE_FORMAT: "YYYY-MM-DD",
  getDailyNote: jest.fn(),
  getDailyNoteSettings: jest.fn(),
  getDateUID: jest.fn(),
}));

const mockGetDailyNote = getDailyNote as jest.MockedFunction<
  typeof getDailyNote
>;
const mockGetDailyNoteSettings = getDailyNoteSettings as jest.MockedFunction<
  typeof getDailyNoteSettings
>;
const mockGetDateUID = getDateUID as jest.MockedFunction<typeof getDateUID>;
let frontmatterByPath: Record<string, Record<string, unknown>>;

function file(path: string, ctime?: number): TFile {
  const parts = path.split("/");
  const name = parts[parts.length - 1];
  return {
    basename: name.replace(/\.md$/, ""),
    name,
    path,
    stat: ctime ? { ctime } : undefined,
  } as unknown as TFile;
}

describe("dailyNoteIndex", () => {
  beforeEach(() => {
    window.moment = moment;
    frontmatterByPath = {};
    window.app = {
      metadataCache: {
        getFileCache: jest.fn((note: TFile) => ({
          frontmatter: frontmatterByPath[note.path],
        })),
      },
    } as unknown as App;
    mockGetDailyNoteSettings.mockReturnValue({
      format: "YYYY-MM-DD",
      folder: "",
      template: "",
    });
    mockGetDateUID.mockImplementation((date) => date.format("YYYY-MM-DD"));
    mockGetDailyNote.mockImplementation((date, dailyNotes) => {
      return dailyNotes[date.format("YYYY-MM-DD")] ?? null;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("groups every daily note by date and sorts matches by path", () => {
    const workNote = file("Work/2024-12-31.md");
    const journalNote = file("Journal/2024-12-31.md");
    const nextDayNote = file("Journal/2025-01-01.md");
    const nonDailyNote = file("Ideas/not-a-daily-note.md");

    const notesByDate = buildDailyNotesByDate([
      workNote,
      nonDailyNote,
      nextDayNote,
      journalNote,
    ]);

    expect(notesByDate).toEqual({
      "2024-12-31": [journalNote, workNote],
      "2025-01-01": [nextDayNote],
    });
  });

  it("groups notes by an embedded date in the file name", () => {
    const newsletterNote = file("Newsletters/Market News 2024-12-31.md");
    const trackerNote = file("Projects/Tracker 20241231.md");
    const nextDayNote = file("Journal/plan 20250101.md");
    const nonDailyNote = file("Ideas/not-a-daily-note.md");

    const notesByDate = buildDailyNotesByDate(
      [newsletterNote, nonDailyNote, nextDayNote, trackerNote],
      "YYYYMMDD"
    );

    expect(notesByDate).toEqual({
      "2024-12-31": [newsletterNote, trackerNote],
      "2025-01-01": [nextDayNote],
    });
  });

  it("supports multiple extra embedded date formats", () => {
    const compactDateNote = file("Projects/Tracker 20241231.md");
    const underscoreDateNote = file("Reports/report 2024_12_31.md");

    const notesByDate = buildDailyNotesByDate(
      [compactDateNote, underscoreDateNote],
      "YYYYMMDD, YYYY_MM_DD"
    );

    expect(notesByDate).toEqual({
      "2024-12-31": [compactDateNote, underscoreDateNote],
    });
  });

  it("maps notes by their frontmatter date fields", () => {
    const marketNote = file("Research/market update.md");
    frontmatterByPath[marketNote.path] = {
      date: "2024-12-31",
    };

    const notesByDate = buildDailyNotesByDate([marketNote], {
      frontmatterDateFields: "date",
    });

    expect(notesByDate).toEqual({
      "2024-12-31": [marketNote],
    });
  });

  it("prefers the frontmatter date when the file name disagrees", () => {
    const trackerNote = file("Projects/Tracker 20250101.md");
    frontmatterByPath[trackerNote.path] = {
      date: "2024-12-31",
    };

    const notesByDate = buildDailyNotesByDate([trackerNote], {
      filenameDateFormat: "YYYYMMDD",
      frontmatterDateFields: "date",
    });

    expect(notesByDate).toEqual({
      "2024-12-31": [trackerNote],
    });
  });

  it("resolves multiple frontmatter date fields by their configured order", () => {
    const digestNote = file("Research/talk digest.md");
    frontmatterByPath[digestNote.path] = {
      date: "2026-07-09",
      talk_date: "2026-07-08",
    };

    expect(
      buildDailyNotesByDate([digestNote], {
        frontmatterDateFields: "date, talk_date",
      })
    ).toEqual({ "2026-07-09": [digestNote] });

    expect(
      buildDailyNotesByDate([digestNote], {
        frontmatterDateFields: "talk_date, date",
      })
    ).toEqual({ "2026-07-08": [digestNote] });
  });

  it("skips configured frontmatter fields without a valid date", () => {
    const draftNote = file("Research/draft.md");
    frontmatterByPath[draftNote.path] = {
      status: "TBD",
      date: "2026-07-09",
    };

    const notesByDate = buildDailyNotesByDate([draftNote], {
      frontmatterDateFields: "status, date",
    });

    expect(notesByDate).toEqual({
      "2026-07-09": [draftNote],
    });
  });

  it("supports configured nested frontmatter fields and date arrays", () => {
    const planningNote = file("Projects/planning.md");
    frontmatterByPath[planningNote.path] = {
      calendar: {
        dates: ["not-a-date", "2024-12-31"],
      },
    };

    const notesByDate = buildDailyNotesByDate([planningNote], {
      frontmatterDateFields: "date, calendar.dates",
    });

    expect(notesByDate).toEqual({
      "2024-12-31": [planningNote],
    });
  });

  it("falls back to the file creation date when enabled", () => {
    const createdAt = moment("2024-12-31 12:00", "YYYY-MM-DD HH:mm").valueOf();
    const undatedNote = file("Ideas/spark.md", createdAt);

    const notesByDate = buildDailyNotesByDate([undatedNote], {
      useCreationDateFallback: true,
    });

    expect(notesByDate).toEqual({
      "2024-12-31": [undatedNote],
    });
  });

  it("ignores creation dates unless the fallback is enabled", () => {
    const createdAt = moment("2024-12-31 12:00", "YYYY-MM-DD HH:mm").valueOf();
    const undatedNote = file("Ideas/spark.md", createdAt);

    expect(buildDailyNotesByDate([undatedNote])).toEqual({});
  });

  it("prefers file name and frontmatter dates over the creation date", () => {
    const createdAt = moment("2024-12-31 12:00", "YYYY-MM-DD HH:mm").valueOf();
    const filenameNote = file("Journal/2025-01-01.md", createdAt);
    const frontmatterNote = file("Research/market recap.md", createdAt);
    frontmatterByPath[frontmatterNote.path] = {
      date: "2025-01-02",
    };

    const notesByDate = buildDailyNotesByDate([filenameNote, frontmatterNote], {
      frontmatterDateFields: "date",
      useCreationDateFallback: true,
    });

    expect(notesByDate).toEqual({
      "2025-01-01": [filenameNote],
      "2025-01-02": [frontmatterNote],
    });
  });

  it("limits matching to configured folders", () => {
    const includedNote = file("Research/Daily/market update.md");
    const excludedNote = file("Archive/market update.md");
    frontmatterByPath[includedNote.path] = {
      date: "2024-12-31",
    };
    frontmatterByPath[excludedNote.path] = {
      date: "2024-12-31",
    };

    const notesByDate = buildDailyNotesByDate([includedNote, excludedNote], {
      frontmatterDateFields: "date",
      includedFolders: "Research/Daily",
    });

    expect(notesByDate).toEqual({
      "2024-12-31": [includedNote],
    });
  });

  it("matches offset datetime formats spelled with a literal Z", () => {
    const utcNote = file("Alpha/20260709T143025Z.md");
    const numericOffsetNote = file("Beta/20260709T143025+0800.md");
    const embeddedNote = file("Gamma/sync 20260709T143025Z report.md");

    const notesByDate = buildDailyNotesByDate(
      [utcNote, numericOffsetNote, embeddedNote],
      "YYYYMMDDTHHmmssZZ"
    );

    expect(notesByDate).toEqual({
      "2026-07-09": [utcNote, numericOffsetNote, embeddedNote],
    });
  });

  it("buckets offset datetimes by the date written in the filename", () => {
    const date = getDateFromFilename(
      "20260709T233025-0500",
      "YYYY-MM-DD",
      "YYYYMMDDTHHmmssZZ"
    );

    expect(date.format("YYYY-MM-DD")).toBe("2026-07-09");
    expect(date.isLocal()).toBe(true);
  });

  it("buckets offset frontmatter dates by the written date", () => {
    const overnightNote = file("Research/overnight sync.md");
    frontmatterByPath[overnightNote.path] = {
      date: "2026-07-09T23:30:25-05:00",
    };

    const notesByDate = buildDailyNotesByDate([overnightNote], {
      frontmatterDateFields: "date",
    });

    expect(notesByDate).toEqual({
      "2026-07-09": [overnightNote],
    });
  });

  it("matches the whole basename before trying an embedded date", () => {
    const date = getDateFromFilename(
      "2024-12-31",
      "YYYY-MM-DD",
      "YYYYMMDD"
    );

    expect(date.format("YYYY-MM-DD")).toBe("2024-12-31");
  });

  it("returns an invalid date when neither the basename nor embedded date matches", () => {
    const date = getDateFromFilename(
      "notes without a date",
      "YYYY-MM-DD",
      "YYYYMMDD"
    );

    expect(date.isValid()).toBe(false);
  });

  it("keeps the first sorted daily note for calendar metadata sources", () => {
    const journalNote = file("Journal/2024-12-31.md");
    const workNote = file("Work/2024-12-31.md");

    expect(
      dailyNotesByDateToSingleNotes({
        "2024-12-31": [journalNote, workNote],
      })
    ).toEqual({
      "2024-12-31": journalNote,
    });
  });

  it("converts single-note maps into grouped daily notes", () => {
    const journalNote = file("Journal/2024-12-31.md");

    expect(
      singleDailyNotesToDailyNotesByDate({
        "2024-12-31": journalNote,
      })
    ).toEqual({
      "2024-12-31": [journalNote],
    });
  });

  it("returns every note mapped to a date before falling back to a single note", () => {
    const journalNote = file("Journal/2024-12-31.md");
    const workNote = file("Work/2024-12-31.md");
    const fallbackNote = file("Daily notes/2024-12-31.md");

    const result = getDailyNotesForDate(
      moment("2024-12-31", "YYYY-MM-DD"),
      {
        "2024-12-31": [journalNote, workNote],
      },
      {
        "2024-12-31": fallbackNote,
      }
    );

    expect(result).toEqual([journalNote, workNote]);
    expect(mockGetDailyNote).not.toHaveBeenCalled();
  });

  it("falls back to the original daily-note lookup", () => {
    const fallbackNote = file("Daily notes/2024-12-31.md");

    const result = getDailyNotesForDate(
      moment("2024-12-31", "YYYY-MM-DD"),
      {},
      {
        "2024-12-31": fallbackNote,
      }
    );

    expect(result).toEqual([fallbackNote]);
  });
});
