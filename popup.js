const STORAGE_KEY = "latestAiAutomationModel";
const LEGACY_STORAGE_KEY = "latestLocatorScan";
const FILE_NAME = "ai-test-automation-model.json";

const scanBtn = document.getElementById("scanBtn");
const startCaptureBtn = document.getElementById("startCaptureBtn");
const stopCaptureBtn = document.getElementById("stopCaptureBtn");
const startInteractionBtn = document.getElementById("startInteractionBtn");
const stopInteractionBtn = document.getElementById("stopInteractionBtn");
const clearInteractionBtn = document.getElementById("clearInteractionBtn");
const exportBtn = document.getElementById("exportBtn");
const visibleOnlyInput = document.getElementById("visibleOnly");
const includeHiddenInput = document.getElementById("includeHidden");
const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const previewEl = document.getElementById("preview");

let latestScan = null;
let isCapturing = false;
let isInteractionRecording = false;

function setStatus(message, state = "info") {
  statusEl.textContent = message;
  statusEl.dataset.state = state;
}

function setButtonsBusy(isBusy) {
  scanBtn.disabled = isBusy;
  startCaptureBtn.disabled = isBusy || isCapturing;
  stopCaptureBtn.disabled = isBusy || !isCapturing;
  startInteractionBtn.disabled = isBusy || isInteractionRecording;
  stopInteractionBtn.disabled = isBusy || !isInteractionRecording;
  clearInteractionBtn.disabled = isBusy;
  exportBtn.disabled = isBusy || !latestScan;
  visibleOnlyInput.disabled = isBusy || isCapturing || isInteractionRecording;
  includeHiddenInput.disabled = isBusy || isCapturing || isInteractionRecording;
}

function setCaptureState(active) {
  isCapturing = Boolean(active);
  setButtonsBusy(false);
}

function setInteractionState(active) {
  isInteractionRecording = Boolean(active);
  setButtonsBusy(false);
}

function getScanOptions() {
  return {
    includeHidden: includeHiddenInput.checked
  };
}

function renderSummary(scan) {
  const url = scan?.url || "-";
  const title = scan?.title || "-";
  const totalElements = Number.isInteger(scan?.totalElements) ? scan.totalElements : 0;
  const totalSnapshots = Array.isArray(scan?.snapshots) ? scan.snapshots.length : 0;
  const automationScore = Number.isFinite(scan?.automationReadiness?.score)
    ? scan.automationReadiness.score
    : 0;
  const warningCount = Array.isArray(scan?.warnings)
    ? scan.warnings.reduce((total, warning) => total + (Number(warning.count) || 0), 0)
    : 0;
  const recordedActionsCount = Number.isInteger(scan?.recordedActionsCount)
    ? scan.recordedActionsCount
    : Array.isArray(scan?.recordedActions)
      ? scan.recordedActions.length
      : 0;
  const recordedFlowsCount = Number.isInteger(scan?.recordedFlowsCount)
    ? scan.recordedFlowsCount
    : Array.isArray(scan?.userFlows)
      ? scan.userFlows.length
      : 0;

  summaryEl.innerHTML = `
    <div>
      <dt>Total Elements</dt>
      <dd>${totalElements}</dd>
    </div>
    <div>
      <dt>Total Snapshots</dt>
      <dd>${totalSnapshots}</dd>
    </div>
    <div>
      <dt>Automation Readiness</dt>
      <dd>${automationScore}</dd>
    </div>
    <div>
      <dt>Warning Count</dt>
      <dd>${warningCount}</dd>
    </div>
    <div>
      <dt>Recorded Actions</dt>
      <dd>${recordedActionsCount}</dd>
    </div>
    <div>
      <dt>Recorded Flows</dt>
      <dd>${recordedFlowsCount}</dd>
    </div>
    <div>
      <dt>URL</dt>
      <dd title="${escapeHtml(url)}">${escapeHtml(url)}</dd>
    </div>
    <div>
      <dt>Title</dt>
      <dd title="${escapeHtml(title)}">${escapeHtml(title)}</dd>
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

function sendContentMessage(tabId, type, options = {}) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type, options }, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || "The page did not return data."));
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
  setStatus("Analyzing page DOM for automation model...", "info");

  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      throw new Error("No active tab is available.");
    }

    const scan = await sendContentMessage(tab.id, "LOCATOR_SCAN_PAGE", getScanOptions());
    await setInStorage({ [STORAGE_KEY]: scan });
    renderScan(scan);
    setStatus(`Automation model generated. Found ${scan.totalElements} elements.`, "success");
  } catch (error) {
    setStatus(
      `Scan failed: ${error.message}. Reload the page and try again, or use a normal web page tab.`,
      "error"
    );
  } finally {
    setButtonsBusy(false);
  }
}

async function startCapture() {
  setButtonsBusy(true);
  setStatus("Starting snapshot recording...", "info");

  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      throw new Error("No active tab is available.");
    }

    const result = await sendContentMessage(tab.id, "LOCATOR_CAPTURE_START", getScanOptions());
    setCaptureState(result.active);
    setStatus("Snapshot recording running. Interact with the page, then stop recording.", "success");
  } catch (error) {
    setCaptureState(false);
    setStatus(
      `Snapshot recording failed: ${error.message}. Reload the page and try again, or use a normal web page tab.`,
      "error"
    );
  } finally {
    setButtonsBusy(false);
  }
}

async function stopCapture() {
  setButtonsBusy(true);
  setStatus("Stopping snapshot recording and analyzing page...", "info");

  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      throw new Error("No active tab is available.");
    }

    const result = await sendContentMessage(tab.id, "LOCATOR_CAPTURE_STOP", getScanOptions());
    setCaptureState(result.active);

    if (result.scan) {
      await setInStorage({ [STORAGE_KEY]: result.scan });
      renderScan(result.scan);
    }

    setStatus(`Snapshot recording stopped. Recorded ${result.totalSnapshots || 0} snapshots.`, "success");
  } catch (error) {
    setStatus(`Stop snapshot recording failed: ${error.message}`, "error");
  } finally {
    setButtonsBusy(false);
  }
}

async function startInteractionRecording() {
  setButtonsBusy(true);
  setStatus("Starting interaction recording...", "info");

  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      throw new Error("No active tab is available.");
    }

    const result = await sendContentMessage(tab.id, "LOCATOR_INTERACTION_START", getScanOptions());
    setInteractionState(result.active);
    setStatus("Interaction recording running. Use the page, then stop recording.", "success");
  } catch (error) {
    setInteractionState(false);
    setStatus(
      `Interaction recording failed: ${error.message}. Reload the page and try again, or use a normal web page tab.`,
      "error"
    );
  } finally {
    setButtonsBusy(false);
  }
}

async function stopInteractionRecording() {
  setButtonsBusy(true);
  setStatus("Stopping interaction recording and generating automation model...", "info");

  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      throw new Error("No active tab is available.");
    }

    const result = await sendContentMessage(tab.id, "LOCATOR_INTERACTION_STOP", getScanOptions());
    setInteractionState(result.active);

    if (result.scan) {
      await setInStorage({ [STORAGE_KEY]: result.scan });
      renderScan(result.scan);
    }

    setStatus(
      `Interaction recording stopped. ${result.recordedActionsCount || 0} actions and ${result.recordedFlowsCount || 0} flows recorded.`,
      "success"
    );
  } catch (error) {
    setStatus(`Stop interaction recording failed: ${error.message}`, "error");
  } finally {
    setButtonsBusy(false);
  }
}

async function clearInteractionHistory() {
  setButtonsBusy(true);
  setStatus("Clearing interaction history...", "info");

  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      throw new Error("No active tab is available.");
    }

    const result = await sendContentMessage(tab.id, "LOCATOR_INTERACTION_CLEAR", getScanOptions());
    setInteractionState(result.active);

    if (result.scan) {
      await setInStorage({ [STORAGE_KEY]: result.scan });
      renderScan(result.scan);
    }

    setStatus("Interaction history cleared.", "success");
  } catch (error) {
    setStatus(`Clear interaction history failed: ${error.message}`, "error");
  } finally {
    setButtonsBusy(false);
  }
}

async function exportLatestScan() {
  if (!latestScan) {
    setStatus("No automation model is available to export.", "error");
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
    const stored = await getFromStorage({ [STORAGE_KEY]: null, [LEGACY_STORAGE_KEY]: null });
    const storedScan = stored[STORAGE_KEY] || stored[LEGACY_STORAGE_KEY];
    renderScan(storedScan);
    if (storedScan && !stored[STORAGE_KEY]) {
      await setInStorage({ [STORAGE_KEY]: storedScan });
    }
    setStatus(
      storedScan ? "Loaded previous automation model." : "Ready to generate automation model.",
      "info"
    );
  } catch (error) {
    setStatus(`Unable to load previous scan: ${error.message}`, "error");
  }
}

async function refreshCaptureStatus() {
  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      return;
    }

    const status = await sendContentMessage(tab.id, "LOCATOR_CAPTURE_STATUS", getScanOptions());
    setCaptureState(status.active);
    if (status.active) {
      setStatus(`Snapshot recording running. ${status.totalSnapshots || 0} snapshots recorded.`, "info");
    }
  } catch (_error) {
    setCaptureState(false);
  }
}

async function refreshInteractionStatus() {
  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      return;
    }

    const status = await sendContentMessage(tab.id, "LOCATOR_INTERACTION_STATUS", getScanOptions());
    setInteractionState(status.active);
    if (status.active) {
      setStatus(
        `Interaction recording running. ${status.recordedActionsCount || 0} actions and ${status.recordedFlowsCount || 0} flows recorded.`,
        "info"
      );
    }
  } catch (_error) {
    setInteractionState(false);
  }
}

scanBtn.addEventListener("click", scanCurrentPage);
startCaptureBtn.addEventListener("click", startCapture);
stopCaptureBtn.addEventListener("click", stopCapture);
startInteractionBtn.addEventListener("click", startInteractionRecording);
stopInteractionBtn.addEventListener("click", stopInteractionRecording);
clearInteractionBtn.addEventListener("click", clearInteractionHistory);
exportBtn.addEventListener("click", exportLatestScan);

loadPreviousScan()
  .then(refreshCaptureStatus)
  .then(refreshInteractionStatus);
