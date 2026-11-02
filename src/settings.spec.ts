import type { App } from "obsidian";

import type CalendarPlugin from "./main";
import { CalendarSettingsTab, defaultSettings } from "./settings";

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

jest.mock("obsidian", () => ({
  PluginSettingTab: class PluginSettingTab {},
  Setting: class Setting {},
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

function renderTab(
  showWeeklyNote: boolean,
  shouldIndexDailyNotesInAllFolders = true
) {
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
      options: {
        ...defaultSettings,
        showWeeklyNote,
        shouldIndexDailyNotesInAllFolders,
      },
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
      "addCreateOnClickSetting",
      "addConfirmCreateSetting",
      "addShowViewSwitcherSetting",
    ]);
  });

  it("marks the selected tab and swaps the panel contents", () => {
    const { calls, clickTab, containerEl, tab } = renderTab(false);

    tab.display();
    clickTab("Folders");

    expect(calls).toEqual([
      "addIndexDailyNotesInAllFoldersSetting",
      "addDailyNoteIncludedFoldersSetting",
    ]);
    const [general, folders] = containerEl.children[0].children;
    expect(general.classes.has("is-active")).toBe(false);
    expect(general.attrs["aria-selected"]).toBe("false");
    expect(folders.classes.has("is-active")).toBe(true);
    expect(folders.attrs["aria-selected"]).toBe("true");
  });

  it("stays on the current tab when the settings re-render", () => {
    const { calls, clickTab, tab } = renderTab(false);

    tab.display();
    clickTab("Weekly notes");
    calls.length = 0;
    tab.display();

    expect(calls).toEqual(["addShowWeeklyNoteSetting"]);
  });

  it("hides the folder rules while the scan is pinned to the Daily Notes folder", () => {
    const { calls, clickTab, tab } = renderTab(false, false);

    tab.display();
    clickTab("Folders");

    expect(calls).toEqual(["addIndexDailyNotesInAllFoldersSetting"]);
  });

  it("shows every setting on exactly one tab", () => {
    const { calls, clickTab, tab } = renderTab(true);
    const seen: string[] = [];

    tab.display();
    seen.push(...calls);
    clickTab("Folders");
    seen.push(...calls);
    clickTab("Date matching");
    seen.push(...calls);
    clickTab("Weekly notes");
    seen.push(...calls);

    expect([...seen].sort()).toEqual([...allAdders].sort());
  });
});
