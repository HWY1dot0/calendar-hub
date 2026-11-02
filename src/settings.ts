import {
  App,
  PluginSettingTab,
  Setting,
  TextAreaComponent,
  TextComponent,
} from "obsidian";

import type { FolderRule } from "src/io/folderRules";
import {
  parseFolderRules,
  serializeFolderRules,
  toggleFolderRule,
} from "src/io/folderRules";
import FolderRuleTree from "src/ui/FolderRuleTree.svelte";
import { appHasDailyNotesPluginLoaded } from "obsidian-daily-notes-interface";
import type { ILocaleOverride, IWeekStartOption } from "obsidian-calendar-ui";

import { DEFAULT_MAX_NOTE_DOTS, DEFAULT_WEEK_FORMAT } from "src/constants";
import type { ListGrouping, ListSortOrder } from "src/ui/listViewModel";

import type CalendarPlugin from "./main";

/** What clicking a date or week number with no notes does. */
export type EmptyDateClick = "create" | "confirm" | "select";

export interface ISettings {
  // General
  weekStart: IWeekStartOption;
  localeOverride: ILocaleOverride;
  maxNoteDots: number;
  emptyDateClick: EmptyDateClick;
  shouldShowViewSwitcher: boolean;

  // Folders: one scan scope shared by daily and weekly indexing. Blank is the
  // whole vault; see folderRules.ts for the rule syntax.
  includedFolders: string;

  // Date matching. A blank frontmatter field list turns that source off.
  dailyNoteFrontmatterDateFields: string;
  dailyNoteFilenameDateFormat: string;
  shouldIndexDailyNotesFromCreationDate: boolean;
  weeklyNoteFrontmatterDateFields: string;

  // Weekly notes: the week column, and how new weekly notes are created when
  // Periodic Notes is not providing those settings.
  showWeekNumbers: boolean;
  weeklyNoteFormat: string;
  weeklyNoteTemplate: string;
  weeklyNoteFolder: string;

  // List view state, remembered rather than configured.
  sidebarViewMode: "calendar" | "list";
  listGrouping: ListGrouping;
  listSortOrder: ListSortOrder;
  listFolderFilter: string;
}

const weekdays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const defaultSettings: Readonly<ISettings> = Object.freeze({
  weekStart: "locale",
  localeOverride: "system-default",
  maxNoteDots: DEFAULT_MAX_NOTE_DOTS,
  emptyDateClick: "confirm",
  shouldShowViewSwitcher: true,

  includedFolders: "",

  dailyNoteFrontmatterDateFields: "",
  dailyNoteFilenameDateFormat: "",
  shouldIndexDailyNotesFromCreationDate: false,
  weeklyNoteFrontmatterDateFields: "",

  showWeekNumbers: false,
  weeklyNoteFormat: "",
  weeklyNoteTemplate: "",
  weeklyNoteFolder: "",

  sidebarViewMode: "calendar",
  listGrouping: "month",
  listSortOrder: "desc",
  listFolderFilter: "",
});

/** Settings keys from earlier releases, read once by `migrateSettings`. */
interface LegacySettings {
  wordsPerDot: number;
  shouldCreateNoteOnClick: boolean;
  shouldConfirmBeforeCreate: boolean;
  shouldIndexDailyNotesInAllFolders: boolean;
  dailyNoteIncludedFolders: string;
  shouldIndexDailyNotesFromFrontmatter: boolean;
  showWeeklyNote: boolean;
  shouldIndexWeeklyNotesInAllFolders: boolean;
  weeklyNoteIncludedFolders: string;
  weeklyNoteFilenameDateFormat: string;
  shouldIndexWeeklyNotesFromFrontmatter: boolean;
}

/**
 * Turns whatever `data.json` holds into the current settings shape. Older
 * keys are folded into their replacements so nobody has to reconfigure:
 *
 * - the two click booleans become one `emptyDateClick` choice;
 * - "detect in all folders" off becomes a folder rule pinning the scan to the
 *   Daily Notes folder (`dailyNoteFolder`, from the Daily Notes plugin);
 * - a frontmatter toggle that was off blanks its field list, since a blank
 *   list is how that source is turned off now;
 * - weekly indexing shares the daily scan scope, so its own scope, extra
 *   filename formats and "all folders" switch are dropped.
 *
 * Unknown keys are dropped, so `data.json` ends up holding only live settings.
 */
export function migrateSettings(
  saved: Partial<ISettings & LegacySettings> | null,
  dailyNoteFolder: string
): ISettings {
  const old = saved ?? {};
  const next: ISettings = { ...defaultSettings };

  (Object.keys(defaultSettings) as (keyof ISettings)[]).forEach((key) => {
    if (old[key] !== undefined) {
      (next as unknown as Record<string, unknown>)[key] = old[key];
    }
  });

  if (old.emptyDateClick === undefined) {
    if (old.shouldCreateNoteOnClick === false) {
      next.emptyDateClick = "select";
    } else if (old.shouldConfirmBeforeCreate === false) {
      next.emptyDateClick = "create";
    }
  }

  if (old.includedFolders === undefined) {
    const folder = dailyNoteFolder.trim().replace(/^\/+|\/+$/g, "");
    if (old.shouldIndexDailyNotesInAllFolders === false && folder) {
      next.includedFolders = folder;
    } else if (old.dailyNoteIncludedFolders !== undefined) {
      next.includedFolders = old.dailyNoteIncludedFolders;
    }
  }

  if (old.shouldIndexDailyNotesFromFrontmatter === false) {
    next.dailyNoteFrontmatterDateFields = "";
  } else if (
    old.shouldIndexDailyNotesFromFrontmatter === true &&
    old.dailyNoteFrontmatterDateFields === undefined
  ) {
    next.dailyNoteFrontmatterDateFields = "date, daily_date, calendar_date";
  }

  if (old.shouldIndexWeeklyNotesFromFrontmatter === false) {
    next.weeklyNoteFrontmatterDateFields = "";
  } else if (
    old.shouldIndexWeeklyNotesFromFrontmatter === true &&
    old.weeklyNoteFrontmatterDateFields === undefined
  ) {
    next.weeklyNoteFrontmatterDateFields = "week, weekly_date";
  }

  if (old.showWeekNumbers === undefined && old.showWeeklyNote !== undefined) {
    next.showWeekNumbers = old.showWeeklyNote;
  }

  return next;
}

export function appHasPeriodicNotesPluginLoaded(): boolean {
  const periodicNotes = window.app.plugins.getPlugin("periodic-notes");
  return !!periodicNotes?.settings?.weekly?.enabled;
}

interface FolderRuleTreeComponent {
  $set(props: { rules: FolderRule[] }): void;
  $destroy(): void;
}

type SettingsSection = "general" | "folders" | "date-matching";

const SETTINGS_SECTIONS: { id: SettingsSection; name: string }[] = [
  { id: "general", name: "General" },
  { id: "folders", name: "Folders" },
  { id: "date-matching", name: "Date matching" },
];

export class CalendarSettingsTab extends PluginSettingTab {
  private plugin: CalendarPlugin;
  private folderTreeComponent: FolderRuleTreeComponent | null = null;
  // Kept on the instance so re-rendering and reopening the settings stay on
  // the same section; a fresh session starts on General.
  private activeSection: SettingsSection = "general";
  private sectionButtons = new Map<SettingsSection, HTMLElement>();
  private panelEl: HTMLElement;

  constructor(app: App, plugin: CalendarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  hide(): void {
    this.destroyFolderTree();
  }

  private destroyFolderTree(): void {
    this.folderTreeComponent?.$destroy();
    this.folderTreeComponent = null;
  }

  display(): void {
    this.destroyFolderTree();
    this.containerEl.empty();

    if (!appHasDailyNotesPluginLoaded()) {
      this.containerEl.createDiv("settings-banner", (banner) => {
        banner.createEl("div", {
          cls: "settings-banner-title",
          text: "Daily Notes plugin not enabled",
        });
        banner.createEl("p", {
          cls: "setting-item-description",
          text:
            "Calendar Hub works best with either the Daily Notes plugin or the Periodic Notes plugin.",
        });
      });
    }

    const tabBar = this.containerEl.createDiv({
      cls: "calendar-settings-tabs",
      attr: { role: "tablist" },
    });
    this.sectionButtons.clear();
    SETTINGS_SECTIONS.forEach(({ id, name }) => {
      const button = tabBar.createEl("button", {
        cls: "calendar-settings-tab",
        text: name,
        attr: { role: "tab", type: "button" },
      });
      button.addEventListener("click", () => this.showSection(id));
      this.sectionButtons.set(id, button);
    });
    this.panelEl = this.containerEl.createDiv({
      attr: { role: "tabpanel" },
    });

    this.showSection(this.activeSection);
  }

  private showSection(section: SettingsSection): void {
    this.activeSection = section;
    this.sectionButtons.forEach((button, id) => {
      button.toggleClass("is-active", id === section);
      button.setAttribute("aria-selected", String(id === section));
    });

    this.destroyFolderTree();
    this.panelEl.empty();

    if (section === "general") {
      this.addWeekStartSetting();
      this.addLocaleOverrideSetting();
      this.addMaxNoteDotsSetting();
      this.addEmptyDateClickSetting();
      this.addShowViewSwitcherSetting();
      this.addShowWeekNumbersSetting();

      // Periodic Notes owns weekly-note creation when its weekly notes are
      // enabled; otherwise Calendar Hub needs to know where and how.
      if (
        this.plugin.options.showWeekNumbers &&
        !appHasPeriodicNotesPluginLoaded()
      ) {
        new Setting(this.panelEl).setName("Weekly notes").setHeading();
        this.addWeeklyNoteFormatSetting();
        this.addWeeklyNoteTemplateSetting();
        this.addWeeklyNoteFolderSetting();
      }
    } else if (section === "folders") {
      this.addIncludedFoldersSetting();
    } else {
      // The date sources in precedence order (frontmatter > filename > ctime).
      this.addDailyNoteFrontmatterDateFieldsSetting();
      this.addDailyNoteFilenameDateFormatSetting();
      this.addIndexDailyNotesFromCreationDateSetting();
      if (this.plugin.options.showWeekNumbers) {
        this.addWeeklyNoteFrontmatterDateFieldsSetting();
      }
    }
  }

  addWeekStartSetting(): void {
    const { moment } = window;

    const localizedWeekdays = moment.weekdays();
    // obsidian-calendar-ui stashes the locale's own week start in this global
    // the first time a calendar renders, before applying the user's choice. If
    // no calendar has rendered yet (sidebar collapsed, list mode), moment's
    // locale data is still the untouched default.
    const localeWeekStartNum =
      window._bundledLocaleWeekSpec?.dow ?? moment.localeData().firstDayOfWeek();
    const localeWeekStart = moment.weekdays()[localeWeekStartNum];

    new Setting(this.panelEl)
      .setName("Start week on:")
      .setDesc(
        "Choose what day of the week to start. Select 'Locale default' to use the default specified by moment.js"
      )
      .addDropdown((dropdown) => {
        dropdown.addOption("locale", `Locale default (${localeWeekStart})`);
        localizedWeekdays.forEach((day, i) => {
          dropdown.addOption(weekdays[i], day);
        });
        dropdown.setValue(this.plugin.options.weekStart);
        dropdown.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            weekStart: value as IWeekStartOption,
          }));
        });
      });
  }

  addLocaleOverrideSetting(): void {
    const { moment } = window;

    const sysLocale = navigator.language?.toLowerCase();

    new Setting(this.panelEl)
      .setName("Override locale:")
      .setDesc(
        "Set this if you want to use a locale different from the default"
      )
      .addDropdown((dropdown) => {
        dropdown.addOption("system-default", `Same as system (${sysLocale})`);
        moment.locales().forEach((locale) => {
          dropdown.addOption(locale, locale);
        });
        dropdown.setValue(this.plugin.options.localeOverride);
        dropdown.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            localeOverride: value,
          }));
        });
      });
  }

  addMaxNoteDotsSetting(): void {
    new Setting(this.panelEl)
      .setName("Maximum dots per day")
      .setDesc(
        "How many note dots to show under a day before stopping. Days with more notes still list every note in the agenda below the calendar."
      )
      .addDropdown((dropdown) => {
        for (let count = 1; count <= 5; count += 1) {
          dropdown.addOption(String(count), String(count));
        }
        dropdown.setValue(String(this.plugin.options.maxNoteDots));
        dropdown.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            maxNoteDots: parseInt(value, 10),
          }));
        });
      });
  }

  addEmptyDateClickSetting(): void {
    new Setting(this.panelEl)
      .setName("Clicking a date with no notes")
      .setDesc(
        "What happens when you click a date or week number that has no notes yet. The \"+ New note\" button and the \"Open weekly note\" command always create a note immediately."
      )
      .addDropdown((dropdown) => {
        dropdown.addOption("confirm", "Ask before creating a note");
        dropdown.addOption("create", "Create a note");
        dropdown.addOption("select", "Only select the date");
        dropdown.setValue(this.plugin.options.emptyDateClick);
        dropdown.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            emptyDateClick: value as EmptyDateClick,
          }));
        });
      });
  }

  addShowViewSwitcherSetting(): void {
    new Setting(this.panelEl)
      .setName("Show view switcher in sidebar pane")
      .setDesc(
        "Show the calendar/list switch at the top of the pane when it is docked in a sidebar. Turn it off for a cleaner pane; \"Open calendar view\" still flips the pane back to the calendar, and \"Open list view\" opens the list in its own tab."
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.options.shouldShowViewSwitcher);
        toggle.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            shouldShowViewSwitcher: value,
          }));
        });
      });
  }

  addShowWeekNumbersSetting(): void {
    new Setting(this.panelEl)
      .setName("Show week numbers")
      .setDesc(
        "Add a week-number column to the calendar. Clicking a week number opens or creates that week's note."
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.options.showWeekNumbers);
        toggle.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({ showWeekNumbers: value }));
          this.display(); // show/hide the weekly-note settings
        });
      });
  }

  addWeeklyNoteFormatSetting(): void {
    new Setting(this.panelEl)
      .setName("Weekly note format")
      .setDesc("For more syntax help, refer to format reference")
      .addText((textfield) => {
        textfield.setValue(this.plugin.options.weeklyNoteFormat);
        textfield.setPlaceholder(DEFAULT_WEEK_FORMAT);
        textfield.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({ weeklyNoteFormat: value }));
        });
      });
  }

  addWeeklyNoteTemplateSetting(): void {
    new Setting(this.panelEl)
      .setName("Weekly note template")
      .setDesc(
        "Choose the file you want to use as the template for your weekly notes"
      )
      .addText((textfield) => {
        textfield.setValue(this.plugin.options.weeklyNoteTemplate);
        textfield.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({ weeklyNoteTemplate: value }));
        });
      });
  }

  addWeeklyNoteFolderSetting(): void {
    new Setting(this.panelEl)
      .setName("Weekly note folder")
      .setDesc("New weekly notes will be placed here")
      .addText((textfield) => {
        textfield.setValue(this.plugin.options.weeklyNoteFolder);
        textfield.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({ weeklyNoteFolder: value }));
        });
      });
  }

  addIncludedFoldersSetting(): void {
    let foldersField: TextAreaComponent | null = null;

    new Setting(this.panelEl)
      .setName("Folders to scan")
      .setDesc(
        "Where Calendar Hub looks for notes. Untick \"Whole vault\" and tick the folders you want, or untick folders to leave them out. The same scope applies to daily and weekly notes. The text form is comma-separated folder paths; prefix a path with '-' to exclude its subtree, e.g. '30 Macro, -30 Macro/Archive'; deeper rules win."
      )
      .addTextArea((textarea) => {
        foldersField = textarea;
        textarea.setPlaceholder("Journal, Work/Daily, Projects/Research");
        textarea.setValue(this.plugin.options.includedFolders);
        textarea.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({ includedFolders: value }));
          this.folderTreeComponent?.$set({
            rules: parseFolderRules(value),
          });
        });
      });

    const treeEl = this.panelEl.createDiv("calendar-settings-folder-tree");
    this.folderTreeComponent = new FolderRuleTree({
      target: treeEl,
      props: {
        rules: parseFolderRules(this.plugin.options.includedFolders),
        onToggleFolder: (folder: string) => {
          const next = toggleFolderRule(
            folder,
            parseFolderRules(this.plugin.options.includedFolders)
          );
          const value = serializeFolderRules(next);
          void this.plugin.writeOptions(() => ({ includedFolders: value }));
          this.folderTreeComponent?.$set({ rules: next });
          foldersField?.setValue(value);
        },
      },
    });
  }

  addDailyNoteFrontmatterDateFieldsSetting(): void {
    new Setting(this.panelEl)
      .setName("Frontmatter date fields")
      .setDesc(
        "Comma-separated frontmatter fields to read a note's date from, tried in this order; the first valid date wins and beats any date in the file name. Leave blank to match on file names only. Nested fields can use dot notation, such as calendar.date."
      )
      .addText((textfield) => {
        textfield.setPlaceholder("date, daily_date, calendar_date");
        textfield.setValue(this.plugin.options.dailyNoteFrontmatterDateFields);
        textfield.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            dailyNoteFrontmatterDateFields: value,
          }));
        });
      });
  }

  addDailyNoteFilenameDateFormatSetting(): void {
    const presetFormats = [
      "YYYYMMDD",
      "YYYY-MM-DD",
      "YYYY_MM_DD",
      "YYYY.MM.DD",
      "DD-MM-YYYY",
      "MM-DD-YYYY",
      "YYYYMMDDTHHmmss",
      "YYYYMMDDTHHmmssZZ",
    ];
    let formatField: TextComponent | null = null;

    new Setting(this.panelEl)
      .setName("Date format inside daily note filenames")
      .setDesc(
        "Optional. Calendar Hub already looks for the Daily Notes date format anywhere in the file name. Pick common formats from the dropdown (each pick appends to the list) or type your own comma-separated moment.js formats, such as YYYYMMDD for files like 'meeting 20260529.md', or YYYYMMDDTHHmmssZZ for timestamps like 'sync 20260529T143025Z.md'."
      )
      .addDropdown((dropdown) => {
        dropdown.addOption("", "Add a common format…");
        presetFormats.forEach((format) => {
          dropdown.addOption(format, format);
        });
        dropdown.setValue("");
        dropdown.onChange((value) => {
          if (!value) {
            return;
          }
          const current = this.plugin.options.dailyNoteFilenameDateFormat
            .split(/[,\n]/)
            .map((entry) => entry.trim())
            .filter(Boolean);
          if (!current.includes(value)) {
            const next = [...current, value].join(", ");
            void this.plugin.writeOptions(() => ({
              dailyNoteFilenameDateFormat: next,
            }));
            formatField?.setValue(next);
          }
          dropdown.setValue("");
        });
      })
      .addText((textfield) => {
        formatField = textfield;
        textfield.setPlaceholder("YYYYMMDD");
        textfield.setValue(this.plugin.options.dailyNoteFilenameDateFormat);
        textfield.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            dailyNoteFilenameDateFormat: value,
          }));
        });
      });
  }

  addIndexDailyNotesFromCreationDateSetting(): void {
    new Setting(this.panelEl)
      .setName("Use file creation date fallback")
      .setDesc(
        "When neither the file name nor frontmatter yields a date, map the note to the day the file was created. Creation times are set by your device and can change when files are copied or re-synced, so file name and frontmatter dates always take priority."
      )
      .addToggle((toggle) => {
        toggle.setValue(
          this.plugin.options.shouldIndexDailyNotesFromCreationDate
        );
        toggle.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            shouldIndexDailyNotesFromCreationDate: value,
          }));
        });
      });
  }

  addWeeklyNoteFrontmatterDateFieldsSetting(): void {
    new Setting(this.panelEl)
      .setName("Weekly frontmatter fields")
      .setDesc(
        "Comma-separated frontmatter fields that place a note in a week (a week string or a date both work), tried in this order. Leave blank to match weekly notes on file names only. Nested fields can use dot notation, such as calendar.week."
      )
      .addText((textfield) => {
        textfield.setPlaceholder("week, weekly_date");
        textfield.setValue(this.plugin.options.weeklyNoteFrontmatterDateFields);
        textfield.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            weeklyNoteFrontmatterDateFields: value,
          }));
        });
      });
  }
}
