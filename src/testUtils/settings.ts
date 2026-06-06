import { defaultSettings, type ISettings } from "src/settings";

export function getDefaultSettings(
  overrides: Partial<ISettings> = {}
): ISettings {
  return {
    ...defaultSettings,
    weekStart: "sunday",
    shouldConfirmBeforeCreate: false,
    wordsPerDot: 50,
    showWeeklyNote: false,
    weeklyNoteFolder: "",
    weeklyNoteFormat: "",
    weeklyNoteTemplate: "",
    ...overrides,
  };
}
