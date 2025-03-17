import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { app } from "electron";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exeDir = app.isPackaged ? path.dirname(app.getPath("exe")) : __dirname;
const configPath = path.join(exeDir, "config.json");

// Giá trị mặc định của config
const defaultConfig = {
  window: {
    width: 600,
    height: 450,
    alwaysOnTop: false
  }
};

// Kiểm tra nếu file config không tồn tại thì tạo file mặc định
export async function ensureConfigFile() {
  try {
    await fs.access(configPath);
  } catch (error) {
    console.log("⚠️ Không tìm thấy config.json, đang tạo file mới...");
    await saveConfig(defaultConfig);
  }
}

// Đọc config từ file JSON
export async function loadConfig() {
  await ensureConfigFile();
  try {
    const data = await fs.readFile(configPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("❌ Lỗi đọc config:", error);
    return defaultConfig;
  }
}

// Lưu config vào file JSON
export async function saveConfig(config) {
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
    console.log("✅ Đã lưu config.");
  } catch (error) {
    console.error("❌ Lỗi lưu config:", error);
  }
}

let isSaving = false;

export async function setConfig(key, value) {
  if (isSaving) return; // Nếu đang lưu, bỏ qua
  isSaving = true;

  try {
    const config = await loadConfig();
    const keys = key.split(".");
    let obj = config;
    while (keys.length > 1) {
      const k = keys.shift();
      if (!obj[k] || typeof obj[k] !== "object") obj[k] = {};
      obj = obj[k];
    }
    obj[keys[0]] = value;

    await saveConfig(config);
    console.log(`✅ Đã cập nhật config: ${key} = ${value}`);
  } catch (error) {
    console.error("❌ Lỗi cập nhật config:", error);
  } finally {
    isSaving = false;
  }
}
