import { ipcMain } from "electron";
import { exec } from "child_process";
import puppeteer from "puppeteer-core";
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

const connectedBrowsers = {};

const connectBrowser = async (profileName, profileUrl) => {
  try {
    const browser = await puppeteer.connect({
      browserURL: `http://${profileUrl}`,
      defaultViewport: null
    });
    connectedBrowsers[profileName] = browser;
    console.log("Connected to browser:", profileUrl);
  } catch (error) {
    console.error("❌ Connect error:", error);
  }
};

const _newTab = async (profile) => {
  if (!connectedBrowsers[profile.profileName]) {
    await connectBrowser(profile.profileName, profile.remoteIP);
  }
  const browser = connectedBrowsers[profile.profileName];
  const page = await browser.newPage();
  await page.goto("chrome://newtab");
  console.log(`✅ Đã mở Google cho ${profile.profileName}`);
};

const newTab = async (selectedProfiles, isSerial = false, delay = false) => {
  if (isSerial) {
    for (const profile of selectedProfiles) {
      await _newTab(profile);
      if (delay) await new Promise((r) => setTimeout(r, delay * 1000));
    }
    return;
  } else {
    selectedProfiles.forEach(async (profile) => {
      _newTab(profile);
    });
    return;
  }
};

const _closeTab = async (profile) => {
  if (!connectedBrowsers[profile.profileName]) {
    await connectBrowser(profile.profileName, profile.remoteIP);
  }
  const browser = connectedBrowsers[profile.profileName];

  const pages = await browser.pages(); // Lấy tất cả tab
  console.log(`${profile.profileName} có ${pages.length} tab`);

  for (const page of pages) {
    try {
      await page.bringToFront(); // Chuyển tab lên trước
      await new Promise((r) => setTimeout(r, 500)); // Chờ 0.5s để tránh lỗi
      const isActive = await page.evaluate(
        () => document.visibilityState === "visible"
      ); // Kiểm tra tab đang hiện

      if (isActive) {
        await page.close();
        console.log(`✅ Đã đóng tab active của ${profile.profileName}`);
        break;
      }
    } catch (error) {
      console.error("❌ Lỗi khi đóng tab:", error);
    }
  }
};

const closeTab = async (selectedProfiles, isSerial = false, delay = false) => {
  if (isSerial) {
    for (const profile of selectedProfiles) {
      await _closeTab(profile);
      if (delay) await new Promise((r) => setTimeout(r, delay * 1000));
    }
    return;
  } else {
    selectedProfiles.forEach(async (profile) => {
      _closeTab(profile);
    });
    return;
  }
};

const _openUrl = async (profile, url, newTab = false) => {
  if (!connectedBrowsers[profile.profileName]) {
    await connectBrowser(profile.profileName, profile.remoteIP);
  }
  const browser = connectedBrowsers[profile.profileName];
  let page;

  if (newTab) {
    page = await browser.newPage(); // Mở tab mới nếu newTab = true
    console.log("🆕 Đã mở tab mới.");
  } else {
    const pages = await browser.pages();

    // Kiểm tra tab đang active
    for (const p of pages) {
      const isActive = await p.evaluate(() => document.hasFocus());
      if (isActive) {
        page = p;
        break;
      }
    }

    if (!page) {
      console.log("⚠️ Không tìm thấy tab active, dùng tab cuối cùng.");
      page = pages[pages.length - 1] || (await browser.newPage());
    }
  }

  await page.bringToFront(); // Đưa tab lên trước
  await page.goto(url, { waitUntil: "load" }); // Điều hướng đến URL
  console.log(
    `✅ Đã mở ${url} ${newTab ? "trong tab mới" : "trong tab hiện tại"}`
  );
};

const openUrl = async (
  selectedProfiles,
  url,
  newTab = false,
  isSerial = false,
  delay = false
) => {
  if (isSerial) {
    for (const profile of selectedProfiles) {
      await _openUrl(profile, url, newTab);
      if (delay) await new Promise((r) => setTimeout(r, delay * 1000));
    }
    return;
  } else {
    selectedProfiles.forEach(async (profile) => {
      _openUrl(profile, url, newTab);
    });
    return;
  }
};

const _typing = async (profile, text, targetSelector, targetValue) => {
  if (!connectedBrowsers[profile.profileName]) {
    await connectBrowser(profile.profileName, profile.remoteIP);
  }
  const browser = connectedBrowsers[profile.profileName];
  let page;

  const pages = await browser.pages();
  for (const p of pages) {
    const isActive = await p.evaluate(() => document.hasFocus());
    if (isActive) {
      page = p;
      break;
    }
  }

  if (!page) {
    console.log("⚠️ Không tìm thấy tab active, dùng tab cuối cùng.");
    page = pages[pages.length - 1] || (await browser.newPage());
  }

  await page.bringToFront(); // Đưa tab lên trước
  await page.waitForSelector(targetSelector); // Chờ cho đến khi selector xuất hiện
  await page.type(targetSelector, text); // Gõ text vào selector
  console.log(
    `✅ Đã gõ ${text} vào ${targetSelector} của ${profile.profileName}`
  );
  await page.evaluate(
    (targetSelector, targetValue) => {
      document.querySelector(targetSelector).value = targetValue;
    },
    targetSelector,
    targetValue
  );
  console.log(
    `✅ Đã gõ ${targetValue} vào ${targetSelector} của ${profile.profileName}`
  );
};

const typing = async (
  selectedProfiles,
  text,
  targetSelector,
  targetValue,
  isSerial = false,
  delay = false
) => {
  if (isSerial) {
    for (const profile of selectedProfiles) {
      await _typing(profile, text, targetSelector, targetValue);
      if (delay) await new Promise((r) => setTimeout(r, delay * 1000));
    }
    return;
  } else {
    selectedProfiles.forEach(async (profile) => {
      _typing(profile, text, targetSelector, targetValue);
    });
    return;
  }
};

ipcMain.on("actions", (event, data) => {
  const {
    action,
    actionData,
    doActionSerial,
    delayValue,
    selectedProfiles,
    excelData
  } = data;
  console.log(data);

  switch (action) {
    case "newtab":
      newTab(selectedProfiles, doActionSerial, delayValue);
      break;
    case "close_current_tab":
      closeTab(selectedProfiles);
      break;
    case "open_url":
      const url = actionData.url;
      const openInNewTab = actionData?.newTab || false;
      openUrl(selectedProfiles, url, openInNewTab, doActionSerial, delayValue);
      break;
    case "typing":
      const text = actionData.text;
      const targetSelector = actionData.targetSelector;
      const targetValue = actionData.targetValue;
      typing(
        selectedProfiles,
        text,
        targetSelector,
        targetValue,
        doActionSerial,
        delayValue
      );
      break;
    default:
      console.log("Action default");
      break;
  }
});
