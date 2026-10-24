import type { DurationUnit, Moment } from "../obsidian-moment";
import { Notice, TFile, TFolder, Vault, normalizePath } from "obsidian";
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

async function ensureNoteFolder(path: string): Promise<void> {
  const folders = path.split("/").slice(0, -1).filter(Boolean);
  let current = "";
  for (const folder of folders) {
    current = current ? `${current}/${folder}` : folder;
    if (!window.app.vault.getAbstractFileByPath(current)) {
      await window.app.vault.createFolder(current);
    }
  }
}

async function getDailyTemplateContents(template: string): Promise<string> {
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
      `[Calendar Hub] Failed to read the daily note template '${templatePath}'`,
      err
    );
    new Notice("Failed to read the daily note template");
    return "";
  }
}

/** Mirrors the daily-note template substitutions of
 *  `obsidian-daily-notes-interface`, so a suffixed note starts with the same
 *  content as the standard daily note. */
function renderDailyTemplate(
  templateContents: string,
  date: Moment,
  filename: string,
  format: string
): string {
  return templateContents
    .replace(/{{\s*date\s*}}/gi, filename)
    .replace(/{{\s*time\s*}}/gi, window.moment().format("HH:mm"))
    .replace(/{{\s*title\s*}}/gi, filename)
    .replace(
      /{{\s*(date|time)\s*(([+-]\d+)([yqmwdhs]))?\s*(:.+?)?}}/gi,
      (
        _: string,
        _timeOrDate: string,
        calc: string,
        timeDelta: string,
        unit: string,
        momentFormat: string
      ) => {
        const now = window.moment();
        const currentDate = date.clone().set({
          hour: now.get("hour"),
          minute: now.get("minute"),
          second: now.get("second"),
        });
        if (calc) {
          currentDate.add(parseInt(timeDelta, 10), unit as DurationUnit);
        }
        if (momentFormat) {
          return currentDate.format(momentFormat.substring(1).trim());
        }
        return currentDate.format(format);
      }
    )
    .replace(
      /{{\s*yesterday\s*}}/gi,
      date.clone().subtract(1, "day").format(format)
    )
    .replace(
      /{{\s*tomorrow\s*}}/gi,
      date.clone().add(1, "d").format(format)
    );
}

/**
 * Create a daily note for `date`, applying the configured daily-note template.
 * The standard name is used when free; further notes for the same day are
 * numbered "2026-10-24 (1)", "2026-10-24 (2)", ... so repeated clicks never
 * fail and never ask for a name.
 */
export async function createDailyNoteFile(date: Moment): Promise<TFile> {
  const { vault } = window.app;
  const { folder, format, template } = getDailyNoteSettings();
  const baseName = date.format(format);
  const notePath = (name: string): string =>
    normalizePath([folder, `${name}.md`].filter(Boolean).join("/"));

  let name = baseName;
  let path = notePath(name);
  for (let index = 1; vault.getAbstractFileByPath(path); index += 1) {
    name = `${baseName} (${index})`;
    path = notePath(name);
  }

  await ensureNoteFolder(path);
  const templateContents = await getDailyTemplateContents(template);
  return vault.create(
    path,
    renderDailyTemplate(templateContents, date, name, format)
  );
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
