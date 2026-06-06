import { App, Menu, Point, TFile } from "obsidian";

export function showFileMenu(app: App, file: TFile, position: Point): void {
  const fileMenu = new Menu();
  fileMenu.addItem((item) =>
    item
      .setTitle("Delete")
      .setIcon("trash")
      .onClick(() => {
        app.fileManager.promptForFileDeletion(file);
      })
  );

  app.workspace.trigger(
    "file-menu",
    fileMenu,
    file,
    "calendar-context-menu",
    null
  );
  fileMenu.showAtPosition(position);
}
