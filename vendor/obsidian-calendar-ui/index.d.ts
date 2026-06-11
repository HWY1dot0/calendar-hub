/*
 * Vendored from obsidian-calendar-ui@0.3.12 (index.d.ts).
 * https://github.com/liamcain/obsidian-calendar-ui — MIT License (see LICENSE).
 * Modified for this repository: Moment/Locale types are derived from the
 * 'obsidian' module (which bundles moment) instead of importing the 'moment'
 * package, and the ILocaleOverride union avoids a redundant constituent.
 */
import type { moment } from "obsidian";
import { SvelteComponentTyped } from "svelte";

type Moment = ReturnType<(typeof moment)["default"]>;
type Locale = ReturnType<(typeof moment)["localeData"]>;

export type ILocaleOverride = "system-default" | (string & Record<never, never>);
export type IWeekStartOption =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "locale";

export interface IDot {
  className: string;
  color: string;
  isFilled: boolean;
}

export interface IDayMetadata {
  classes?: string[];
  dataAttributes?: Record<string, string>;
  dots?: IDot[];
}

export interface ICalendarSource {
  getDailyMetadata?: (date: Moment) => Promise<IDayMetadata>;
  getWeeklyMetadata?: (date: Moment) => Promise<IDayMetadata>;
}

export class Calendar extends SvelteComponentTyped<{
  // Settings
  showWeekNums: boolean;
  localeData?: Locale;

  // Event Handlers
  onHoverDay?: (date: Moment, targetEl: EventTarget) => void;
  onHoverWeek?: (date: Moment, targetEl: EventTarget) => void;
  onClickDay?: (date: Moment, isMetaPressed: boolean) => void;
  onClickWeek?: (date: Moment, isMetaPressed: boolean) => void;
  onContextMenuDay?: (date: Moment, event: MouseEvent) => boolean;
  onContextMenuWeek?: (date: Moment, event: MouseEvent) => boolean;

  // External sources
  selectedId?: string | null;
  sources?: ICalendarSource[];

  // Override-able local state
  today?: Moment;
  displayedMonth?: Moment;
}> {}

export function configureGlobalMomentLocale(
  localeOverride: ILocaleOverride,
  weekStart: IWeekStartOption
): string;
