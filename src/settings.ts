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

import { DEFAULT_MAX_NOTE_DOTS, DEFAULT_WEEK_FORMAT, DEFAULT_WORDS_PER_DOT } from "src/constants";
import type { ListGrouping, ListSortOrder } from "src/ui/listViewModel";

import type CalendarPlugin from "./main";

export interface ISettings {
  wordsPerDot: number;
  maxNoteDots: number;
  shouldShowViewSwitcher: boolean;
  weekStart: IWeekStartOption;
  shouldConfirmBeforeCreate: boolean;
  shouldIndexDailyNotesInAllFolders: boolean;
  dailyNoteFilenameDateFormat: string;
  shouldIndexDailyNotesFromFrontmatter: boolean;
  dailyNoteFrontmatterDateFields: string;
  shouldIndexDailyNotesFromCreationDate: boolean;
  dailyNoteIncludedFolders: string;

  // List view
  sidebarViewMode: "calendar" | "list";
  listGrouping: ListGrouping;
  listSortOrder: ListSortOrder;
  listFolderFilter: string;

  // Weekly Note settings
  showWeeklyNote: boolean;
  weeklyNoteFormat: string;
  weeklyNoteTemplate: string;
  weeklyNoteFolder: string;
  shouldIndexWeeklyNotesInAllFolders: boolean;
  weeklyNoteFilenameDateFormat: string;
  shouldIndexWeeklyNotesFromFrontmatter: boolean;
  weeklyNoteFrontmatterDateFields: string;
  weeklyNoteIncludedFolders: string;

  localeOverride: ILocaleOverride;
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
  shouldConfirmBeforeCreate: true,
  shouldIndexDailyNotesInAllFolders: true,
  dailyNoteFilenameDateFormat: "",
  shouldIndexDailyNotesFromFrontmatter: false,
  dailyNoteFrontmatterDateFields: "date, daily_date, calendar_date",
  shouldIndexDailyNotesFromCreationDate: false,
  dailyNoteIncludedFolders: "",
  sidebarViewMode: "calendar",
  listGrouping: "month",
  listSortOrder: "desc",
  listFolderFilter: "",
  weekStart: "locale",

  wordsPerDot: DEFAULT_WORDS_PER_DOT,
  maxNoteDots: DEFAULT_MAX_NOTE_DOTS,
  shouldShowViewSwitcher: false,

  showWeeklyNote: false,
  weeklyNoteFormat: "",
  weeklyNoteTemplate: "",
  weeklyNoteFolder: "",
  shouldIndexWeeklyNotesInAllFolders: true,
  weeklyNoteFilenameDateFormat: "",
  shouldIndexWeeklyNotesFromFrontmatter: false,
  weeklyNoteFrontmatterDateFields: "week, weekly_date",
  weeklyNoteIncludedFolders: "",

  localeOverride: "system-default",
});

export function appHasPeriodicNotesPluginLoaded(): boolean {
  const periodicNotes = window.app.plugins.getPlugin("periodic-notes");
  return !!periodicNotes?.settings?.weekly?.enabled;
}

interface FolderRuleTreeComponent {
  $set(props: { rules: FolderRule[] }): void;
  $destroy(): void;
}

export class CalendarSettingsTab extends PluginSettingTab {
  private plugin: CalendarPlugin;
  private folderTreeComponent: FolderRuleTreeComponent | null = null;

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

    this.addDefaultViewSetting();
    this.addWeekStartSetting();
    this.addMaxNoteDotsSetting();
    this.addShowViewSwitcherSetting();
    this.addConfirmCreateSetting();

    // Ordered like the matching pipeline: master switch, folder scope, then
    // the date sources in precedence order (frontmatter > filename > ctime).
    new Setting(this.containerEl).setName("Date matching").setHeading();
    this.addIndexDailyNotesInAllFoldersSetting();
    this.addDailyNoteIncludedFoldersSetting();
    this.addIndexDailyNotesFromFrontmatterSetting();
    this.addDailyNoteFrontmatterDateFieldsSetting();
    this.addDailyNoteFilenameDateFormatSetting();
    this.addIndexDailyNotesFromCreationDateSetting();

    new Setting(this.containerEl).setName("Weekly notes").setHeading();
    this.addShowWeeklyNoteSetting();

    if (
      this.plugin.options.showWeeklyNote &&
      !appHasPeriodicNotesPluginLoaded()
    ) {
      this.containerEl.createEl("p", {
        cls: "setting-item-description",
        text:
          "Weekly note support is kept for compatibility. For richer periodic notes, consider using the Periodic Notes plugin.",
      });
      this.addWeeklyNoteFormatSetting();
      this.addWeeklyNoteTemplateSetting();
      this.addWeeklyNoteFolderSetting();
      this.addIndexWeeklyNotesInAllFoldersSetting();
      this.addWeeklyNoteIncludedFoldersSetting();
      this.addWeeklyNoteFilenameDateFormatSetting();
      this.addIndexWeeklyNotesFromFrontmatterSetting();
      this.addWeeklyNoteFrontmatterDateFieldsSetting();
    }

    new Setting(this.containerEl).setName("Advanced").setHeading();
    this.addLocaleOverrideSetting();
  }

  addWeekStartSetting(): void {
    const { moment } = window;

    const localizedWeekdays = moment.weekdays();
    const localeWeekStartNum = window._bundledLocaleWeekSpec.dow;
    const localeWeekStart = moment.weekdays()[localeWeekStartNum];

    new Setting(this.containerEl)
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

  addDefaultViewSetting(): void {
    new Setting(this.containerEl)
      .setName("Default view")
      .setDesc(
        "Which view the Calendar Hub pane opens in. Switching views with the in-pane button also updates this."
      )
      .addDropdown((dropdown) => {
        dropdown.addOption("calendar", "Calendar");
        dropdown.addOption("list", "List");
        dropdown.setValue(this.plugin.options.sidebarViewMode);
        dropdown.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            sidebarViewMode: value as ISettings["sidebarViewMode"],
          }));
        });
      });
  }

  addMaxNoteDotsSetting(): void {
    new Setting(this.containerEl)
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

  addShowViewSwitcherSetting(): void {
    new Setting(this.containerEl)
      .setName("Show view switcher in sidebar panes")
      .setDesc(
        "Calendar Hub mirrors the calendar/list toggle into the top of the pane when it is docked in a sidebar, where Obsidian hides the view header. Off by default; the \"Open list view\" and \"Open calendar view\" commands always work."
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

  addConfirmCreateSetting(): void {
    new Setting(this.containerEl)
      .setName("Confirm before creating new note")
      .setDesc("Show a confirmation modal before creating a new note")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.options.shouldConfirmBeforeCreate);
        toggle.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            shouldConfirmBeforeCreate: value,
          }));
        });
      });
  }

  addIndexDailyNotesInAllFoldersSetting(): void {
    new Setting(this.containerEl)
      .setName("Detect daily notes in all folders")
      .setDesc(
        "Find every Markdown file whose file name matches the daily note format, even outside the configured daily notes folder. Matching notes for the selected date appear below the calendar."
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.options.shouldIndexDailyNotesInAllFolders);
        toggle.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            shouldIndexDailyNotesInAllFolders: value,
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

    new Setting(this.containerEl)
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

  addIndexDailyNotesFromFrontmatterSetting(): void {
    new Setting(this.containerEl)
      .setName("Use frontmatter dates")
      .setDesc(
        "Read the configured frontmatter fields for a date and prefer it over any date in the file name. Notes without a frontmatter date fall back to file name matching."
      )
      .addToggle((toggle) => {
        toggle.setValue(
          this.plugin.options.shouldIndexDailyNotesFromFrontmatter
        );
        toggle.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            shouldIndexDailyNotesFromFrontmatter: value,
          }));
        });
      });
  }

  addDailyNoteFrontmatterDateFieldsSetting(): void {
    new Setting(this.containerEl)
      .setName("Frontmatter date fields")
      .setDesc(
        "Comma-separated field names to read when frontmatter dates are enabled. Fields are tried in this order and the first one with a valid date wins, so put the field you trust most first. Nested fields can use dot notation, such as calendar.date."
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

  addIndexDailyNotesFromCreationDateSetting(): void {
    new Setting(this.containerEl)
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

  addDailyNoteIncludedFoldersSetting(): void {
    let foldersField: TextAreaComponent | null = null;

    new Setting(this.containerEl)
      .setName("Folders to scan for daily notes")
      .setDesc(
        "Optional. Leave blank to scan the whole vault. Tick folders in the tree below or add comma-separated folder paths to limit filename and frontmatter matching. Prefix a path with '-' to exclude its subtree, e.g. '30 Macro, -30 Macro/Archive'; deeper rules win."
      )
      .addTextArea((textarea) => {
        foldersField = textarea;
        textarea.setPlaceholder(
          "Journal, Work/Daily, Projects/Research"
        );
        textarea.setValue(this.plugin.options.dailyNoteIncludedFolders);
        textarea.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            dailyNoteIncludedFolders: value,
          }));
          this.folderTreeComponent?.$set({
            rules: parseFolderRules(value),
          });
        });
      });

    const treeEl = this.containerEl.createDiv("calendar-settings-folder-tree");
    this.folderTreeComponent = new FolderRuleTree({
      target: treeEl,
      props: {
        rules: parseFolderRules(this.plugin.options.dailyNoteIncludedFolders),
        onToggleFolder: (folder: string) => {
          const next = toggleFolderRule(
            folder,
            parseFolderRules(this.plugin.options.dailyNoteIncludedFolders)
          );
          const value = serializeFolderRules(next);
          void this.plugin.writeOptions(() => ({
            dailyNoteIncludedFolders: value,
          }));
          this.folderTreeComponent?.$set({ rules: next });
          foldersField?.setValue(value);
        },
      },
    });
  }

  addShowWeeklyNoteSetting(): void {
    new Setting(this.containerEl)
      .setName("Show week number")
      .setDesc("Enable this to add a column with the week number")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.options.showWeeklyNote);
        toggle.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({ showWeeklyNote: value }));
          this.display(); // show/hide weekly settings
        });
      });
  }

  addWeeklyNoteFormatSetting(): void {
    new Setting(this.containerEl)
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
    new Setting(this.containerEl)
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
    new Setting(this.containerEl)
      .setName("Weekly note folder")
      .setDesc("New weekly notes will be placed here")
      .addText((textfield) => {
        textfield.setValue(this.plugin.options.weeklyNoteFolder);
        textfield.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({ weeklyNoteFolder: value }));
        });
      });
  }

  addIndexWeeklyNotesInAllFoldersSetting(): void {
    new Setting(this.containerEl)
      .setName("Detect weekly notes in all folders")
      .setDesc(
        "Find every Markdown file that resolves to a week, even outside the weekly notes folder. Matching notes for the selected week appear below the calendar."
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.options.shouldIndexWeeklyNotesInAllFolders);
        toggle.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            shouldIndexWeeklyNotesInAllFolders: value,
          }));
        });
      });
  }

  addWeeklyNoteIncludedFoldersSetting(): void {
    new Setting(this.containerEl)
      .setName("Folders to scan for weekly notes")
      .setDesc(
        "Optional. Leave blank to scan the whole vault. Add comma-separated folder paths to limit weekly filename and frontmatter matching. Prefix a path with '-' to exclude its subtree; deeper rules win."
      )
      .addTextArea((textarea) => {
        textarea.setPlaceholder("Journal, Work/Weekly, Reviews");
        textarea.setValue(this.plugin.options.weeklyNoteIncludedFolders);
        textarea.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            weeklyNoteIncludedFolders: value,
          }));
        });
      });
  }

  addWeeklyNoteFilenameDateFormatSetting(): void {
    new Setting(this.containerEl)
      .setName("Week format inside weekly note filenames")
      .setDesc(
        "Optional. Calendar Hub already looks for the weekly note format anywhere in the file name. Add extra comma-separated formats here, such as GGGG-[W]WW for files like 'review 2026-W23.md'."
      )
      .addText((textfield) => {
        textfield.setPlaceholder("GGGG-[W]WW");
        textfield.setValue(this.plugin.options.weeklyNoteFilenameDateFormat);
        textfield.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            weeklyNoteFilenameDateFormat: value,
          }));
        });
      });
  }

  addIndexWeeklyNotesFromFrontmatterSetting(): void {
    new Setting(this.containerEl)
      .setName("Use frontmatter dates for weekly notes")
      .setDesc(
        "Read the configured frontmatter fields for a week and prefer them over the file name (a week string or a date both work). Notes without a frontmatter value fall back to file name matching."
      )
      .addToggle((toggle) => {
        toggle.setValue(
          this.plugin.options.shouldIndexWeeklyNotesFromFrontmatter
        );
        toggle.onChange(async (value) => {
          await this.plugin.writeOptions(() => ({
            shouldIndexWeeklyNotesFromFrontmatter: value,
          }));
        });
      });
  }

  addWeeklyNoteFrontmatterDateFieldsSetting(): void {
    new Setting(this.containerEl)
      .setName("Weekly frontmatter fields")
      .setDesc(
        "Comma-separated field names to read when weekly frontmatter dates are enabled. Fields are tried in this order and the first one with a valid value wins. Nested fields can use dot notation, such as calendar.week."
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

  addLocaleOverrideSetting(): void {
    const { moment } = window;

    const sysLocale = navigator.language?.toLowerCase();

    new Setting(this.containerEl)
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
}
