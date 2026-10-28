import { ItemView, TFile, WorkspaceLeaf, setIcon } from "obsidian";

import { VIEW_TYPE_CALENDAR, VIEW_TYPE_LIST } from "./constants";
import type CalendarPlugin from "./main";
import type { ISettings } from "./settings";
import ListPanel from "./ui/ListPanel.svelte";
import { activeFile, dailyNotes, settings } from "./ui/stores";

interface ListPanelComponent {
  $destroy(): void;
}

export default class ListView extends ItemView {
  private panel: ListPanelComponent | null = null;
  private navBar: HTMLElement | null = null;
  private plugin: CalendarPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: CalendarPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.registerEvent(
      this.app.workspace.on("layout-change", this.syncNavBarVisibility)
    );
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
    this.addAction("calendar-days", "Open calendar view", openCalendar);

    // Sidebars hide the view header (and with it the action icons), so the
    // jump-back control is mirrored into the pane. Where the header is
    // visible the mirror is redundant and is kept collapsed by
    // syncNavBarVisibility().
    this.navBar = this.contentEl.createDiv("nav-header calendar-hub-nav");
    const navButton = this.navBar
      .createDiv("nav-buttons-container")
      .createDiv({
        cls: "clickable-icon nav-action-button",
        attr: { "aria-label": "Open calendar view" },
      });
    setIcon(navButton, "calendar-days");
    navButton.addEventListener("click", openCalendar);
    this.register(settings.subscribe(this.syncNavBarVisibility));
    this.syncNavBarVisibility();

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
    });
    return Promise.resolve();
  }

  onClose(): Promise<void> {
    this.panel?.$destroy();
    this.panel = null;
    return Promise.resolve();
  }

  /** Mirrors the CalendarView rule: the in-content bar is only a stand-in for
   *  the sidebar's hidden view header, never an extra copy of it. */
  private syncNavBarVisibility = (): void => {
    if (!this.navBar) {
      return;
    }
    const header = this.containerEl.querySelector(".view-header");
    const headerVisible =
      header !== null && getComputedStyle(header).display !== "none";
    this.navBar.classList.toggle(
      "calendar-hub-nav-hidden",
      headerVisible || this.plugin.options?.shouldShowViewSwitcher === false
    );
  };

  private openNote = async (
    file: TFile,
    inNewSplit: boolean
  ): Promise<void> => {
    const leaf = this.app.workspace.getLeaf(inNewSplit ? "split" : false);
    await leaf.openFile(file, { active: true });
    activeFile.setFile(file);
  };
}
