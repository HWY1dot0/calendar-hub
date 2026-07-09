import { TFolder, Vault } from "obsidian";

/** All folder paths in the vault (root excluded), sorted for stable display. */
export function getVaultFolderPaths(): string[] {
  const paths: string[] = [];
  Vault.recurseChildren(window.app.vault.getRoot(), (file) => {
    if (file instanceof TFolder && file.path !== "/") {
      paths.push(file.path);
    }
  });
  return paths.sort((a, b) => a.localeCompare(b));
}
