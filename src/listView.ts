import { ItemView, TFile, WorkspaceLeaf, setIcon } from "obsidian";

import { VIEW_TYPE_CALENDAR, VIEW_TYPE_LIST } from "./constants";
import type CalendarPlugin from "./main";
import type { ISettings } from "./settings";
import ListPanel from "./ui/ListPanel.svelte";
import { activeFile, dailyNotes } from "./ui/stores";

interface ListPanelComponent {
  $destroy(): void;
}

export default class ListView extends ItemView {
  private panel: ListPanelComponent | null = null;
  private plugin: CalendarPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: CalendarPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_LIST;
  }

  getDisplayText(): string {
    return "Calendar Hub list";
  }

  getIcon(): string {
    return "list";
  }

  onOpen(): Promise<void> {
    const openCalendar = (): void => {
      const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);
      if (leaves.length) {
        void this.app.workspace.revealLeaf(leaves[0]);
        return;
      }
      this.plugin.initLeaf();
    };

    this.contentEl.addClass("calendar-hub-view-content");
    this.addAction("calendar", "Open calendar view", openCalendar);

    // Sidebars hide the view header (and its actions), so the jump-back
    // control also lives in an in-content nav bar, file-explorer style.
    const navButton = this.contentEl
      .createDiv("nav-header calendar-hub-nav")
      .createDiv("nav-buttons-container")
      .createDiv({
        cls: "clickable-icon nav-action-button",
        attr: { "aria-label": "Open calendar view" },
      });
    setIcon(navButton, "calendar");
    navButton.addEventListener("click", openCalendar);

    // Fresh snapshot even when the calendar view is closed; live updates
    // ride on the calendar view's vault event wiring.
    dailyNotes.reindex();
    this.panel = new ListPanel({
      target: this.contentEl,
      props: {
        onOpenNote: this.openNote,
        onUpdateSettings: (
          changeOpts: (settings: ISettings) => Partial<ISettings>
        ) => this.plugin.writeOptions(changeOpts),
      },
    }) as unknown as ListPanelComponent;
    return Promise.resolve();
  }

  onClose(): Promise<void> {
    this.panel?.$destroy();
    this.panel = null;
    return Promise.resolve();
  }

  private openNote = async (
    file: TFile,
    inNewSplit: boolean
  ): Promise<void> => {
    const leaf = this.app.workspace.getLeaf(inNewSplit ? "split" : false);
    await leaf.openFile(file, { active: true });
    activeFile.setFile(file);
  };
}
