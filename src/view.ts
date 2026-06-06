import type { Moment } from "./obsidian-moment";
import { getDailyNoteSettings } from "obsidian-daily-notes-interface";
import { FileView, TAbstractFile, TFile, ItemView, WorkspaceLeaf } from "obsidian";
import { get } from "svelte/store";

import { TRIGGER_ON_OPEN, VIEW_TYPE_CALENDAR } from "src/constants";
import { getDayDateFromFile, tryToCreateDailyNote } from "src/io/dailyNotes";
import { getDailyNotesForDate } from "src/io/dailyNoteIndex";
import {
  getWeekDateFromFile,
  getWeeklyNote,
  getWeeklyNotesForDate,
  getWeeklyNoteSettings,
  tryToCreateWeeklyNote,
} from "src/io/weeklyNotes";
import type { ISettings } from "src/settings";
import type CalendarPlugin from "./main";

import Calendar from "./ui/Calendar.svelte";
import { showFileMenu } from "./ui/fileMenu";
import {
  activeFile,
  dailyNotes,
  dailyNotesByDate,
  weeklyNotes,
  weeklyNotesByDate,
  settings,
} from "./ui/stores";
import {
  customTagsSource,
  noteCountSource,
  streakSource,
  tasksSource,
} from "./ui/sources";

// The calendar is a Svelte component; `.svelte` imports are untyped in the
// TypeScript program, so describe the small surface the view actually uses.
interface CalendarComponent {
  tick(): void;
  $set(props: { displayedMonth?: Moment }): void;
  $destroy(): void;
}

export default class CalendarView extends ItemView {
  private calendar: CalendarComponent;
  private plugin: CalendarPlugin;
  private settings: ISettings;

  constructor(leaf: WorkspaceLeaf, plugin: CalendarPlugin) {
    super(leaf);
    this.plugin = plugin;

    this.registerEvent(
      this.app.workspace.on(
        "periodic-notes:settings-updated",
        this.onNoteSettingsUpdate
      )
    );
    this.registerEvent(this.app.vault.on("create", this.onFileCreated));
    this.registerEvent(this.app.vault.on("delete", this.onFileDeleted));
    this.registerEvent(this.app.vault.on("modify", this.onFileModified));
    this.registerEvent(this.app.vault.on("rename", this.onFileRenamed));
    this.registerEvent(this.app.workspace.on("file-open", this.onFileOpen));

    this.settings = null;
    settings.subscribe((val) => {
      this.settings = val;

      // Refresh the calendar if settings change
      if (this.calendar) {
        this.calendar.tick();
      }
    });
  }

  getViewType(): string {
    return VIEW_TYPE_CALENDAR;
  }

  getDisplayText(): string {
    return "Calendar Hub";
  }

  getIcon(): string {
    return "calendar-with-checkmark";
  }

  onClose(): Promise<void> {
    if (this.calendar) {
      this.calendar.$destroy();
    }
    return Promise.resolve();
  }

  onOpen(): Promise<void> {
    // Integration point: external plugins can listen for
    // `calendar-hub:open` to feed in additional sources.
    const sources = [
      customTagsSource,
      streakSource,
      noteCountSource,
      tasksSource,
    ];
    this.app.workspace.trigger(TRIGGER_ON_OPEN, sources);

    this.calendar = new Calendar({
      target: this.contentEl,
      props: {
        onClickDay: this.openOrCreateDailyNote,
        onClickWeek: this.openOrCreateWeeklyNote,
        onHoverDay: this.onHoverDay,
        onHoverWeek: this.onHoverWeek,
        onContextMenuDay: this.onContextMenuDay,
        onContextMenuWeek: this.onContextMenuWeek,
        onOpenDayNote: this.openDailyNoteFile,
        onUpdateSettings: this.updateSettings,
        sources,
      },
    }) as unknown as CalendarComponent;

    return Promise.resolve();
  }

  onHoverDay = (
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed: boolean
  ): void => {
    if (!isMetaPressed) {
      return;
    }
    const { format } = getDailyNoteSettings();
    const note = this.getDailyNotes(date)[0];
    this.app.workspace.trigger(
      "link-hover",
      this,
      targetEl,
      date.format(format),
      note?.path
    );
  };

  onHoverWeek = (
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed: boolean
  ): void => {
    if (!isMetaPressed) {
      return;
    }
    const note = getWeeklyNote(date, get(weeklyNotes));
    const { format } = getWeeklyNoteSettings();
    this.app.workspace.trigger(
      "link-hover",
      this,
      targetEl,
      date.format(format),
      note?.path
    );
  };

  private onContextMenuDay = (date: Moment, event: MouseEvent): void => {
    const note = this.getDailyNotes(date)[0];
    if (!note) {
      // If no file exists for a given day, show nothing.
      return;
    }
    showFileMenu(this.app, note, {
      x: event.pageX,
      y: event.pageY,
    });
  };

  private onContextMenuWeek = (date: Moment, event: MouseEvent): void => {
    const note = getWeeklyNote(date, get(weeklyNotes));
    if (!note) {
      // If no file exists for a given day, show nothing.
      return;
    }
    showFileMenu(this.app, note, {
      x: event.pageX,
      y: event.pageY,
    });
  };

  private onNoteSettingsUpdate = (): void => {
    dailyNotes.reindex();
    weeklyNotes.reindex();
    this.updateActiveFile();
  };

  private onFileDeleted = (file: TAbstractFile): void => {
    const refreshedDaily = this.refreshCustomDailyNoteIndex(file);
    if (!(file instanceof TFile)) {
      return;
    }
    if (!refreshedDaily && getDayDateFromFile(file)) {
      dailyNotes.reindex();
      this.updateActiveFile();
    }
    if (
      this.settings?.shouldIndexWeeklyNotesInAllFolders ||
      getWeekDateFromFile(file)
    ) {
      weeklyNotes.reindex();
      this.updateActiveFile();
    }
  };

  private onFileModified = (file: TAbstractFile): void => {
    const refreshedDaily = this.refreshCustomDailyNoteIndex(file);
    if (!(file instanceof TFile)) {
      return;
    }
    if (this.settings?.shouldIndexWeeklyNotesInAllFolders) {
      weeklyNotes.reindex();
      if (this.calendar) {
        this.calendar.tick();
      }
      return;
    }
    if (refreshedDaily) {
      return;
    }
    const date = getDayDateFromFile(file) || getWeekDateFromFile(file);
    if (date && this.calendar) {
      this.calendar.tick();
    }
  };

  private onFileCreated = (file: TAbstractFile): void => {
    if (!this.app.workspace.layoutReady || !this.calendar) {
      return;
    }
    const refreshedDaily = this.refreshCustomDailyNoteIndex(file);
    if (!(file instanceof TFile)) {
      return;
    }
    if (!refreshedDaily && getDayDateFromFile(file)) {
      dailyNotes.reindex();
      this.calendar.tick();
    }
    if (
      this.settings?.shouldIndexWeeklyNotesInAllFolders ||
      getWeekDateFromFile(file)
    ) {
      weeklyNotes.reindex();
      this.calendar.tick();
    }
  };

  private onFileRenamed = (file: TAbstractFile, oldPath: string): void => {
    if (
      this.app.workspace.layoutReady &&
      this.calendar &&
      (this.isMarkdownFile(file) || oldPath.endsWith(".md"))
    ) {
      dailyNotes.reindex();
      weeklyNotes.reindex();
      this.updateActiveFile();
      this.calendar.tick();
    }
  };

  public onFileOpen = (): void => {
    if (this.app.workspace.layoutReady) {
      this.updateActiveFile();
    }
  };

  private updateActiveFile(): void {
    const view = this.app.workspace.getActiveViewOfType(FileView);
    activeFile.setFile(view?.file ?? null);

    if (this.calendar) {
      this.calendar.tick();
    }
  }

  public revealActiveNote(): void {
    const { moment } = window;
    const view = this.app.workspace.getActiveViewOfType(FileView);
    if (!view?.file) {
      return;
    }

    // Check to see if the active note is a daily-note
    let date = getDayDateFromFile(view.file);
    if (date) {
      this.calendar.$set({ displayedMonth: date });
      return;
    }

    // Check to see if the active note is a weekly-note
    const { format } = getWeeklyNoteSettings();
    date = moment(view.file.basename, format, true);
    if (date.isValid()) {
      this.calendar.$set({ displayedMonth: date });
    }
  }

  openOrCreateWeeklyNote = async (
    date: Moment,
    inNewSplit: boolean
  ): Promise<void> => {
    const existingFiles = this.getWeeklyNotes(date);

    if (!existingFiles.length) {
      const startOfWeek = date.clone().startOf("week");
      void tryToCreateWeeklyNote(
        startOfWeek,
        inNewSplit,
        this.settings,
        (file) => {
          activeFile.setFile(file);
        }
      );
      return;
    }

    if (existingFiles.length > 1) {
      // Multiple notes for the week — surfaced in the panel below the calendar.
      return;
    }

    await this.openDailyNoteFile(existingFiles[0], inNewSplit);
  };

  private getWeeklyNotes(date: Moment): TFile[] {
    return getWeeklyNotesForDate(date, get(weeklyNotesByDate), get(weeklyNotes));
  }

  openOrCreateDailyNote = async (
    date: Moment,
    inNewSplit: boolean
  ): Promise<void> => {
    const existingFiles = this.getDailyNotes(date);
    if (!existingFiles.length) {
      // File doesn't exist
      void tryToCreateDailyNote(
        date,
        inNewSplit,
        this.settings,
        (dailyNote: TFile) => {
          activeFile.setFile(dailyNote);
        }
      );
      return;
    }

    if (existingFiles.length > 1) {
      return;
    }

    await this.openDailyNoteFile(existingFiles[0], inNewSplit);
  };

  private getDailyNotes(date: Moment): TFile[] {
    return getDailyNotesForDate(date, get(dailyNotesByDate), get(dailyNotes));
  }

  private updateSettings = async (
    changeOpts: (settings: ISettings) => Partial<ISettings>
  ): Promise<void> => {
    await this.plugin.writeOptions(changeOpts);
    if (this.calendar) {
      this.calendar.tick();
    }
  };

  private refreshCustomDailyNoteIndex(file: TAbstractFile): boolean {
    if (
      !this.app.workspace.layoutReady ||
      !this.calendar ||
      !this.settings?.shouldIndexDailyNotesInAllFolders ||
      !this.isMarkdownFile(file)
    ) {
      return false;
    }

    dailyNotes.reindex();
    this.updateActiveFile();
    this.calendar.tick();
    return true;
  }

  private isMarkdownFile(file: TAbstractFile): file is TFile {
    return file instanceof TFile && file.extension === "md";
  }

  private openDailyNoteFile = async (
    existingFile: TFile,
    inNewSplit: boolean
  ): Promise<void> => {
    const { workspace } = this.app;

    const leaf = workspace.getLeaf(inNewSplit ? "split" : false);
    await leaf.openFile(existingFile, { active: true });

    activeFile.setFile(existingFile);
  };
}
