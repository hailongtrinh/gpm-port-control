import { exec } from "child_process";
import { ipcMain } from "electron";
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

const _closeTab = async (profile, tabNumber) => {
  if (!connectedBrowsers[profile.profileName]) {
    await connectBrowser(profile.profileName, profile.remoteIP);
  }
  const browser = connectedBrowsers[profile.profileName];

  const pages = await browser.pages(); // Lấy danh sách tab
  console.log(`${profile.profileName} có ${pages.length} tab`);

  let indexToClose;
  if (tabNumber === 0) {
    indexToClose = pages.length - 1; // Đóng tab cuối cùng
  } else {
    indexToClose = tabNumber - 1; // Vì tabNumber = 1 là tab đầu tiên (index = 0)
  }

  if (indexToClose < 0 || indexToClose >= pages.length) {
    console.error(`❌ Tab số ${tabNumber} không hợp lệ`);
    return;
  }

  try {
    const pageToClose = pages[indexToClose]; // Lấy tab theo index
    await pageToClose.bringToFront(); // Chuyển tab lên trước (không bắt buộc)
    await new Promise((r) => setTimeout(r, 500)); // Chờ 0.5s để tránh lỗi
    await pageToClose.close(); // Đóng tab
    _switchTab(profile, 0); // Chuyển về tab cuối cùng
    console.log(`✅ Đã đóng tab số ${tabNumber} của ${profile.profileName}`);
  } catch (error) {
    console.error(`❌ Lỗi khi đóng tab số ${tabNumber}:`, error);
  }
};

const closeTab = async (
  selectedProfiles,
  tabNumber = 0,
  isSerial = false,
  delay = false
) => {
  if (isSerial) {
    for (const profile of selectedProfiles) {
      await _closeTab(profile, tabNumber);
      if (delay) await new Promise((r) => setTimeout(r, delay * 1000));
    }
    return;
  } else {
    selectedProfiles.forEach(async (profile) => {
      _closeTab(profile, tabNumber);
    });
    return;
  }
};

const _switchTab = async (profile, tabNumber) => {
  if (!connectedBrowsers[profile.profileName]) {
    await connectBrowser(profile.profileName, profile.remoteIP);
  }
  const browser = connectedBrowsers[profile.profileName];

  const pages = await browser.pages(); // Lấy danh sách tab
  console.log(`${profile.profileName} có ${pages.length} tab`);

  let indexToSwitch;
  if (tabNumber === 0) {
    indexToSwitch = pages.length - 1; // Chuyển sang tab cuối cùng
  } else {
    indexToSwitch = tabNumber - 1; // Vì tabNumber = 1 là tab đầu tiên (index = 0)
  }

  if (indexToSwitch < 0 || indexToSwitch >= pages.length) {
    console.error(`❌ Tab số ${tabNumber} không hợp lệ`);
    return;
  }

  try {
    const pageToSwitch = pages[indexToSwitch]; // Lấy tab theo index
    await pageToSwitch.bringToFront(); // Chuyển tab lên trước
    console.log(
      `✅ Đã chuyển sang tab số ${tabNumber} của ${profile.profileName}`
    );
    return pageToSwitch;
  } catch (error) {
    console.error(`❌ Lỗi khi chuyển tab số ${tabNumber}:`, error);
  }
};

const switchTab = async (
  selectedProfiles,
  tabNumber = 0,
  isSerial = false,
  delay = false
) => {
  if (isSerial) {
    for (const profile of selectedProfiles) {
      await _switchTab(profile, tabNumber);
      if (delay) await new Promise((r) => setTimeout(r, delay * 1000));
    }
    return;
  } else {
    selectedProfiles.forEach(async (profile) => {
      _switchTab(profile, tabNumber);
    });
    return;
  }
};

const _openUrl = async (profile, url, newTab = false, tabNumber = 0) => {
  if (!connectedBrowsers[profile.profileName]) {
    await connectBrowser(profile.profileName, profile.remoteIP);
  }
  const browser = connectedBrowsers[profile.profileName];
  let page;

  if (newTab) {
    page = await browser.newPage(); // Mở tab mới nếu newTab = true
    console.log("🆕 Đã mở tab mới.");
    await page.bringToFront(); // Đưa tab lên trước
  } else {
    page = await _switchTab(profile, tabNumber); // Chuyển đến tab cũ nếu newTab = false
  }

  await page.goto(url, { waitUntil: "load" }); // Điều hướng đến URL
  console.log(
    `✅ Đã mở ${url} ${newTab ? "trong tab mới" : "trong tab hiện tại"}`
  );
};

const openUrl = async (
  selectedProfiles,
  url,
  newTab = false,
  tabNumber = 0,
  isSerial = false,
  delay = false
) => {
  if (isSerial) {
    for (const profile of selectedProfiles) {
      await _openUrl(profile, url, newTab, tabNumber);
      if (delay) await new Promise((r) => setTimeout(r, delay * 1000));
    }
    return;
  } else {
    selectedProfiles.forEach(async (profile) => {
      _openUrl(profile, url, newTab, tabNumber);
    });
    return;
  }
};

const _typing = async (
  profile,
  text,
  selectorType,
  selectorValue,
  pastingMode = true,
  tabNumber = 0
) => {
  try {
    const page = await _switchTab(profile, tabNumber);

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
  tabNumber = 0,
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
        pastingMode,
        tabNumber
      );
      if (delay) await new Promise((r) => setTimeout(r, delay * 1000));
    }
    return;
  } else {
    selectedProfiles.forEach(async (profile) => {
      if (typeof text === "object") {
        textValue = text?.[profile.profileName] ?? "";
      }
      _typing(
        profile,
        textValue,
        targetSelector,
        targetValue,
        pastingMode,
        tabNumber
      );
    });
    return;
  }
};

const copyData = {};

const _interact = async (
  event,
  profile,
  action,
  targetSelector,
  targetValue,
  tabNumber = 0
) => {
  try {
    const page = await _switchTab(profile, tabNumber);

    // Chống bị phát hiện là bot
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    let elementHandle = null;

    // 🔹 Tìm phần tử theo loại selector
    switch (targetSelector) {
      case "xpath":
        console.log(`🔍 Đang tìm XPath: ${targetValue}`);
        elementHandle = await page.evaluateHandle((xpath) => {
          const result = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          );
          return result.singleNodeValue;
        }, targetValue);
        break;
      case "id":
        console.log(`🔍 Đang tìm ID: ${targetValue}`);
        elementHandle = await page.$(`#${targetValue}`);
        break;
      case "name":
        console.log(`🔍 Đang tìm Name: ${targetValue}`);
        elementHandle = await page.$(`[name="${targetValue}"]`);
        break;
      case "css":
        console.log(`🔍 Đang tìm CSS Selector: ${targetValue}`);
        elementHandle = await page.$(targetValue);
        break;
      default:
        console.error(`❌ Loại selector không hợp lệ: ${targetSelector}`);
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

    switch (action) {
      case "copy":
        const copiedText = await page.evaluate(
          (el) => el.innerText || el.textContent,
          elementHandle
        );
        copyData[profile.profileName] = copiedText;
        console.log(
          `[${profile.profileName}]📋 Đã copy nội dung: "${copiedText}"`
        );
        event.reply("copy-data", copyData);
        break;
      case "click":
        await elementHandle.click();
        console.log(`✅ Đã click vào ${targetSelector} = "${targetValue}"`);
        break;
      case "focus":
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(
      `❌ Lỗi khi tương tác với ${targetSelector} "${targetValue}":`,
      error
    );
  }
};

const interact = async (
  event,
  selectedProfiles,
  action,
  targetSelector,
  targetValue,
  tabNumber = 0,
  isSerial = false,
  delay = false
) => {
  if (isSerial) {
    for (const profile of selectedProfiles) {
      await _interact(
        event,
        profile,
        action,
        targetSelector,
        targetValue,
        tabNumber
      );
      if (delay) await new Promise((r) => setTimeout(r, delay * 1000));
    }
    return;
  } else {
    selectedProfiles.forEach(async (profile) => {
      _interact(event, profile, action, targetSelector, targetValue, tabNumber);
    });
    return;
  }
};

ipcMain.on("actions", (event, data) => {
  const { action, actionData, doActionSerial, delayValue, selectedProfiles } =
    data;
  console.log(data);

  switch (action) {
    case "new_tab":
      newTab(selectedProfiles, doActionSerial, delayValue);
      break;
    case "close_tab":
      const closeTabNumber = actionData?.tabNumber || 0;
      closeTab(selectedProfiles, closeTabNumber, doActionSerial, delayValue);
      break;
    case "switch_tab":
      const switchTabNumber = actionData?.tabNumber || 0;
      switchTab(selectedProfiles, switchTabNumber, doActionSerial, delayValue);
      break;
    case "open_url":
      const openTabNumber = actionData?.tabNumber || 0;
      const url = actionData.url;
      const openInNewTab = actionData?.newTab || false;
      openUrl(
        selectedProfiles,
        url,
        openInNewTab,
        openTabNumber,
        doActionSerial,
        delayValue
      );
      break;
    case "typing":
      const typeTabNumber = actionData?.tabNumber || 0;
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
        typeTabNumber,
        doActionSerial,
        delayValue
      );
      break;
    case "interact":
      const interactionTabNumber = actionData?.tabNumber || 0;
      const interactionAction = actionData.interactionAction;
      const interactionSelector = actionData.interactionSelector;
      const interactionTarget = actionData.interactionTarget;
      interact(
        event,
        selectedProfiles,
        interactionAction,
        interactionSelector,
        interactionTarget,
        interactionTabNumber,
        doActionSerial,
        delayValue
      );
      console.log("Interact action", copyData);

      break;
    default:
      console.log("Action default");
      break;
  }
});
