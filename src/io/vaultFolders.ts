import { TFolder } from "obsidian";

import type { FolderNode } from "./folderTree";

/** The vault's folder hierarchy (root excluded), sorted for stable display. */
export function getVaultFolderTree(): FolderNode[] {
  const toNode = (folder: TFolder): FolderNode => ({
    path: folder.path,
    name: folder.name,
    children: folder.children
      .filter((child): child is TFolder => child instanceof TFolder)
      .map(toNode)
      .sort((a, b) => a.name.localeCompare(b.name)),
  });

  return window.app.vault
    .getRoot()
    .children.filter((child): child is TFolder => child instanceof TFolder)
    .map(toNode)
    .sort((a, b) => a.name.localeCompare(b.name));
}
