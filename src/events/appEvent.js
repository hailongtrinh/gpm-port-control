import { ipcMain } from "electron";

ipcMain.on("toggle-always-on-top", () => {
  const isAlwaysOnTop = mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(!isAlwaysOnTop);
});
