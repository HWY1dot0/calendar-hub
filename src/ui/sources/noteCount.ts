import type { Moment } from "../../obsidian-moment";
import type { ICalendarSource, IDayMetadata, IDot } from "obsidian-calendar-ui";
import { get } from "svelte/store";

import { DEFAULT_MAX_NOTE_DOTS } from "src/constants";
import { getDailyNotesForDate } from "src/io/dailyNoteIndex";
import { getWeeklyNotesForDate } from "src/io/weeklyNotes";

import {
  dailyNotes,
  dailyNotesByDate,
  settings,
  weeklyNotes,
  weeklyNotesByDate,
} from "../stores";

export function getNoteCountAsDots(
  noteCount: number,
  maxDots: number = DEFAULT_MAX_NOTE_DOTS
): IDot[] {
  const numSolidDots = Math.min(Math.max(noteCount, 0), maxDots);
  const dots: IDot[] = [];

  for (let i = 0; i < numSolidDots; i++) {
    dots.push({
      color: "default",
      isFilled: true,
    } as IDot);
  }

  return dots;
}

function getMaxDots(): number {
  return get(settings).maxNoteDots;
}

export const noteCountSource: ICalendarSource = {
  getDailyMetadata: (date: Moment): Promise<IDayMetadata> => {
    const notes = getDailyNotesForDate(
      date,
      get(dailyNotesByDate),
      get(dailyNotes)
    );

    return Promise.resolve({
      dots: getNoteCountAsDots(notes.length, getMaxDots()),
    });
  },

  getWeeklyMetadata: (date: Moment): Promise<IDayMetadata> => {
    const notes = getWeeklyNotesForDate(
      date,
      get(weeklyNotesByDate),
      get(weeklyNotes)
    );

    return Promise.resolve({
      dots: getNoteCountAsDots(notes.length, getMaxDots()),
    });
  },
};
