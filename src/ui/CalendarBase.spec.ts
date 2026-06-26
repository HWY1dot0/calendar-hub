/** @jest-environment jsdom */

import fs from "fs";
import moment from "moment";
import path from "path";

interface CalendarInstance {
  $$: {
    ctx: moment.Moment[];
  };
  $destroy(): void;
}

type CalendarConstructor = new (options: {
  target: HTMLElement;
  props: Record<string, unknown>;
}) => CalendarInstance;

function loadVendoredCalendar(): CalendarConstructor {
  const source = fs
    .readFileSync(
      path.join(__dirname, "../../vendor/obsidian-calendar-ui/index.js"),
      "utf8"
    )
    .replace("import 'obsidian';", "")
    .replace(
      "export { Calendar, configureGlobalMomentLocale };",
      "return { Calendar, configureGlobalMomentLocale };"
    );

  // Execute the checked-in ESM bundle directly without changing Jest transforms.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return (new Function(source)() as { Calendar: CalendarConstructor }).Calendar;
}

function installMomentNow(isoDate: string): void {
  const fixedMoment = ((...args: unknown[]) => {
    return args.length
      ? (moment as unknown as (...args: unknown[]) => moment.Moment)(...args)
      : moment(isoDate, "YYYY-MM-DD");
  }) as typeof moment;

  Object.assign(fixedMoment, moment);
  window.moment = fixedMoment;
}

describe("CalendarBase", () => {
  let Calendar: CalendarConstructor;
  let calendar: CalendarInstance | null;

  beforeEach(() => {
    document.body.innerHTML = "";
    Calendar = loadVendoredCalendar();
    calendar = null;
    installMomentNow("2024-06-26");
    window.app = {
      isMobile: false,
    } as unknown as typeof window.app;
  });

  afterEach(() => {
    calendar?.$destroy();
  });

  it("resets to the real current day when the Today button is clicked", () => {
    const staleToday = moment("2024-06-05", "YYYY-MM-DD");
    const lastVisitedDayInAnotherMonth = moment("2024-08-05", "YYYY-MM-DD");
    const onResetDisplayedMonth = jest.fn<void, [moment.Moment]>();

    calendar = new Calendar({
      target: document.body,
      props: {
        displayedMonth: lastVisitedDayInAnotherMonth,
        localeData: moment.localeData(),
        onResetDisplayedMonth,
        showWeekNums: false,
        sources: [],
        today: staleToday,
      },
    });

    const resetButton = document.querySelector<HTMLElement>(".reset-button");
    expect(resetButton).not.toBeNull();
    if (!resetButton) {
      throw new Error("Expected the Today reset button to render");
    }
    resetButton.click();

    const resetDate = onResetDisplayedMonth.mock.calls[0][0];
    expect(onResetDisplayedMonth).toHaveBeenCalledTimes(1);
    expect(resetDate.format("YYYY-MM-DD")).toBe("2024-06-26");
    expect(calendar.$$.ctx[0].format("YYYY-MM-DD")).toBe("2024-06-26");
    expect(staleToday.format("YYYY-MM-DD")).toBe("2024-06-05");
  });
});
