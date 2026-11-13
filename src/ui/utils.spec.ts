import moment from "moment";

import { formatWeekLabel } from "./utils";

describe("formatWeekLabel", () => {
  afterEach(() => {
    moment.updateLocale("en", { week: { dow: 0, doy: 6 } });
  });

  it("numbers a Sunday-start week the same way as the calendar's week column", () => {
    moment.updateLocale("en", { week: { dow: 0, doy: 6 } });
    const weekStart = moment("2026-11-08", "YYYY-MM-DD");

    expect(weekStart.week()).toBe(46);
    expect(formatWeekLabel(weekStart)).toBe("2026 · W46");
  });

  it("uses the locale week-year for a week that crosses New Year", () => {
    moment.updateLocale("en", { week: { dow: 0, doy: 6 } });
    const weekStart = moment("2026-12-27", "YYYY-MM-DD");

    expect(formatWeekLabel(weekStart)).toBe("2027 · W01");
  });

  it("keeps ISO numbering for a Monday-start, ISO-style locale", () => {
    moment.updateLocale("en", { week: { dow: 1, doy: 4 } });
    const weekStart = moment("2026-11-09", "YYYY-MM-DD");

    expect(formatWeekLabel(weekStart)).toBe("2026 · W46");
  });
});
