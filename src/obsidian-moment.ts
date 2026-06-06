import type { moment } from "obsidian";

/**
 * The Moment instance type. Obsidian bundles moment and re-exports the `moment`
 * function, but it does not export the `Moment` type name, so derive it from the
 * exported function's return type. Importing here (rather than from the "moment"
 * package directly) keeps the plugin off the bundled-moment dependency.
 */
export type Moment = ReturnType<(typeof moment)["default"]>;

/** Unit accepted by `Moment.add`, e.g. "day", "week". */
export type DurationUnit = Parameters<Moment["add"]>[0];

/** moment locale week spec; only `dow` (day of week) is read. */
export interface WeekSpec {
  dow: number;
  doy: number;
}
