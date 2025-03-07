import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import "./events/index.js"; // Import tất cả các sự kiện

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === "development";

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.loadURL("http://localhost:5173");
});
