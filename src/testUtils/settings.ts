import { defaultSettings, type ISettings } from "src/settings";

export function getDefaultSettings(
  overrides: Partial<ISettings> = {}
): ISettings {
  return {
    ...defaultSettings,
    weekStart: "sunday",
    emptyDateClick: "create",
    showWeekNumbers: false,
    weeklyNoteFolder: "",
    weeklyNoteFormat: "",
    weeklyNoteTemplate: "",
    ...overrides,
  };
}
