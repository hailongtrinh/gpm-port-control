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

const _typing = async (
  profile,
  text,
  selectorType,
  selectorValue,
  pastingMode = true
) => {
  try {
    if (!connectedBrowsers[profile.profileName]) {
      await connectBrowser(profile.profileName, profile.remoteIP);
    }
    const browser = connectedBrowsers[profile.profileName];
    let page;

    const pages = await browser.pages();
    if (pages.length === 0) {
      console.error("⚠️ Không có tab nào mở. Mở tab mới...");
      page = await browser.newPage();
    } else {
      for (const p of pages) {
        const isActive = await p.evaluate(() => document.hasFocus());
        if (isActive) {
          page = p;
          break;
        }
      }
      if (!page) page = pages[pages.length - 1]; // Nếu không tìm thấy tab active, lấy tab cuối cùng
    }

    await page.bringToFront();

    // Chống bị phát hiện là bot
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    let elementHandle = null;

    // 🔹 Tìm phần tử theo loại selector
    switch (selectorType) {
      case "xpath":
        console.log(`🔍 Đang tìm XPath: ${selectorValue}`);
        elementHandle = await page.evaluateHandle((xpath) => {
          const result = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          );
          return result.singleNodeValue;
        }, selectorValue);
        break;
      case "id":
        console.log(`🔍 Đang tìm ID: ${selectorValue}`);
        elementHandle = await page.$(`#${selectorValue}`);
        break;
      case "name":
        console.log(`🔍 Đang tìm Name: ${selectorValue}`);
        elementHandle = await page.$(`[name="${selectorValue}"]`);
        break;
      case "css":
        console.log(`🔍 Đang tìm CSS Selector: ${selectorValue}`);
        elementHandle = await page.$(selectorValue);
        break;
      default:
        console.error(`❌ Loại selector không hợp lệ: ${selectorType}`);
        return;
    }

    if (!elementHandle) {
      console.error(
        `❌ Không tìm thấy phần tử: ${selectorType} = "${selectorValue}"`
      );
      return;
    }

    // Mô phỏng di chuột trước khi click
    const box = await elementHandle.boundingBox();
    if (box) {
      await page.mouse.move(
        box.x + box.width / 2 + Math.random() * 5,
        box.y + box.height / 2 + Math.random() * 5
      );
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 300 + 200)
      );
    }

    // Click vào input trước khi nhập
    await elementHandle.click({
      clickCount: 3,
      delay: Math.random() * 100 + 50
    }); // Chọn toàn bộ nội dung
    await page.keyboard.press("Backspace"); // Xóa sạch nội dung hiện tại

    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 300 + 200)
    );

    if (pastingMode) {
      // 📝 Dán nội dung trực tiếp bằng evaluate()
      console.log(
        `📋 Paste "${text}" vào ${selectorType} = "${selectorValue}"`
      );
      await page.evaluate(
        (el, value) => {
          el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        },
        elementHandle,
        text
      );
    } else {
      // ⌨️ Gõ từng ký tự (mặc định)
      console.log(
        `⌨️ Typing "${text}" vào ${selectorType} = "${selectorValue}"`
      );
      await elementHandle.type(text, { delay: Math.random() * 200 + 50 });
    }
  } catch (error) {
    console.error(
      `❌ Lỗi khi nhập liệu vào ${selectorType} = "${selectorValue}":`,
      error
    );
  }
};

const typing = async (
  selectedProfiles,
  text,
  targetSelector,
  targetValue,
  pastingMode = true,
  isSerial = false,
  delay = false
) => {
  let textValue = text;
  if (isSerial) {
    for (const profile of selectedProfiles) {
      if (typeof text === "object") {
        textValue = text?.[profile.profileName] ?? "";
      }
      await _typing(
        profile,
        textValue,
        targetSelector,
        targetValue,
        pastingMode
      );
      if (delay) await new Promise((r) => setTimeout(r, delay * 1000));
    }
    return;
  } else {
    selectedProfiles.forEach(async (profile) => {
      if (typeof text === "object") {
        textValue = text?.[profile.profileName] ?? "";
      }
      _typing(profile, textValue, targetSelector, targetValue, pastingMode);
    });
    return;
  }
};

ipcMain.on("actions", (event, data) => {
  const { action, actionData, doActionSerial, delayValue, selectedProfiles } =
    data;
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
      const pastingMode = actionData.pastingMode;
      typing(
        selectedProfiles,
        text,
        targetSelector,
        targetValue,
        pastingMode,
        doActionSerial,
        delayValue
      );
      break;
    default:
      console.log("Action default");
      break;
  }
});
