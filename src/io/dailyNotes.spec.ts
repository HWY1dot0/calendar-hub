import moment from "moment";
import type { App, TAbstractFile } from "obsidian";
import { getDailyNoteSettings } from "obsidian-daily-notes-interface";

import { createDailyNoteFile } from "./dailyNotes";

jest.mock("obsidian", () => ({
  Modal: class Modal {},
  Notice: class Notice {},
  TFile: class TFile {},
  TFolder: class TFolder {},
  Vault: { recurseChildren: jest.fn() },
  normalizePath: (path: string): string => {
    const normalized = path
      .replace(/\\/g, "/")
      .replace(/\/+/g, "/")
      .replace(/^\/|\/$/g, "");
    return normalized || "/";
  },
}));

jest.mock("obsidian-daily-notes-interface", () => ({
  createDailyNote: jest.fn(),
  getDailyNoteSettings: jest.fn(),
  getDateUID: jest.fn(),
}));

const mockGetDailyNoteSettings = getDailyNoteSettings as jest.MockedFunction<
  typeof getDailyNoteSettings
>;

const DATE = "2026-10-24";

function installMomentNow(iso: string): void {
  const fixedMoment = ((...args: unknown[]) => {
    return args.length
      ? (moment as unknown as (...args: unknown[]) => moment.Moment)(...args)
      : moment(iso);
  }) as typeof moment;

  Object.assign(fixedMoment, moment);
  window.moment = fixedMoment;
}

describe("createDailyNoteFile", () => {
  let existingPaths: Set<string>;
  let templateContents: string;
  let createdNotes: Array<{ path: string; content: string }>;

  beforeEach(() => {
    installMomentNow(`${DATE}T14:05:30`);
    existingPaths = new Set(["Daily"]);
    templateContents = "";
    createdNotes = [];

    window.app = {
      vault: {
        getAbstractFileByPath: jest.fn((path: string) =>
          existingPaths.has(path) ? ({} as TAbstractFile) : null
        ),
        createFolder: jest.fn(() => Promise.resolve()),
        cachedRead: jest.fn(() => Promise.resolve(templateContents)),
        create: jest.fn((path: string, content: string) => {
          const note = { path, content };
          createdNotes.push(note);
          return note;
        }),
      },
      metadataCache: {
        getFirstLinkpathDest: jest.fn(() => ({ path: "Templates/daily.md" })),
      },
    } as unknown as App;

    mockGetDailyNoteSettings.mockReturnValue({
      format: "YYYY-MM-DD",
      folder: "Daily",
      template: "Templates/daily.md",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("uses the plain date for {{date}} and {{title}} when the name is free", async () => {
    templateContents = "date: {{date}}\ntitle: {{title}}";

    await createDailyNoteFile(moment(DATE, "YYYY-MM-DD"));

    expect(createdNotes).toEqual([
      {
        path: "Daily/2026-10-24.md",
        content: "date: 2026-10-24\ntitle: 2026-10-24",
      },
    ]);
  });

  it("keeps {{date}} valid and puts the numbered suffix only in {{title}}", async () => {
    existingPaths.add("Daily/2026-10-24.md");
    templateContents = "date: {{date}}\ntitle: {{title}}";

    await createDailyNoteFile(moment(DATE, "YYYY-MM-DD"));

    expect(createdNotes).toEqual([
      {
        path: "Daily/2026-10-24 (1).md",
        content: "date: 2026-10-24\ntitle: 2026-10-24 (1)",
      },
    ]);
  });

  it("expands formatted dates, offsets, yesterday, and time", async () => {
    templateContents = [
      "formatted: {{date:YYYY/MM/DD}}",
      "tomorrow: {{date+1d:YYYY-MM-DD}}",
      "two days ago: {{date-2d}}",
      "yesterday: {{yesterday}}",
      "time: {{time}}",
    ].join("\n");

    await createDailyNoteFile(moment(DATE, "YYYY-MM-DD"));

    expect(createdNotes).toEqual([
      {
        path: "Daily/2026-10-24.md",
        content: [
          "formatted: 2026/10/24",
          "tomorrow: 2026-10-25",
          "two days ago: 2026-10-22",
          "yesterday: 2026-10-23",
          "time: 14:05",
        ].join("\n"),
      },
    ]);
  });

  it("increments the numbered suffix from (1) to (2)", async () => {
    existingPaths.add("Daily/2026-10-24.md");
    existingPaths.add("Daily/2026-10-24 (1).md");
    templateContents = "title: {{title}}";

    await createDailyNoteFile(moment(DATE, "YYYY-MM-DD"));

    expect(createdNotes).toEqual([
      {
        path: "Daily/2026-10-24 (2).md",
        content: "title: 2026-10-24 (2)",
      },
    ]);
  });
});
