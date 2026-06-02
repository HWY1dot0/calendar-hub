import type { Moment } from "moment";
import { Notice, TFile, TFolder, Vault, normalizePath } from "obsidian";
import { getDateUID } from "obsidian-daily-notes-interface";

import { DEFAULT_WEEK_FORMAT, PLUGIN_ID } from "src/constants";
import { buildNotesByDate } from "src/io/dailyNoteIndex";
import type {
  DailyNotesByDate,
  DailyNotesByDateMap,
} from "src/io/dailyNoteIndex";
import type { ISettings } from "src/settings";
import { createConfirmationDialog } from "src/ui/modal";

export interface WeeklyIndexOptions {
  filenameDateFormat?: string;
  frontmatterDateFields?: string;
  includedFolders?: string;
}

export interface IWeeklyNoteSettings {
  format: string;
  folder: string;
  template: string;
}

/**
 * Read Calendar Hub's own weekly-note settings.
 *
 * This is a self-contained replacement for `getWeeklyNoteSettings()` in
 * `obsidian-daily-notes-interface`, which reads the legacy "calendar" plugin.
 * Reading our own options keeps Calendar Hub fully independent: it never needs
 * the old Calendar plugin to be installed.
 *
 * If the Periodic Notes plugin is installed with weekly notes enabled, its
 * settings take precedence (kept for compatibility, matching the original
 * behaviour and the settings tab).
 */
export function getWeeklyNoteSettings(): IWeeklyNoteSettings {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugins = (window.app as any).plugins;

  const periodicNotes = plugins.getPlugin("periodic-notes");
  if (periodicNotes && periodicNotes.settings?.weekly?.enabled) {
    const weekly = periodicNotes.settings.weekly;
    return {
      format: weekly.format || DEFAULT_WEEK_FORMAT,
      folder: weekly.folder?.trim() || "",
      template: weekly.template?.trim() || "",
    };
  }

  const options: Partial<ISettings> =
    plugins.getPlugin(PLUGIN_ID)?.options || {};
  return {
    format: options.weeklyNoteFormat || DEFAULT_WEEK_FORMAT,
    folder: options.weeklyNoteFolder?.trim() || "",
    template: options.weeklyNoteTemplate?.trim() || "",
  };
}

function removeEscapedCharacters(format: string): string {
  return format.replace(/\[[^\]]*\]/g, "");
}

/**
 * Parse the week date encoded in a file name using Calendar Hub's weekly-note
 * format. Mirrors the matching behaviour of `getDateFromFile(file, "week")`
 * from `obsidian-daily-notes-interface`, but driven by our own settings.
 */
export function getWeekDateFromFile(file: TFile): Moment | null {
  const format = getWeeklyNoteSettings().format.split("/").pop() as string;
  const noteDate = window.moment(file.basename, format, true);
  if (!noteDate.isValid()) {
    return null;
  }

  // When the format mixes a week number with month/day tokens, Moment prefers
  // month/day. Strip those tokens so the week number wins.
  const cleanFormat = removeEscapedCharacters(format);
  const isAmbiguous =
    /w{1,2}/i.test(cleanFormat) &&
    (/M{1,4}/.test(cleanFormat) || /D{1,4}/.test(cleanFormat));
  if (isAmbiguous) {
    return window.moment(
      file.basename,
      format.replace(/M{1,4}/g, "").replace(/D{1,4}/g, ""),
      false
    );
  }

  return noteDate;
}

export function getWeeklyNote(
  date: Moment,
  weeklyNotes: Record<string, TFile>
): TFile | null {
  return weeklyNotes[getDateUID(date, "week")] ?? null;
}

/**
 * Index every note that belongs to a week (by week-format filename or
 * frontmatter), across the configured folders, allowing multiple notes per
 * week. Mirrors buildDailyNotesByDate, driven by Calendar Hub's weekly format.
 */
export function buildWeeklyNotesByDate(
  files: TFile[],
  options: WeeklyIndexOptions = {}
): DailyNotesByDate {
  return buildNotesByDate(files, {
    format: getWeeklyNoteSettings().format,
    granularity: "week",
    filenameDateFormat: options.filenameDateFormat,
    frontmatterDateFields: options.frontmatterDateFields,
    includedFolders: options.includedFolders,
  });
}

/**
 * Return every note mapped to the week containing `date`. Falls back to the
 * single weekly-note map when the aggregate index has no entry.
 */
export function getWeeklyNotesForDate(
  date: Moment,
  notesByDate: DailyNotesByDate,
  fallback: DailyNotesByDateMap | null
): TFile[] {
  const id = getDateUID(date, "week");
  const matching = notesByDate?.[id];
  if (matching?.length) {
    return matching;
  }

  const note = getWeeklyNote(date, fallback ?? {});
  return note ? [note] : [];
}

export function getAllWeeklyNotes(): Record<string, TFile> {
  const { vault } = window.app;
  const { folder } = getWeeklyNoteSettings();

  const weeklyNotesFolder = folder
    ? vault.getAbstractFileByPath(normalizePath(folder))
    : vault.getRoot();
  if (!(weeklyNotesFolder instanceof TFolder)) {
    throw new Error("Failed to find weekly notes folder");
  }

  const weeklyNotes: Record<string, TFile> = {};
  Vault.recurseChildren(weeklyNotesFolder, (note) => {
    if (note instanceof TFile) {
      const date = getWeekDateFromFile(note);
      if (date) {
        weeklyNotes[getDateUID(date, "week")] = note;
      }
    }
  });

  return weeklyNotes;
}

async function ensureFolderExists(path: string): Promise<void> {
  const dirs = path.split("/").slice(0, -1).filter(Boolean);
  if (!dirs.length) {
    return;
  }
  const dir = dirs.join("/");
  if (!window.app.vault.getAbstractFileByPath(dir)) {
    await window.app.vault.createFolder(dir);
  }
}

async function getNotePath(folder: string, filename: string): Promise<string> {
  const name = filename.endsWith(".md") ? filename : `${filename}.md`;
  const path = normalizePath([folder, name].filter(Boolean).join("/"));
  await ensureFolderExists(path);
  return path;
}

async function getTemplateContents(template: string): Promise<string> {
  const { metadataCache, vault } = window.app;
  const templatePath = normalizePath(template);
  if (templatePath === "/") {
    return "";
  }
  try {
    const templateFile = metadataCache.getFirstLinkpathDest(templatePath, "");
    return templateFile ? await vault.cachedRead(templateFile) : "";
  } catch (err) {
    console.error(
      `[Calendar Hub] Failed to read the weekly note template '${templatePath}'`,
      err
    );
    new Notice("Failed to read the weekly note template");
    return "";
  }
}

const DAYS_OF_WEEK = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * Create a weekly note for the given date, applying Calendar Hub's configured
 * template. Self-contained replacement for `createWeeklyNote()` from
 * `obsidian-daily-notes-interface`.
 */
export async function createWeeklyNote(date: Moment): Promise<TFile> {
  const { vault } = window.app;
  const { template, format, folder } = getWeeklyNoteSettings();
  const templateContents = await getTemplateContents(template);
  const filename = date.format(format);
  const normalizedPath = await getNotePath(folder, filename);

  try {
    return await vault.create(
      normalizedPath,
      templateContents
        .replace(
          /{{\s*(date|time)\s*(([+-]\d+)([yqmwdhs]))?\s*(:.+?)?}}/gi,
          (_, _timeOrDate, calc, timeDelta, unit, momentFormat) => {
            const now = window.moment();
            const currentDate = date.clone().set({
              hour: now.get("hour"),
              minute: now.get("minute"),
              second: now.get("second"),
            });
            if (calc) {
              currentDate.add(parseInt(timeDelta, 10), unit);
            }
            if (momentFormat) {
              return currentDate.format(momentFormat.substring(1).trim());
            }
            return currentDate.format(format);
          }
        )
        .replace(/{{\s*title\s*}}/gi, filename)
        .replace(/{{\s*time\s*}}/gi, window.moment().format("HH:mm"))
        .replace(
          /{{\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*:(.*?)}}/gi,
          (_, dayOfWeek, momentFormat) => {
            const day = DAYS_OF_WEEK.indexOf(dayOfWeek.toLowerCase());
            return date.weekday(day).format(momentFormat.trim());
          }
        )
    );
  } catch (err) {
    console.error(
      `[Calendar Hub] Failed to create file: '${normalizedPath}'`,
      err
    );
    new Notice("Unable to create new file.");
    throw err;
  }
}

/**
 * Create a Weekly Note for a given date.
 */
export async function tryToCreateWeeklyNote(
  date: Moment,
  inNewSplit: boolean,
  settings: ISettings,
  cb?: (file: TFile) => void
): Promise<void> {
  const { workspace } = window.app;
  const { format } = getWeeklyNoteSettings();
  const filename = date.format(format);

  const createFile = async () => {
    const weeklyNote = await createWeeklyNote(date);
    const leaf = inNewSplit
      ? workspace.splitActiveLeaf()
      : workspace.getUnpinnedLeaf();

    await leaf.openFile(weeklyNote, { active: true });
    cb?.(weeklyNote);
  };

  if (settings.shouldConfirmBeforeCreate) {
    createConfirmationDialog({
      cta: "Create",
      onAccept: createFile,
      text: `File ${filename} does not exist. Would you like to create it?`,
      title: "New Weekly Note",
    });
  } else {
    await createFile();
  }
}
