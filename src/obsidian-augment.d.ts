import "obsidian";
import type { EventRef, TFile } from "obsidian";
import type { ISettings } from "./settings";

/**
 * Minimal typings for the Obsidian internals Calendar Hub touches that are not
 * part of the public `obsidian` API. Declaring them here removes the `any`
 * casts at each call site while keeping the surface intentionally small.
 */
declare module "obsidian" {
  interface App {
    plugins: ObsidianPlugins;
  }

  interface Vault {
    getConfig(key: string): unknown;
  }

  interface FileManager {
    promptForFileDeletion(file: TFile): void;
  }

  interface Workspace {
    on(
      name: "periodic-notes:settings-updated",
      callback: () => void
    ): EventRef;
  }
}

interface ObsidianPlugins {
  enabledPlugins: Set<string>;
  getPlugin(id: string): CommunityPluginInstance | null;
}

interface CommunityPluginInstance {
  options?: Partial<ISettings>;
  settings?: PeriodicNotesSettings;
}

interface PeriodicNotesSettings {
  weekly?: {
    enabled?: boolean;
    format?: string;
    folder?: string;
    template?: string;
  };
}
