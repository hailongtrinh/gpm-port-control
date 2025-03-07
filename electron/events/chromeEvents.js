import { ipcMain } from "electron";
import { exec } from "child_process";

// Hàm lấy danh sách PID của Chrome
function getChromeRunnings() {
  return new Promise((resolve, reject) => {
    exec('tasklist /FI "IMAGENAME eq chrome.exe" /V', (err, stdout) => {
      if (err) {
        reject(`Lỗi lấy danh sách Chrome: ${err.message}`);
        return;
      }

      let result = stdout
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => {
          return (
            line.includes("- Google Chrome") || line.includes("- GPM-Browser")
          );
        })
        .map((line) => {
          const parts = line.split(/\s+/);
          let profileName = `noname_${parts[1]}`;
          if (line.includes("- GPM-Browser")) {
            const regex = /\d{1,2}:\d{2}:\d{2} (.+?)\s*-/;
            const match = line.match(regex);
            profileName = match ? match[1].trim() : `noname_${parts[1]}`;
          }
          return {
            pid: parts[1],
            profileName: profileName
          };
        });

      resolve(result);
    });
  });
}

// Hàm kiểm tra PID có mở cổng không
function getPortsForPID(pid) {
  return new Promise((resolve, reject) => {
    exec(`netstat -ano | findstr LISTENING | findstr ${pid}`, (err, stdout) => {
      if (err) {
        resolve(false); // Nếu lỗi thì giả định không có port nào
        return;
      }

      let ports = stdout
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.includes("TCP") || line.includes("UDP"))
        .map((line) => {
          const parts = line.split(/\s+/);

          return {
            protocol: parts[0],
            localAddress: parts[1],
            pid: parts[parts.length - 1]
          };
        });

      resolve(ports?.[0] ?? false);
    });
  });
}

ipcMain.on("get-chrome-profiles", async (event) => {
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
