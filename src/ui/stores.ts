import type { TFile } from "obsidian";
import { get, writable } from "svelte/store";

import { defaultSettings, ISettings } from "src/settings";
import {
  buildDailyNotesByDate,
  DailyNotesByDate,
  dailyNotesByDateToSingleNotes,
  singleDailyNotesToDailyNotesByDate,
} from "src/io/dailyNoteIndex";
import { getAllDailyNotes } from "src/io/dailyNotes";
import {
  buildWeeklyNotesByDate,
  getAllWeeklyNotes,
} from "src/io/weeklyNotes";

import { getDateUIDFromFile } from "./utils";

export const settings = writable<ISettings>(defaultSettings);
export const dailyNotesByDate = writable<DailyNotesByDate>({});
export const weeklyNotesByDate = writable<DailyNotesByDate>({});

function createDailyNotesStore() {
  let hasError = false;
  const store = writable<Record<string, TFile>>(null);
  return {
    reindex: () => {
      try {
        const shouldIndexAllFolders = get(
          settings
        ).shouldIndexDailyNotesInAllFolders;
        const notesByDate = shouldIndexAllFolders
          ? buildDailyNotesByDate(
              window.app.vault.getMarkdownFiles(),
              {
                filenameDateFormat: get(settings).dailyNoteFilenameDateFormat,
                frontmatterDateFields: get(settings)
                  .shouldIndexDailyNotesFromFrontmatter
                  ? get(settings).dailyNoteFrontmatterDateFields
                  : "",
                includedFolders: get(settings).dailyNoteIncludedFolders,
              }
            )
          : singleDailyNotesToDailyNotesByDate(getAllDailyNotes());
        const dailyNotes = dailyNotesByDateToSingleNotes(notesByDate);

        store.set(dailyNotes);
        dailyNotesByDate.set(notesByDate);
        hasError = false;
      } catch (err) {
        if (!hasError) {
          // Avoid error being shown multiple times
          console.warn(
            "[Calendar Hub] Failed to find daily notes folder",
            err
          );
        }
        store.set({});
        dailyNotesByDate.set({});
        hasError = true;
      }
    },
    ...store,
  };
}

function createWeeklyNotesStore() {
  let hasError = false;
  const store = writable<Record<string, TFile>>(null);
  return {
    reindex: () => {
      try {
        const currentSettings = get(settings);
        const notesByDate = currentSettings.shouldIndexWeeklyNotesInAllFolders
          ? buildWeeklyNotesByDate(window.app.vault.getMarkdownFiles(), {
              filenameDateFormat: currentSettings.weeklyNoteFilenameDateFormat,
              frontmatterDateFields: currentSettings
                .shouldIndexWeeklyNotesFromFrontmatter
                ? currentSettings.weeklyNoteFrontmatterDateFields
                : "",
              includedFolders: currentSettings.weeklyNoteIncludedFolders,
            })
          : singleDailyNotesToDailyNotesByDate(getAllWeeklyNotes());
        const weeklyNotes = dailyNotesByDateToSingleNotes(notesByDate);

        store.set(weeklyNotes);
        weeklyNotesByDate.set(notesByDate);
        hasError = false;
      } catch (err) {
        if (!hasError) {
          // Avoid error being shown multiple times
          console.warn(
            "[Calendar Hub] Failed to find weekly notes folder",
            err
          );
        }
        store.set({});
        weeklyNotesByDate.set({});
        hasError = true;
      }
    },
    ...store,
  };
}

export const dailyNotes = createDailyNotesStore();
export const weeklyNotes = createWeeklyNotesStore();

function createSelectedFileStore() {
  const store = writable<string>(null);

  return {
    setFile: (file: TFile) => {
      const id = getDateUIDFromFile(file);
      store.set(id);
    },
    ...store,
  };
}

export const activeFile = createSelectedFileStore();
