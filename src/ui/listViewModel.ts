import type { TFile } from "obsidian";

import type { Moment } from "../obsidian-moment";

export type ListGrouping = "year" | "quarter" | "month" | "week";
export type ListSortOrder = "desc" | "asc";

export interface ListDay {
  dateStr: string;
  label: string;
  files: TFile[];
}

export interface ListSubgroup {
  key: string;
  /** null for the "year" grouping, where days render directly under the year. */
  label: string | null;
  noteCount: number;
  days: ListDay[];
}

export interface ListYearGroup {
  key: string;
  label: string;
  noteCount: number;
  subgroups: ListSubgroup[];
}

/**
 * Parses a day bucket key from the daily-notes index. Real date UIDs look
 * like "day-2026-07-09T00:00:00+08:00"; a bare ISO date is accepted too.
 */
function parseDayUID(uid: string): Moment {
  return window.moment(
    uid.replace(/^day-/, ""),
    window.moment.ISO_8601,
    true
  );
}

function yearKeyOf(date: Moment, grouping: ListGrouping): string {
  // Weeks belong to their ISO week-year, so early January can group under
  // the previous year's last week instead of splitting it.
  return grouping === "week" ? date.format("GGGG") : date.format("YYYY");
}

function subgroupOf(
  date: Moment,
  grouping: ListGrouping
): { key: string; label: string | null } {
  switch (grouping) {
    case "quarter":
      return {
        key: `${date.format("YYYY")}-Q${date.quarter()}`,
        label: `Q${date.quarter()}`,
      };
    case "month":
      return { key: date.format("YYYY-MM"), label: date.format("MMMM") };
    case "week":
      return {
        key: date.format("GGGG-[W]WW"),
        label: date.format("[W]WW"),
      };
    default:
      return { key: `${date.format("YYYY")}-all`, label: null };
  }
}

/** The group keys that contain `date` — used to expand today's branch. */
export function getListKeysForDate(
  date: Moment,
  grouping: ListGrouping
): { yearKey: string; subgroupKey: string } {
  return {
    yearKey: yearKeyOf(date, grouping),
    subgroupKey: subgroupOf(date, grouping).key,
  };
}

/**
 * Shapes the daily-notes index into a year › subgroup › day tree for the
 * sidebar list. The index is already folder-filtered, so the list honors the
 * same scan-folder rules as the calendar.
 */
export function buildListModel(
  notesByDate: Record<string, TFile[]>,
  grouping: ListGrouping,
  order: ListSortOrder
): ListYearGroup[] {
  const years = new Map<
    string,
    Map<string, { label: string | null; days: Map<string, ListDay> }>
  >();

  for (const [uid, files] of Object.entries(notesByDate)) {
    if (!files?.length) {
      continue;
    }
    const date = parseDayUID(uid);
    if (!date.isValid()) {
      continue;
    }

    const yearKey = yearKeyOf(date, grouping);
    const subgroup = subgroupOf(date, grouping);
    const dateStr = date.format("YYYY-MM-DD");

    const subgroups =
      years.get(yearKey) ??
      new Map<string, { label: string | null; days: Map<string, ListDay> }>();
    years.set(yearKey, subgroups);

    const bucket = subgroups.get(subgroup.key) ?? {
      label: subgroup.label,
      days: new Map<string, ListDay>(),
    };
    subgroups.set(subgroup.key, bucket);

    const day = bucket.days.get(dateStr) ?? {
      dateStr,
      label: date.format("MMM D, ddd"),
      files: [],
    };
    day.files = [...day.files, ...files];
    bucket.days.set(dateStr, day);
  }

  const direction = order === "asc" ? 1 : -1;
  const byKey = (a: { key: string }, b: { key: string }) =>
    direction * a.key.localeCompare(b.key);

  return Array.from(years.entries())
    .map(([yearKey, subgroups]) => {
      const shapedSubgroups = Array.from(subgroups.entries())
        .map(([key, bucket]) => {
          const days = Array.from(bucket.days.values()).sort(
            (a, b) => direction * a.dateStr.localeCompare(b.dateStr)
          );
          return {
            key,
            label: bucket.label,
            noteCount: days.reduce((count, day) => count + day.files.length, 0),
            days,
          };
        })
        .sort(byKey);

      return {
        key: yearKey,
        label: yearKey,
        noteCount: shapedSubgroups.reduce(
          (count, subgroup) => count + subgroup.noteCount,
          0
        ),
        subgroups: shapedSubgroups,
      };
    })
    .sort(byKey);
}
