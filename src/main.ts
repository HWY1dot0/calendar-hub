import type { WeekSpec } from "./obsidian-moment";
import { App, Plugin, WorkspaceLeaf } from "obsidian";

import { VIEW_TYPE_CALENDAR } from "./constants";
import { dailyNotes, settings, weeklyNotes } from "./ui/stores";
import {
  appHasPeriodicNotesPluginLoaded,
  CalendarSettingsTab,
  ISettings,
} from "./settings";
import CalendarView from "./view";

declare global {
  interface Window {
    app: App;
    moment: (typeof import("obsidian").moment)["default"];
    _bundledLocaleWeekSpec: WeekSpec;
  }
}

export default class CalendarPlugin extends Plugin {
  public options: ISettings;

  async onload(): Promise<void> {
    this.register(
      settings.subscribe((value) => {
        this.options = value;
      })
    );

    this.registerView(VIEW_TYPE_CALENDAR, (leaf: WorkspaceLeaf) => {
      return new CalendarView(leaf, this);
    });

    this.addCommand({
      id: "show-calendar-view",
      name: "Open calendar view",
      checkCallback: (checking: boolean) => {
        if (checking) {
          return (
            this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR).length === 0
          );
        }
        this.initLeaf();
      },
    });

    this.addCommand({
      id: "open-weekly-note",
      name: "Open weekly note",
      checkCallback: (checking) => {
        if (checking) {
          return !appHasPeriodicNotesPluginLoaded();
        }
        const view = this.getCalendarView();
        if (view) {
          void view.openOrCreateWeeklyNote(window.moment(), false);
        }
      },
    });

    this.addCommand({
      id: "reveal-active-note",
      name: "Reveal active note in calendar",
      callback: () => this.getCalendarView()?.revealActiveNote(),
    });

    await this.loadOptions();

    this.addSettingTab(new CalendarSettingsTab(this.app, this));

    this.app.workspace.onLayoutReady(() => this.initLeaf());
  }

  initLeaf(): void {
    if (this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR).length) {
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) {
      return;
    }
    void leaf.setViewState({
      type: VIEW_TYPE_CALENDAR,
    });
  }

  private getCalendarView(): CalendarView | null {
    const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)[0];
    return leaf?.view instanceof CalendarView ? leaf.view : null;
  }

  async loadOptions(): Promise<void> {
    const options = (await this.loadData()) as Partial<ISettings> | null;
    settings.update((old) => {
      return {
        ...old,
        ...(options || {}),
      };
    });

    await this.saveData(this.options);
  }

  async writeOptions(
    changeOpts: (settings: ISettings) => Partial<ISettings>
  ): Promise<void> {
    settings.update((old) => ({ ...old, ...changeOpts(old) }));
    await this.saveData(this.options);
    dailyNotes.reindex();
    weeklyNotes.reindex();
  }
}
