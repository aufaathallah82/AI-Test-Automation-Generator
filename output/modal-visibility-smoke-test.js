const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const fixtureDir = __dirname;
const fixtureFile = "modal-visibility-fixture.html";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const headed = process.argv.includes("--headed");
const forceHarness = process.argv.includes("--harness");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForProcessExit(child, timeoutMs = 5000) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

function startFixtureServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const filePath = path.join(fixtureDir, path.basename(url.pathname) || fixtureFile);

    if (!filePath.startsWith(fixtureDir) || !fs.existsSync(filePath)) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(fs.readFileSync(filePath));
  });

  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

async function getJson(debugPort, route) {
  const response = await fetch(`http://127.0.0.1:${debugPort}${route}`);
  if (!response.ok) {
    throw new Error(`CDP ${route} failed with HTTP ${response.status}`);
  }
  return response.json();
}

async function waitForTarget(debugPort, predicate, label, timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const targets = await getJson(debugPort, "/json/list").catch(() => []);
    const target = targets.find(predicate);
    if (target) {
      return target;
    }
    await delay(150);
  }

  const targets = await getJson(debugPort, "/json/list").catch(() => []);
  throw new Error(`Timed out waiting for ${label}. Targets: ${targets.map((target) => `${target.type}:${target.url}`).join(", ")}`);
}

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.socket = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.webSocketUrl);
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
      this.socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        if (!message.id || !this.pending.has(message.id)) {
          return;
        }

        const { resolve: resolvePending, reject: rejectPending } = this.pending.get(message.id);
        this.pending.delete(message.id);

        if (message.error) {
          rejectPending(new Error(`${message.error.message}: ${message.error.data || ""}`));
          return;
        }

        resolvePending(message);
      });
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(payload);
    });
  }

  close() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }
}

async function evaluate(client, expression) {
  const response = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });

  if (response.result.exceptionDetails) {
    throw new Error(response.result.exceptionDetails.text || "Runtime.evaluate failed");
  }

  return response.result.result.value;
}

async function waitForExtensionBackgroundTarget(debugPort, timeoutMs = 15000) {
  const startedAt = Date.now();
  const seenTargets = [];

  while (Date.now() - startedAt < timeoutMs) {
    const targets = await getJson(debugPort, "/json/list").catch(() => []);
    const candidates = targets.filter(
      (target) =>
        ["service_worker", "background_page"].includes(target.type) &&
        target.url.startsWith("chrome-extension://") &&
        target.webSocketDebuggerUrl
    );

    for (const target of candidates) {
      const client = new CdpClient(target.webSocketDebuggerUrl);
      try {
        await client.connect();
        await client.send("Runtime.enable");
        const manifestName = await evaluate(
          client,
          `chrome.runtime && chrome.runtime.getManifest ? chrome.runtime.getManifest().name : ""`
        );
        seenTargets.push(`${target.type}:${target.url}:${manifestName || "unknown"}`);
        if (manifestName === "AI Test Automation Generator") {
          client.close();
          return target;
        }
      } catch (error) {
        seenTargets.push(`${target.type}:${target.url}:${error.message}`);
      } finally {
        client.close();
      }
    }

    await delay(150);
  }

  throw new Error(`Timed out waiting for AI Test Automation Generator background target. Seen: ${Array.from(new Set(seenTargets)).join(", ")}`);
}

async function clickSelector(page, selector) {
  const box = await evaluate(
    page,
    `(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height
      };
    })()`
  );

  assert(box && box.width > 0 && box.height > 0, `Cannot click ${selector}; element has no visible box.`);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y });
  await page.send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", clickCount: 1 });
  await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", clickCount: 1 });
}

async function waitForFixtureReady(page) {
  await evaluate(
    page,
    `new Promise((resolve) => {
      if (document.readyState === "complete" && document.querySelector("#openLoginModal")) {
        resolve(true);
        return;
      }
      window.addEventListener("load", () => resolve(true), { once: true });
    })`
  );
}

async function installContentScriptHarness(page) {
  const alreadyInstalled = await evaluate(page, `typeof window.__aiTestAutomationListener === "function"`);
  if (alreadyInstalled) {
    return;
  }

  await evaluate(
    page,
    `(() => {
      window.__aiTestAutomationListener = null;
      window.chrome = {
        runtime: {
          onMessage: {
            addListener(listener) {
              window.__aiTestAutomationListener = listener;
            }
          }
        }
      };
      return true;
    })()`
  );

  const contentScript = fs.readFileSync(path.join(repoRoot, "content.js"), "utf8");
  const response = await page.send("Runtime.evaluate", {
    expression: `${contentScript}\n//# sourceURL=ai-test-automation-content-harness.js`,
    awaitPromise: false,
    returnByValue: true
  });

  if (response.result.exceptionDetails) {
    const details = response.result.exceptionDetails;
    throw new Error(
      details.exception?.description ||
        details.exception?.value ||
        details.text ||
        "Content script harness injection failed."
    );
  }

  const installed = await evaluate(page, `typeof window.__aiTestAutomationListener === "function"`);
  assert(installed, "Content script harness listener was not registered.");
}

async function sendHarnessMessage(page, type, options = {}) {
  const response = await evaluate(
    page,
    `new Promise((resolve) => {
      if (typeof window.__aiTestAutomationListener !== "function") {
        resolve({ ok: false, error: "Harness listener is not installed." });
        return;
      }
      window.__aiTestAutomationListener(
        { type: ${JSON.stringify(type)}, options: ${JSON.stringify(options)} },
        null,
        resolve
      );
    })`
  );

  assert(response && response.ok, `${type} failed in harness: ${response?.error || "No response"}`);
  return response.data;
}

async function main() {
  assert(fs.existsSync(chromePath), `Chrome not found at ${chromePath}`);

  const fixtureServer = await startFixtureServer();
  const fixturePort = fixtureServer.address().port;
  const debugPort = await getFreePort();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-test-extension-"));
  const fixtureUrl = `http://127.0.0.1:${fixturePort}/${fixtureFile}`;
  let chrome = null;
  let browser = null;
  let page = null;
  let worker = null;
  let chromeStderr = "";

  try {
    const chromeArgs = [
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-first-run-ui",
      "--disable-first-run",
      "--no-default-browser-check",
      "--no-sandbox",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      `--disable-extensions-except=${repoRoot}`,
      `--load-extension=${repoRoot}`,
      fixtureUrl
    ];

    if (!headed) {
      chromeArgs.unshift("--disable-gpu");
      chromeArgs.unshift("--headless=new");
    }

    chrome = spawn(chromePath, chromeArgs, {
      stdio: ["ignore", "pipe", "pipe"]
    });

    chrome.stderr.on("data", (chunk) => {
      chromeStderr = `${chromeStderr}${chunk.toString()}`.slice(-8000);
    });

    chrome.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        process.stderr.write(`Chrome exited with code ${code}\n`);
      }
    });

    const pageTarget = await waitForTarget(
      debugPort,
      (target) => target.type === "page" && target.url.includes(fixtureFile),
      "fixture page"
    );
    const browserInfo = await getJson(debugPort, "/json/version");

    page = new CdpClient(pageTarget.webSocketDebuggerUrl);
    browser = new CdpClient(browserInfo.webSocketDebuggerUrl);
    await Promise.all([page.connect(), browser.connect()]);
    await Promise.all([page.send("Runtime.enable"), page.send("Page.enable")]);

    let usingHarness = forceHarness;
    let sendExtensionMessage = null;

    if (!usingHarness) {
      try {
        const workerTarget = await waitForExtensionBackgroundTarget(debugPort);
        worker = new CdpClient(workerTarget.webSocketDebuggerUrl);
        await worker.connect();
        await worker.send("Runtime.enable");

        async function sendExtensionMessageOnce(type, options = {}) {
          const response = await evaluate(
            worker,
            `new Promise((resolve) => {
              chrome.tabs.query({}, (tabs) => {
                const tabSummary = (tabs || []).map((candidate) => ({
                  id: candidate.id,
                  url: candidate.url || "",
                  active: Boolean(candidate.active)
                }));
                const tab =
                  (tabs || []).find((candidate) => String(candidate.url || "").includes(${JSON.stringify(fixtureFile)})) ||
                  (tabs || []).find((candidate) => candidate.active) ||
                  (tabs || [])[0];
                if (!tab || !tab.id) {
                  resolve({ ok: false, error: "Fixture tab not found" });
                  return;
                }
                chrome.tabs.sendMessage(
                  tab.id,
                  { type: ${JSON.stringify(type)}, options: ${JSON.stringify(options)} },
                  (response) => {
                    const error = chrome.runtime.lastError;
                    resolve(error ? { ok: false, error: error.message, tab, tabs: tabSummary } : response);
                  }
                );
              });
            })`
          );

          return response;
        }

        sendExtensionMessage = async function sendRealExtensionMessage(type, options = {}) {
          let response = null;
          for (let attempt = 0; attempt < 20; attempt += 1) {
            response = await sendExtensionMessageOnce(type, options);
            if (response && response.ok) {
              return response.data;
            }
            await delay(150);
          }

          throw new Error(
            `${type} failed: ${response?.error || "No response"} ${JSON.stringify({
              tab: response?.tab && { id: response.tab.id, url: response.tab.url, active: response.tab.active },
              tabs: response?.tabs
            })}`
          );
        };
      } catch (error) {
        console.warn(`Falling back to content-script harness: ${error.message}`);
        if (chromeStderr) {
          console.warn(`Chrome stderr:\n${chromeStderr}`);
        }
        usingHarness = true;
      }
    }

    await page.send("Page.reload", { ignoreCache: true });
    await delay(1000);
    await waitForFixtureReady(page);

    if (usingHarness) {
      await installContentScriptHarness(page);
      sendExtensionMessage = (type, options = {}) => sendHarnessMessage(page, type, options);
    }

    async function reloadFixtureForNextStep() {
      await page.send("Page.reload", { ignoreCache: true });
      await delay(1000);
      await waitForFixtureReady(page);
      if (usingHarness) {
        await installContentScriptHarness(page);
      }
    }

    const scanOptions = { includeHidden: true, includeAssertionCandidates: true };
    const initialScan = await sendExtensionMessage("LOCATOR_SCAN_PAGE", scanOptions);
    const byId = (id, scan = initialScan) => scan.elements.find((element) => element.id === id);

    assert(byId("preRenderedHiddenModal"), "Hidden aria modal was not exported when includeHidden=true.");
    assert(byId("preRenderedHiddenModal").isVisible === false, "aria-hidden modal should be invisible.");
    assert(byId("preRenderedHiddenModal").isInteractable === false, "aria-hidden modal should not be interactable.");
    assert(byId("preRenderedHiddenModal").modalState?.isOpen === false, "aria-hidden modal should not be open.");
    assert(byId("displayHiddenModal").isVisible === false, "hidden/display-none modal should be invisible.");
    assert(byId("opacityHiddenModal").isVisible === false, "opacity:0 modal should be invisible.");
    assert(byId("pointerEventsModal").isVisible === true, "pointer-events modal should remain visible.");
    assert(byId("pointerEventsModal").isInteractable === false, "pointer-events:none modal should not be interactable.");
    assert(byId("pointerEventsModal").modalState?.isOpen === false, "pointer-events:none modal should not be open.");
    assert(byId("normalVisibleModal").modalState?.isOpen === true, "normal visible modal should be open.");
    assert(initialScan.warnings.some((warning) => warning.type === "Hidden modal detected"), "Hidden modal warning missing.");
    assert(Array.isArray(initialScan.assertionCandidates), "Top-level assertionCandidates field missing.");
    assert(initialScan.exportLimits?.maxAssertionCandidates === 100, "Assertion export limits missing.");
    assert(initialScan.assertionExtractionSummary?.enabled === true, "Assertion extraction summary should be enabled.");

    await sendExtensionMessage("LOCATOR_CAPTURE_START", scanOptions);
    await clickSelector(page, "#openLoginModal");
    await delay(800);
    const openCapture = await sendExtensionMessage("LOCATOR_CAPTURE_STOP", scanOptions);
    assert(
      openCapture.snapshots.some((snapshot) => snapshot.snapshotType === "Modal Opened" && snapshot.modalState?.isOpen),
      "Snapshot recording did not capture Modal Opened."
    );
    assert(
      openCapture.scan.assertionCandidates.some(
        (candidate) => candidate.type === "modalTitle" && candidate.normalizedText.includes("login")
      ),
      "Modal opened snapshot did not produce a modal title assertion candidate."
    );

    await sendExtensionMessage("LOCATOR_CAPTURE_START", scanOptions);
    await clickSelector(page, "#closeLoginModal");
    await delay(800);
    const closeCapture = await sendExtensionMessage("LOCATOR_CAPTURE_STOP", scanOptions);
    assert(
      closeCapture.snapshots.some((snapshot) => snapshot.snapshotType === "Modal Closed" && snapshot.modalState?.isOpen === false),
      "Snapshot recording did not capture Modal Closed."
    );

    await reloadFixtureForNextStep();
    await sendExtensionMessage("LOCATOR_INTERACTION_CLEAR", scanOptions);
    await sendExtensionMessage("LOCATOR_INTERACTION_START", scanOptions);
    await clickSelector(page, "#openLoginModal");
    await delay(800);
    await clickSelector(page, "#closeLoginModal");
    await delay(800);
    const interactionResult = await sendExtensionMessage("LOCATOR_INTERACTION_STOP", scanOptions);
    const openedFlow = interactionResult.scan.userFlows.find(
      (flow) => flow.result?.type === "modal" && flow.result?.interactionType === "modal opened"
    );
    const closedFlow = interactionResult.scan.userFlows.find(
      (flow) => flow.result?.type === "modal" && flow.result?.interactionType === "modal closed"
    );

    assert(openedFlow, "Interaction recording did not create a modal opened flow.");
    assert(openedFlow.result.isVisible === true, "Modal opened flow should be visible.");
    assert(openedFlow.result.isInteractable === true, "Modal opened flow should be interactable.");
    assert(openedFlow.result.modalState?.isOpen === true, "Modal opened flow should have modalState.isOpen=true.");
    assert(
      !openedFlow.capturedElements.some((element) => element.modalState?.isModalCandidate && !element.isVisible),
      "Modal opened flow included hidden modal content."
    );
    assert(
      openedFlow.assertionCandidates.length <= 5 &&
        openedFlow.assertionCandidates.some(
          (candidate) => candidate.type === "modalTitle" && candidate.source === "interactionResult"
        ),
      "Modal opened flow should include compact modal title assertion candidate."
    );
    assert(
      interactionResult.scan.assertionCandidates.some(
        (candidate) => candidate.type === "modalTitle" && candidate.source === "interactionResult"
      ),
      "Global assertion candidates should include modal title from interaction result."
    );
    assert(closedFlow, "Interaction recording did not create a modal closed flow.");

    await reloadFixtureForNextStep();
    await sendExtensionMessage("LOCATOR_INTERACTION_CLEAR", scanOptions);
    await sendExtensionMessage("LOCATOR_INTERACTION_START", scanOptions);
    await clickSelector(page, "#noopButton");
    await delay(800);
    const lowValueResult = await sendExtensionMessage("LOCATOR_INTERACTION_STOP", scanOptions);
    assert(
      lowValueResult.scan.userFlows.some((flow) => flow.result?.type === "lowValueInteraction"),
      "No-op click was not marked as low-value interaction."
    );
    assert(
      lowValueResult.scan.warnings.some((warning) => warning.type === "Low-value interaction"),
      "Low-value interaction warning missing."
    );

    console.log("Modal visibility smoke test passed.");
    console.log(JSON.stringify({
      initialWarnings: initialScan.warnings.map((warning) => warning.type),
      modalOpenedSnapshots: openCapture.snapshots.filter((snapshot) => snapshot.snapshotType === "Modal Opened").length,
      modalClosedSnapshots: closeCapture.snapshots.filter((snapshot) => snapshot.snapshotType === "Modal Closed").length,
      recordedFlows: interactionResult.scan.userFlows.map((flow) => flow.result?.interactionType || flow.interactionType),
      assertionCandidates: interactionResult.scan.assertionCandidates.length
    }, null, 2));
  } finally {
    if (browser) {
      await browser.send("Browser.close").catch(() => {});
    } else if (chrome) {
      chrome.kill();
    }
    await waitForProcessExit(chrome);
    if (chrome && chrome.exitCode === null && chrome.signalCode === null) {
      chrome.kill();
    }
    page?.close();
    worker?.close();
    browser?.close();
    fixtureServer.close();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Could not remove temporary Chrome profile: ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
