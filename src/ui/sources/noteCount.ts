import type { Moment } from "moment";
import type { ICalendarSource, IDayMetadata, IDot } from "obsidian-calendar-ui";
import { get } from "svelte/store";

import { getDailyNotesForDate } from "src/io/dailyNoteIndex";
import { getWeeklyNotesForDate } from "src/io/weeklyNotes";

import {
  dailyNotes,
  dailyNotesByDate,
  weeklyNotes,
  weeklyNotesByDate,
} from "../stores";

const NUM_MAX_DOTS = 5;

export function getNoteCountAsDots(noteCount: number): IDot[] {
  const numSolidDots = Math.min(Math.max(noteCount, 0), NUM_MAX_DOTS);
  const dots: IDot[] = [];

  for (let i = 0; i < numSolidDots; i++) {
    dots.push({
      color: "default",
      isFilled: true,
    } as IDot);
  }

  return dots;
}

export const noteCountSource: ICalendarSource = {
  getDailyMetadata: (date: Moment): Promise<IDayMetadata> => {
    const notes = getDailyNotesForDate(
      date,
      get(dailyNotesByDate),
      get(dailyNotes)
    );

    return Promise.resolve({
      dots: getNoteCountAsDots(notes.length),
    });
  },

  getWeeklyMetadata: (date: Moment): Promise<IDayMetadata> => {
    const notes = getWeeklyNotesForDate(
      date,
      get(weeklyNotesByDate),
      get(weeklyNotes)
    );

    return Promise.resolve({
      dots: getNoteCountAsDots(notes.length),
    });
  },
};
