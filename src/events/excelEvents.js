import { ipcMain, dialog } from "electron";
import * as XLSX from "xlsx";
import * as fs from "fs";
import path from "path";
import { loadConfig, setConfig } from "../config.js";
XLSX.set_fs(fs);

ipcMain.on("select-file", async (event) => {
  try {
    const files = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Excel", extensions: ["xlsx", "xls"] }]
    });
    const { canceled, filePaths } = files;

    if (canceled || filePaths.length === 0) {
      console.log("❌ Người dùng đã hủy chọn file.");
      return;
    }

    const filePath = filePaths[0];
    const fileName = path.basename(filePath);

    console.log(`📂 File được chọn: ${fileName} | ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const parsedData = XLSX.utils.sheet_to_json(sheet);
    const parsedDataArray = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const firstRow = parsedDataArray?.[0] || [];
    setConfig("excelFile", filePath);
    event.reply("excel-data", {
      excelFile: {
        name: fileName,
        path: filePath
      },
      pasteButtonList: firstRow,
      excelData: parsedData
    });
  } catch (error) {
    console.error("❌ Lỗi khi mở file:", error);
    event.reply("error", error.message);
  }
});

ipcMain.on("remove-excel-file", async (event) => {
  setConfig("excelFile", false);
});

ipcMain.on("reload-excel-file", async (event) => {
  try {
    const config = await loadConfig();
    const { excelFile } = config;

    const result = {
      excelFile: false,
      pasteButtonList: [],
      excelData: []
    };

    if (!excelFile || !fs.existsSync(excelFile)) {
      event.reply("excel-data", result);
      return;
    }
    const filePath = excelFile;
    const fileName = path.basename(excelFile);
    const workbook = XLSX.readFile(excelFile);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const parsedData = XLSX.utils.sheet_to_json(sheet);
    const parsedDataArray = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const firstRow = parsedDataArray?.[0] || [];
    event.reply("excel-data", {
      excelFile: {
        name: fileName,
        path: filePath
      },
      pasteButtonList: firstRow,
      excelData: parsedData
    });
  } catch (error) {
    console.error("❌ Lỗi khi mở file:", error);
    event.reply("error", error.message);
  }
});

ipcMain.on("save-excel-data", async (event) => {
  try {
    const profilerunnings = await getChromeRunnings();
    let results = [];

    for (const profile of profilerunnings) {
      const remoteIP = await getPortsForPID(profile.pid);
      if (remoteIP?.localAddress) {
        results.push({
          ...profile,
          remoteIP: remoteIP?.localAddress
        });
      }
    }
    event.reply("chrome-profiles", results);
  } catch (error) {
    return `Lỗi: ${error}`;
  }
});
