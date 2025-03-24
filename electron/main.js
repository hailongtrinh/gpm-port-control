import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { loadConfig, setConfig } from "./config.js";
import "./events/index.js"; // Import tất cả các sự kiện

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

app.whenReady().then(async () => {
  const config = await loadConfig();

  mainWindow = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    alwaysOnTop: config.window.alwaysOnTop,
    minWidth: 550,
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  if (!app.isPackaged) {
    // Chạy dev mode
    mainWindow.webContents.openDevTools();
    mainWindow.loadURL("http://localhost:5173");
  } else {
    // Chạy chế độ build
    mainWindow.loadURL(`file://${path.join(__dirname, "../dist/react/index.html")}`);
  }
  ipcMain.on("toggle-always-on-top", () => {
    const isAlwaysOnTop = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!isAlwaysOnTop);
  });

  ipcMain.on("get-config", (event) => {
    event.reply("config-data", config);
  });

  // Ngăn cửa sổ bị đóng trước khi lưu config
  mainWindow.on("close", async (event) => {
    event.preventDefault(); // Chặn đóng cửa sổ ngay lập tức
    console.log(mainWindow);
    const bounds = mainWindow.getBounds();
    console.log(mainWindow.isAlwaysOnTop());

    await setConfig("window.width", bounds.width);
    await setConfig("window.height", bounds.height);
    await setConfig("window.alwaysOnTop", mainWindow.isAlwaysOnTop());
    console.log("✅ Đã lưu config. Đóng cửa sổ...");
    mainWindow.destroy(); // Sau khi lưu xong, mới thực sự đóng cửa sổ
  });
});
