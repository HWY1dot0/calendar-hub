import type { Moment } from "../obsidian-moment";
import { TFile, TFolder, Vault, normalizePath } from "obsidian";
import {
  createDailyNote,
  getDailyNoteSettings,
  getDateUID,
} from "obsidian-daily-notes-interface";

import type { ISettings } from "src/settings";
import { createConfirmationDialog } from "src/ui/modal";

/**
 * Parse the day date encoded in a file name using the active daily-note format
 * (read from Obsidian's core Daily Notes plugin, or Periodic Notes when
 * enabled). Self-contained replacement for `getDateFromFile(file, "day")` from
 * `obsidian-daily-notes-interface`, so Calendar Hub never pulls the library's
 * legacy weekly-settings reader (which reads the old "calendar" plugin) into
 * the bundle.
 */
export function getDayDateFromFile(file: TFile): Moment | null {
  const format = getDailyNoteSettings().format.split("/").pop() ?? "";
  const noteDate = window.moment(file.basename, format, true);
  return noteDate.isValid() ? noteDate : null;
}

/**
 * Index every daily note by date UID. Self-contained replacement for
 * `getAllDailyNotes()` from `obsidian-daily-notes-interface`, so we no longer
 * import the library's `getDateFromFile` (which statically references the
 * legacy weekly-settings reader that reads the old "calendar" plugin).
 */
export function getAllDailyNotes(): Record<string, TFile> {
  const { vault } = window.app;
  const { folder } = getDailyNoteSettings();

  const dailyNotesFolder = folder
    ? vault.getAbstractFileByPath(normalizePath(folder))
    : vault.getRoot();
  if (!(dailyNotesFolder instanceof TFolder)) {
    throw new Error("Failed to find daily notes folder");
  }

  const dailyNotes: Record<string, TFile> = {};
  Vault.recurseChildren(dailyNotesFolder, (note) => {
    if (note instanceof TFile) {
      const date = getDayDateFromFile(note);
      if (date) {
        dailyNotes[getDateUID(date, "day")] = note;
      }
    }
  });

  return dailyNotes;
}

/**
 * Create a Daily Note for a given date.
 */
export async function tryToCreateDailyNote(
  date: Moment,
  inNewSplit: boolean,
  settings: ISettings,
  cb?: (newFile: TFile) => void
): Promise<void> {
  const { workspace } = window.app;
  const { format } = getDailyNoteSettings();
  const filename = date.format(format);

  const createFile = async () => {
    const dailyNote = await createDailyNote(date);
    const leaf = workspace.getLeaf(inNewSplit ? "split" : false);

    await leaf.openFile(dailyNote, { active: true });
    cb?.(dailyNote);
  };

  if (settings.shouldConfirmBeforeCreate) {
    createConfirmationDialog({
      cta: "Create",
      onAccept: createFile,
      text: `File ${filename} does not exist. Would you like to create it?`,
      title: "New Daily Note",
    });
  } else {
    await createFile();
  }
}
