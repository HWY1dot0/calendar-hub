import moment from "moment";
import type { App } from "obsidian";

import type CalendarPlugin from "./main";
import {
  CalendarSettingsTab,
  defaultSettings,
  migrateSettings,
} from "./settings";

class FakeElement {
  children: FakeElement[] = [];
  listeners: Record<string, () => void> = {};
  attrs: Record<string, string> = {};
  classes = new Set<string>();

  constructor(public text = "") {}

  private addChild(options?: { text?: string }): FakeElement {
    const child = new FakeElement(options?.text ?? "");
    this.children.push(child);
    return child;
  }

  createDiv(options?: unknown): FakeElement {
    return this.addChild(options as { text?: string });
  }

  createEl(_tag: string, options?: { text?: string }): FakeElement {
    return this.addChild(options);
  }

  empty(): void {
    this.children = [];
  }

  addEventListener(type: string, listener: () => void): void {
    this.listeners[type] = listener;
  }

  toggleClass(cls: string, on: boolean): void {
    if (on) {
      this.classes.add(cls);
    } else {
      this.classes.delete(cls);
    }
  }

  setAttribute(name: string, value: string): void {
    this.attrs[name] = value;
  }
}

const dropdownOptions: Record<string, string> = {};

jest.mock("obsidian", () => ({
  PluginSettingTab: class PluginSettingTab {},
  Setting: class Setting {
    constructor(containerEl: FakeElement) {
      containerEl.createDiv();
    }
    setName(): this {
      return this;
    }
    setDesc(): this {
      return this;
    }
    setHeading(): this {
      return this;
    }
    addDropdown(cb: (dropdown: unknown) => void): this {
      const dropdown = {
        addOption: (value: string, label: string) => {
          dropdownOptions[value] = label;
          return dropdown;
        },
        setValue: () => dropdown,
        onChange: () => dropdown,
      };
      cb(dropdown);
      return this;
    }
  },
}));

jest.mock(
  "src/ui/FolderRuleTree.svelte",
  () =>
    class FolderRuleTree {
      $destroy = jest.fn();
      $set = jest.fn();
    }
);

jest.mock("obsidian-daily-notes-interface", () => ({
  appHasDailyNotesPluginLoaded: () => true,
}));

const prototype = (CalendarSettingsTab.prototype as unknown) as Record<
  string,
  () => void
>;
const allAdders = Object.getOwnPropertyNames(prototype).filter((name) =>
  /^add.*Setting$/.test(name)
);

function renderTab(showWeekNumbers: boolean) {
  const calls: string[] = [];
  allAdders.forEach((name) => {
    jest.spyOn(prototype, name).mockImplementation(() => {
      calls.push(name);
    });
  });

  const containerEl = new FakeElement();
  const tab = new CalendarSettingsTab(
    ({} as unknown) as App,
    ({
      options: { ...defaultSettings, showWeekNumbers },
    } as unknown) as CalendarPlugin
  );
  ((tab as unknown) as { containerEl: FakeElement }).containerEl = containerEl;

  const clickTab = (name: string): void => {
    calls.length = 0;
    const tabBar = containerEl.children[0];
    tabBar.children.find((el) => el.text === name).listeners.click();
  };

  return { calls, clickTab, containerEl, tab };
}

describe("CalendarSettingsTab sections", () => {
  beforeEach(() => {
    (window as unknown as { app: unknown }).app = {
      plugins: { getPlugin: () => null },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("opens on General with only its settings", () => {
    const { calls, tab } = renderTab(false);

    tab.display();

    expect(calls).toEqual([
      "addWeekStartSetting",
      "addLocaleOverrideSetting",
      "addMaxNoteDotsSetting",
      "addEmptyDateClickSetting",
      "addShowViewSwitcherSetting",
      "addShowWeekNumbersSetting",
    ]);
  });

  it("marks the selected tab and swaps the panel contents", () => {
    const { calls, clickTab, containerEl, tab } = renderTab(false);

    tab.display();
    clickTab("Folders");

    expect(calls).toEqual(["addIncludedFoldersSetting"]);
    const [general, folders] = containerEl.children[0].children;
    expect(general.classes.has("is-active")).toBe(false);
    expect(general.attrs["aria-selected"]).toBe("false");
    expect(folders.classes.has("is-active")).toBe(true);
    expect(folders.attrs["aria-selected"]).toBe("true");
  });

  it("stays on the current tab when the settings re-render", () => {
    const { calls, clickTab, tab } = renderTab(false);

    tab.display();
    clickTab("Date matching");
    calls.length = 0;
    tab.display();

    expect(calls).toEqual([
      "addDailyNoteFrontmatterDateFieldsSetting",
      "addDailyNoteFilenameDateFormatSetting",
      "addIndexDailyNotesFromCreationDateSetting",
    ]);
  });

  it("shows every setting on exactly one tab once week numbers are on", () => {
    const { calls, clickTab, tab } = renderTab(true);
    const seen: string[] = [];

    tab.display();
    seen.push(...calls);
    clickTab("Folders");
    seen.push(...calls);
    clickTab("Date matching");
    seen.push(...calls);

    expect([...seen].sort()).toEqual([...allAdders].sort());
  });
});

describe("week start setting", () => {
  it("renders before any calendar has set the locale week-spec global", () => {
    window.moment = moment as unknown as typeof window.moment;
    delete (window as unknown as { _bundledLocaleWeekSpec?: unknown })
      ._bundledLocaleWeekSpec;
    const tab = new CalendarSettingsTab(
      ({} as unknown) as App,
      ({ options: { ...defaultSettings } } as unknown) as CalendarPlugin
    );
    const panelEl = new FakeElement();
    ((tab as unknown) as { panelEl: FakeElement }).panelEl = panelEl;

    tab.addWeekStartSetting();

    expect(panelEl.children).toHaveLength(1);
    expect(dropdownOptions.locale).toBe("Locale default (Sunday)");
  });
});

describe("migrateSettings", () => {
  it("starts from the defaults when nothing was saved", () => {
    expect(migrateSettings(null, "Daily")).toEqual(defaultSettings);
  });

  it("keeps current keys and drops unknown ones", () => {
    const migrated = migrateSettings(
      { maxNoteDots: 2, wordsPerDot: 250, includedFolders: "Journal" },
      ""
    );

    expect(migrated.maxNoteDots).toBe(2);
    expect(migrated.includedFolders).toBe("Journal");
    expect("wordsPerDot" in migrated).toBe(false);
  });

  it("folds the two click booleans into one choice", () => {
    expect(
      migrateSettings({ shouldCreateNoteOnClick: false }, "").emptyDateClick
    ).toBe("select");
    expect(
      migrateSettings({ shouldConfirmBeforeCreate: false }, "").emptyDateClick
    ).toBe("create");
    expect(
      migrateSettings({ shouldConfirmBeforeCreate: true }, "").emptyDateClick
    ).toBe("confirm");
    expect(
      migrateSettings(
        { emptyDateClick: "create", shouldCreateNoteOnClick: false },
        ""
      ).emptyDateClick
    ).toBe("create");
  });

  it("turns 'detect in all folders' off into a folder rule", () => {
    expect(
      migrateSettings(
        { shouldIndexDailyNotesInAllFolders: false },
        "/Journal/Daily/"
      ).includedFolders
    ).toBe("Journal/Daily");
    // An unset Daily Notes folder is the vault root, which blank already means.
    expect(
      migrateSettings({ shouldIndexDailyNotesInAllFolders: false }, "")
        .includedFolders
    ).toBe("");
    expect(
      migrateSettings(
        {
          shouldIndexDailyNotesInAllFolders: true,
          dailyNoteIncludedFolders: "30 Macro",
        },
        "Daily"
      ).includedFolders
    ).toBe("30 Macro");
  });

  it("maps the frontmatter toggles onto the field lists", () => {
    expect(
      migrateSettings(
        {
          shouldIndexDailyNotesFromFrontmatter: false,
          dailyNoteFrontmatterDateFields: "date",
        },
        ""
      ).dailyNoteFrontmatterDateFields
    ).toBe("");
    expect(
      migrateSettings({ shouldIndexDailyNotesFromFrontmatter: true }, "")
        .dailyNoteFrontmatterDateFields
    ).toBe("date, daily_date, calendar_date");
    expect(
      migrateSettings(
        {
          shouldIndexWeeklyNotesFromFrontmatter: true,
          weeklyNoteFrontmatterDateFields: "wk",
        },
        ""
      ).weeklyNoteFrontmatterDateFields
    ).toBe("wk");
  });

  it("renames the week-number switch", () => {
    expect(migrateSettings({ showWeeklyNote: true }, "").showWeekNumbers).toBe(
      true
    );
  });
});
