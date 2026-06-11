const STORAGE_KEY = "latestLocatorScan";
const FILE_NAME = "element.dom.json";

const scanBtn = document.getElementById("scanBtn");
const exportBtn = document.getElementById("exportBtn");
const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const previewEl = document.getElementById("preview");

let latestScan = null;

function setStatus(message, state = "info") {
  statusEl.textContent = message;
  statusEl.dataset.state = state;
}

function setButtonsBusy(isBusy) {
  scanBtn.disabled = isBusy;
  exportBtn.disabled = isBusy || !latestScan;
}

function renderSummary(scan) {
  const url = scan?.url || "-";
  const title = scan?.title || "-";
  const totalElements = Number.isInteger(scan?.totalElements) ? scan.totalElements : 0;

  summaryEl.innerHTML = `
    <div>
      <dt>URL</dt>
      <dd title="${escapeHtml(url)}">${escapeHtml(url)}</dd>
    </div>
    <div>
      <dt>Title</dt>
      <dd title="${escapeHtml(title)}">${escapeHtml(title)}</dd>
    </div>
    <div>
      <dt>Total elements</dt>
      <dd>${totalElements}</dd>
    </div>
  `;
}

function renderPreview(scan) {
  previewEl.textContent = scan ? JSON.stringify(scan, null, 2) : "(no scan yet)";
}

function renderScan(scan) {
  latestScan = scan || null;
  exportBtn.disabled = !latestScan;
  renderSummary(latestScan);
  renderPreview(latestScan);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFromStorage(defaults) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(defaults, (items) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(items);
    });
  });
}

function setInStorage(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}

function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(tabs[0] || null);
    });
  });
}

function sendScanMessage(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: "LOCATOR_SCAN_PAGE" }, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || "The page did not return scan data."));
        return;
      }
      resolve(response.data);
    });
  });
}

function downloadJson(url) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url,
        filename: FILE_NAME,
        saveAs: false
      },
      (downloadId) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(downloadId);
      }
    );
  });
}

async function scanCurrentPage() {
  setButtonsBusy(true);
  setStatus("Scanning current page...", "info");

  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      throw new Error("No active tab is available.");
    }

    const scan = await sendScanMessage(tab.id);
    await setInStorage({ [STORAGE_KEY]: scan });
    renderScan(scan);
    setStatus(`Scan complete. Found ${scan.totalElements} elements.`, "success");
  } catch (error) {
    setStatus(
      `Scan failed: ${error.message}. Reload the page and try again, or use a normal web page tab.`,
      "error"
    );
  } finally {
    setButtonsBusy(false);
  }
}

async function exportLatestScan() {
  if (!latestScan) {
    setStatus("No scan result is available to export.", "error");
    return;
  }

  const json = JSON.stringify(latestScan, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  try {
    await downloadJson(url);
    setStatus(`Exported ${FILE_NAME}.`, "success");
  } catch (error) {
    setStatus(`Export failed: ${error.message}`, "error");
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function loadPreviousScan() {
  try {
    const stored = await getFromStorage({ [STORAGE_KEY]: null });
    renderScan(stored[STORAGE_KEY]);
    setStatus(stored[STORAGE_KEY] ? "Loaded previous scan." : "Ready to scan.", "info");
  } catch (error) {
    setStatus(`Unable to load previous scan: ${error.message}`, "error");
  }
}

scanBtn.addEventListener("click", scanCurrentPage);
exportBtn.addEventListener("click", exportLatestScan);

loadPreviousScan();
