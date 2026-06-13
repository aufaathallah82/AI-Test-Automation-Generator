const SCANNED_ELEMENT_SELECTOR = [
  "input",
  "button",
  "a",
  "select",
  "textarea",
  "label",
  "form",
  "iframe",
  "img",
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[contenteditable="true"]'
].join(",");

const DYNAMIC_UI_SELECTOR = [
  "dialog",
  '[role="dialog"]',
  '[aria-modal="true"]',
  '[role="alert"]',
  '[role="status"]',
  '[role="tooltip"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="option"]',
  '[role="tab"]',
  '[role="tabpanel"]',
  '[role="table"]',
  "table",
  "details[open]",
  "[popover]",
  "[open]",
  '[aria-expanded="true"]',
  '[aria-selected="true"]',
  '[class*="modal" i]',
  '[class*="dialog" i]',
  '[class*="toast" i]',
  '[class*="snackbar" i]',
  '[class*="dropdown" i]',
  '[class*="popover" i]',
  '[class*="tooltip" i]',
  '[class*="drawer" i]',
  '[class*="datepicker" i]',
  '[class*="date-picker" i]',
  '[class*="calendar" i]',
  '[class*="validation" i]',
  '[class*="error" i]',
  '[class*="accordion" i]',
  '[class*="tab" i]',
  '[class*="table" i]'
].join(",");

const CAPTURE_ELEMENT_SELECTOR = `${SCANNED_ELEMENT_SELECTOR},${DYNAMIC_UI_SELECTOR}`;
const TEST_ID_ATTRIBUTES = ["data-testid", "data-cy", "data-test"];
const VISIBILITY_ATTRIBUTES = [
  "class",
  "style",
  "hidden",
  "aria-hidden",
  "aria-expanded",
  "open",
  "role"
];
const WARNING_TYPES = [
  "Duplicate CSS selector",
  "Duplicate XPath",
  "Duplicate text locator",
  "Non-unique ID",
  "Dynamic locator detected"
];
const MAX_SNAPSHOTS = 100;
const MAX_SNAPSHOT_ELEMENTS = 30;
const INTERACTION_CORRELATION_MS = 500;
const MAX_USER_FLOWS = 100;
const MAX_RECORDED_ACTIONS = 200;
const TRACKED_KEYBOARD_KEYS = ["Enter", "Escape", "Tab"];
const PRODUCT_NAME = "AI Test Automation Generator";
const PRODUCT_DESCRIPTION =
  "Record user interactions, analyze DOM behavior, and generate AI-ready automation models for Selenium, Playwright, Cypress, and Gherkin generation.";
const EXPORT_FILE_NAME = "ai-test-automation-model.json";
const AUTOMATION_TARGETS = ["Selenium", "Playwright", "Cypress", "Gherkin"];
const AUTOMATION_CAPABILITIES = [
  "DOM scanning",
  "Locator generation",
  "Automation readiness scoring",
  "Snapshot recording",
  "Interaction recording",
  "JSON export",
  "Hidden element filtering",
  "Duplicate locator detection",
  "Smart locator rating"
];

let captureObserver = null;
let capturedSnapshots = [];
let captureStartedAt = "";
let captureOptions = { includeHidden: false };
let interactionObserver = null;
let interactionRecordingActive = false;
let interactionStartedAt = "";
let interactionOptions = { includeHidden: false };
let recordedActions = [];
let userFlows = [];
let pendingInteraction = null;
let pendingInteractionTimer = null;

function scanDomElements(options = {}) {
  const includeHidden = Boolean(options.includeHidden);
  const elements = Array.from(document.querySelectorAll(SCANNED_ELEMENT_SELECTOR)).filter(
    (element) => !shouldIgnoreElement(element)
  );
  const allScannedElements = elements.map((element) => buildElementSnapshot(element));
  const hiddenElementCount = allScannedElements.filter((element) => !element.isVisible).length;
  const scannedElements = includeHidden
    ? allScannedElements
    : allScannedElements.filter((element) => element.isVisible);
  const warnings = applyLocatorIssues(scannedElements);
  const automationReadiness = calculateAutomationReadiness(scannedElements, warnings, {
    hiddenElementCount,
    totalScannedElements: allScannedElements.length
  });
  const snapshots = normalizeSnapshots(options.snapshots || capturedSnapshots);
  const normalizedRecordedActions = normalizeRecordedActions(recordedActions);
  const normalizedUserFlows = normalizeUserFlows(userFlows);
  const interactionSummary = buildInteractionSummary(normalizedUserFlows);
  const scanDate = new Date().toISOString();

  return {
    metadata: buildExportMetadata(scanDate),
    pageName: getPageName(),
    url: window.location.href,
    title: document.title || "",
    scanDate,
    totalElements: scannedElements.length,
    automationScore: automationReadiness.score,
    automationReadiness,
    warnings,
    elements: scannedElements,
    snapshots,
    recordedActionsCount: normalizedRecordedActions.length,
    recordedFlowsCount: normalizedUserFlows.length,
    recordedActions: normalizedRecordedActions,
    userFlows: normalizedUserFlows,
    interactionSummary
  };
}

function buildExportMetadata(generatedAt) {
  return {
    projectName: PRODUCT_NAME,
    description: PRODUCT_DESCRIPTION,
    exportType: "AI-ready automation model",
    exportFileName: EXPORT_FILE_NAME,
    generatedAt,
    targetFrameworks: [...AUTOMATION_TARGETS],
    capabilities: [...AUTOMATION_CAPABILITIES]
  };
}

function buildElementSnapshot(element, options = {}) {
  const isDetached = Boolean(options.detached) || !element?.isConnected;
  const tag = element?.tagName ? element.tagName.toLowerCase() : "";
  const type = getElementType(element);
  const text = getElementText(element);
  const role = getRole(element);
  const css = isDetached ? generateDetachedCssSelector(element) : generateStableCssSelector(element);
  const xpath = isDetached ? "" : generateXPath(element);
  const textLocator = buildTextLocator(role, text);
  const locatorChoice = chooseBestLocator(element, css, xpath, role, text);

  return {
    elementName: generateElementName(element, text),
    tag,
    type,
    text,
    textLocator,
    id: element?.id || "",
    name: element?.getAttribute("name") || "",
    className: element?.getAttribute("class") || "",
    placeholder: element?.getAttribute("placeholder") || "",
    ariaLabel: element?.getAttribute("aria-label") || "",
    role,
    href: getHref(element),
    src: getSrc(element),
    css,
    xpath,
    bestLocator: locatorChoice.bestLocator,
    locatorType: locatorChoice.locatorType,
    confidence: locatorChoice.confidence,
    reason: locatorChoice.reason,
    isVisible: !isDetached && isElementVisible(element),
    locatorIssue: ""
  };
}

function startCapture(options = {}) {
  stopCaptureObserverOnly();

  captureOptions = { includeHidden: Boolean(options.includeHidden) };
  capturedSnapshots = [];
  captureStartedAt = new Date().toISOString();
  captureObserver = new MutationObserver(recordMutationSnapshots);
  captureObserver.observe(document.documentElement, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: VISIBILITY_ATTRIBUTES,
    childList: true,
    subtree: true
  });

  return {
    active: true,
    startedAt: captureStartedAt,
    totalSnapshots: capturedSnapshots.length
  };
}

function stopCapture(options = {}) {
  stopCaptureObserverOnly();
  captureOptions = { includeHidden: Boolean(options.includeHidden) };

  return {
    active: false,
    startedAt: captureStartedAt,
    totalSnapshots: capturedSnapshots.length,
    snapshots: normalizeSnapshots(capturedSnapshots),
    scan: scanDomElements({ includeHidden: captureOptions.includeHidden })
  };
}

function stopCaptureObserverOnly() {
  if (captureObserver) {
    captureObserver.disconnect();
    captureObserver = null;
  }
}

function getCaptureStatus() {
  return {
    active: Boolean(captureObserver),
    startedAt: captureStartedAt,
    totalSnapshots: capturedSnapshots.length
  };
}

function startInteractionRecording(options = {}) {
  interactionOptions = { includeHidden: Boolean(options.includeHidden) };
  interactionRecordingActive = true;
  interactionStartedAt = new Date().toISOString();
  clearPendingInteraction();
  removeInteractionEventListeners();
  addInteractionEventListeners();
  stopInteractionObserverOnly();

  interactionObserver = new MutationObserver(recordInteractionMutations);
  interactionObserver.observe(document.documentElement, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: VISIBILITY_ATTRIBUTES,
    childList: true,
    subtree: true
  });

  return getInteractionStatus();
}

function stopInteractionRecording(options = {}) {
  interactionOptions = { includeHidden: Boolean(options.includeHidden) };
  flushPendingInteraction();
  interactionRecordingActive = false;
  removeInteractionEventListeners();
  stopInteractionObserverOnly();

  return {
    ...getInteractionStatus(),
    scan: scanDomElements({ includeHidden: interactionOptions.includeHidden })
  };
}

function clearInteractionHistory(options = {}) {
  interactionOptions = { includeHidden: Boolean(options.includeHidden) };
  clearPendingInteraction();
  recordedActions = [];
  userFlows = [];

  return {
    ...getInteractionStatus(),
    scan: scanDomElements({ includeHidden: interactionOptions.includeHidden })
  };
}

function stopInteractionObserverOnly() {
  if (interactionObserver) {
    interactionObserver.disconnect();
    interactionObserver = null;
  }
}

function getInteractionStatus() {
  return {
    active: interactionRecordingActive,
    startedAt: interactionStartedAt,
    recordedActionsCount: recordedActions.length,
    recordedFlowsCount: userFlows.length
  };
}

function addInteractionEventListeners() {
  document.addEventListener("click", handleInteractionEvent, true);
  document.addEventListener("dblclick", handleInteractionEvent, true);
  document.addEventListener("input", handleInteractionEvent, true);
  document.addEventListener("change", handleInteractionEvent, true);
  document.addEventListener("keydown", handleInteractionEvent, true);
  document.addEventListener("submit", handleInteractionEvent, true);
}

function removeInteractionEventListeners() {
  document.removeEventListener("click", handleInteractionEvent, true);
  document.removeEventListener("dblclick", handleInteractionEvent, true);
  document.removeEventListener("input", handleInteractionEvent, true);
  document.removeEventListener("change", handleInteractionEvent, true);
  document.removeEventListener("keydown", handleInteractionEvent, true);
  document.removeEventListener("submit", handleInteractionEvent, true);
}

function handleInteractionEvent(event) {
  if (!interactionRecordingActive || event.isTrusted === false) {
    return;
  }

  const action = buildInteractionAction(event);
  if (!action) {
    return;
  }

  queueInteractionAction(action);
}

function buildInteractionAction(event) {
  const target = getInteractionTarget(event);
  if (!target || shouldIgnoreElement(target)) {
    return null;
  }

  const actionType = getInteractionActionType(event, target);
  if (!actionType) {
    return null;
  }

  const triggerElement = buildBusinessElement(target, { actionType });

  return {
    timestamp: new Date().toISOString(),
    actionType,
    triggerElement,
    key: event.type === "keydown" ? event.key : "",
    value: getInteractionValue(target, actionType),
    urlBefore: window.location.href,
    element: target,
    actionSignature: `${actionType}:${triggerElement.locator || triggerElement.name}`
  };
}

function getInteractionTarget(event) {
  if (event.type === "submit") {
    return event.target instanceof Element ? event.target : null;
  }

  const target = event.target instanceof Element ? event.target : null;
  if (!target) {
    return null;
  }

  return (
    target.closest(
      [
        "button",
        "a[href]",
        "input",
        "select",
        "textarea",
        "form",
        "iframe",
        "[role='button']",
        "[role='link']",
        "[role='checkbox']",
        "[role='radio']",
        "[role='textbox']",
        "[role='combobox']",
        "[contenteditable='true']"
      ].join(",")
    ) || target
  );
}

function getInteractionActionType(event, target) {
  const tag = target.tagName.toLowerCase();
  const type = getElementType(target);
  const role = getRole(target);

  if (event.type === "keydown") {
    return TRACKED_KEYBOARD_KEYS.includes(event.key) ? `keyboard ${event.key.toLowerCase()}` : "";
  }

  if (event.type === "submit") {
    return "form submission";
  }

  if (event.type === "input") {
    return isTextEntryElement(target) ? "input typing" : "";
  }

  if (event.type === "change") {
    if (tag === "select" || role === "combobox" || role === "listbox") {
      return "dropdown selection";
    }
    if (tag === "input" && type === "checkbox") {
      return "checkbox selection";
    }
    if (tag === "input" && type === "radio") {
      return "radio selection";
    }
    return "";
  }

  if (event.type === "dblclick") {
    return "double click";
  }

  if (event.type === "click") {
    if (tag === "input" && ["checkbox", "radio"].includes(type)) {
      return "";
    }
    if (tag === "select") {
      return "";
    }
    return "click";
  }

  return "";
}

function queueInteractionAction(action) {
  const actionRecord = toRecordedAction(action);
  const shouldMergeInput =
    pendingInteraction &&
    pendingInteraction.action.actionType === "input typing" &&
    action.actionType === "input typing" &&
    pendingInteraction.action.actionSignature === action.actionSignature;

  if (shouldMergeInput) {
    pendingInteraction.action = action;
    pendingInteraction.actionRecord = actionRecord;
    recordedActions[recordedActions.length - 1] = actionRecord;
    schedulePendingInteractionFlush();
    return;
  }

  flushPendingInteraction();
  recordedActions.push(actionRecord);
  trimArray(recordedActions, MAX_RECORDED_ACTIONS);

  pendingInteraction = {
    action,
    actionRecord,
    mutationEntries: [],
    syntheticResults: inferSyntheticInteractionResults(action)
  };
  schedulePendingInteractionFlush();
}

function recordInteractionMutations(mutations) {
  if (!interactionRecordingActive || !pendingInteraction) {
    return;
  }

  for (const mutation of mutations) {
    const entries = extractMutationEntries(mutation);
    pendingInteraction.mutationEntries.push(...entries);
  }
}

function schedulePendingInteractionFlush() {
  if (pendingInteractionTimer) {
    window.clearTimeout(pendingInteractionTimer);
  }

  pendingInteractionTimer = window.setTimeout(flushPendingInteraction, INTERACTION_CORRELATION_MS);
}

function flushPendingInteraction() {
  if (pendingInteractionTimer) {
    window.clearTimeout(pendingInteractionTimer);
    pendingInteractionTimer = null;
  }

  if (!pendingInteraction) {
    return;
  }

  const flow = buildUserFlow(pendingInteraction);
  if (flow) {
    userFlows.push(flow);
    trimArray(userFlows, MAX_USER_FLOWS);
  }

  pendingInteraction = null;
}

function clearPendingInteraction() {
  if (pendingInteractionTimer) {
    window.clearTimeout(pendingInteractionTimer);
    pendingInteractionTimer = null;
  }
  pendingInteraction = null;
}

function extractMutationEntries(mutation) {
  const entries = [];

  if (mutation.type === "childList") {
    for (const node of Array.from(mutation.addedNodes)) {
      if (node.nodeType !== Node.ELEMENT_NODE || shouldIgnoreElement(node)) {
        continue;
      }
      for (const target of getMeaningfulCaptureTargets(node)) {
        entries.push({ element: target, baseChangeType: "added node", detached: false });
      }
    }

    for (const node of Array.from(mutation.removedNodes)) {
      if (node.nodeType !== Node.ELEMENT_NODE || shouldIgnoreElement(node)) {
        continue;
      }
      for (const target of getMeaningfulCaptureTargets(node)) {
        entries.push({ element: target, baseChangeType: "removed node", detached: true });
      }
    }
  }

  if (mutation.type === "attributes") {
    const element = mutation.target;
    if (
      element instanceof Element &&
      !shouldIgnoreElement(element) &&
      isMeaningfulCaptureTarget(element) &&
      (mutation.oldValue || "") !== (element.getAttribute(mutation.attributeName) || "")
    ) {
      entries.push({
        element,
        baseChangeType: "visibility change",
        detached: false,
        attributeName: mutation.attributeName
      });
    }
  }

  return entries;
}

function buildUserFlow(interaction) {
  const mutationEntries = dedupeMutationEntries(interaction.mutationEntries);
  const capturedElements = collectInteractionCapturedElements(mutationEntries);
  const result = classifyInteractionResult(interaction.action, mutationEntries, capturedElements, interaction.syntheticResults);
  const action = {
    type: interaction.action.actionType,
    elementName: interaction.action.triggerElement.name,
    locator: interaction.action.triggerElement.locator,
    locatorType: interaction.action.triggerElement.locatorType,
    confidence: interaction.action.triggerElement.confidence,
    text: interaction.action.triggerElement.text,
    value: interaction.action.value,
    key: interaction.action.key
  };
  const flow = {
    timestamp: interaction.action.timestamp,
    flowName: buildFlowName(action, result),
    interactionType: result.interactionType,
    trigger: getActionTriggerLabel(action),
    action,
    result,
    capturedElements
  };

  flow.summarySteps = buildFlowSummarySteps(flow);
  return flow;
}

function classifyInteractionResult(action, mutationEntries, capturedElements, syntheticResults) {
  const candidates = mutationEntries
    .map((entry) => classifyHighLevelMutation(entry))
    .filter(Boolean);
  if (action.urlBefore && window.location.href !== action.urlBefore) {
    candidates.push({
      type: "navigation",
      interactionType: "page navigation",
      priority: 92,
      title: document.title || window.location.href,
      description: `URL changed from ${action.urlBefore} to ${window.location.href}`
    });
  }
  const syntheticCandidates = syntheticResults.map((result) => ({
    ...result,
    priority: result.priority || 10
  }));
  const selected = [...candidates, ...syntheticCandidates].sort((left, right) => right.priority - left.priority)[0];

  if (!selected) {
    return {
      type: "none",
      interactionType: "no visible UI change",
      name: "",
      title: "",
      description: "No visible UI change detected within 500ms",
      capturedElements
    };
  }

  const title = selected.title || getResultTitle(selected.element, selected.type);
  const name = selected.name || toBusinessIdentifier(title || selected.interactionType, getResultNameSuffix(selected.type));

  return {
    type: selected.type,
    interactionType: selected.interactionType,
    name,
    title,
    description: selected.description || buildResultDescription(selected.interactionType, title),
    capturedElements
  };
}

function classifyHighLevelMutation(entry) {
  const element = entry.element;
  if (!(element instanceof Element)) {
    return null;
  }

  const tokens = getElementTokens(element);
  const role = element.getAttribute("role") || "";
  const tag = element.tagName.toLowerCase();
  const removed = entry.detached || entry.baseChangeType === "removed node" || isHiddenMutation(entry);
  const expanded = element.getAttribute("aria-expanded") === "true" || element.hasAttribute("open");
  const selected = element.getAttribute("aria-selected") === "true";

  if (/(modal|dialog)/i.test(tokens) || role === "dialog" || element.getAttribute("aria-modal") === "true") {
    return highLevelCandidate(removed ? "modal closed" : "modal opened", "modal", element, removed ? 96 : 100);
  }

  if (/(drawer|side-panel|sidepanel)/i.test(tokens)) {
    return highLevelCandidate(removed ? "drawer closed" : "drawer opened", "drawer", element, 95);
  }

  if (/(dropdown|select-menu|combobox|listbox|menu|popover)/i.test(tokens) || ["menu", "listbox"].includes(role)) {
    return highLevelCandidate(removed ? "dropdown closed" : "dropdown opened", "dropdown", element, 90);
  }

  if (/(toast|snackbar|notification)/i.test(tokens) || ["alert", "status"].includes(role)) {
    return highLevelCandidate("toast appeared", "toast", element, 88);
  }

  if (/(tooltip)/i.test(tokens) || role === "tooltip") {
    return highLevelCandidate("tooltip appeared", "tooltip", element, 82);
  }

  if (/(validation|invalid|error|field-error)/i.test(tokens)) {
    return highLevelCandidate("validation message appeared", "validationMessage", element, 86);
  }

  if (tag === "form" || matchesSelector(element, "form")) {
    return highLevelCandidate("form appeared", "form", element, 80);
  }

  if ((tag === "table" || role === "table" || /table/i.test(tokens)) && !removed) {
    return highLevelCandidate("table expanded", "table", element, 70);
  }

  if ((tag === "details" || /accordion/i.test(tokens)) && expanded && !removed) {
    return highLevelCandidate("accordion expanded", "accordion", element, 78);
  }

  if ((role === "tab" || role === "tabpanel" || /tab/i.test(tokens)) && selected && !removed) {
    return highLevelCandidate("tab changed", "tab", element, 76);
  }

  if (tag === "iframe" && !removed) {
    return highLevelCandidate("iframe activated", "iframe", element, 72);
  }

  return null;
}

function highLevelCandidate(interactionType, type, element, priority) {
  return {
    interactionType,
    type,
    element,
    priority,
    title: getResultTitle(element, type)
  };
}

function inferSyntheticInteractionResults(action) {
  const element = action.element;
  const results = [];

  if (!(element instanceof Element)) {
    return results;
  }

  if (action.actionType === "form submission") {
    results.push({
      type: "form",
      interactionType: "form submitted",
      element,
      priority: 84,
      title: getResultTitle(element, "form")
    });
  }

  if (element.tagName.toLowerCase() === "a" && action.actionType === "click") {
    const href = element.href || element.getAttribute("href") || "";
    const target = element.getAttribute("target") || "";

    if (target === "_blank") {
      results.push({
        type: "window",
        interactionType: "new window opened",
        priority: 74,
        title: normalizeText(element.innerText || element.textContent || href),
        description: href ? `New window opened for ${href}` : "New window opened"
      });
    } else if (href && href !== window.location.href && !href.startsWith("#")) {
      results.push({
        type: "navigation",
        interactionType: "page navigation",
        priority: 68,
        title: normalizeText(element.innerText || element.textContent || href),
        description: `Navigation target: ${href}`
      });
    }
  }

  if (element.tagName.toLowerCase() === "iframe") {
    results.push({
      type: "iframe",
      interactionType: "iframe activated",
      element,
      priority: 72,
      title: getResultTitle(element, "iframe")
    });
  }

  return results;
}

function collectInteractionCapturedElements(mutationEntries) {
  const snapshots = [];

  for (const entry of mutationEntries) {
    const entrySnapshots = collectSnapshotElements(entry.element, {
      detached: entry.detached,
      includeHidden: interactionOptions.includeHidden || entry.detached
    });
    snapshots.push(...entrySnapshots);
  }

  return dedupeBusinessElements(
    snapshots
      .filter((snapshot) => snapshot.bestLocator || snapshot.text || snapshot.elementName)
      .map((snapshot) => buildBusinessElementFromSnapshot(snapshot))
  ).slice(0, MAX_SNAPSHOT_ELEMENTS);
}

function dedupeMutationEntries(entries) {
  const seen = new Set();
  const unique = [];

  for (const entry of entries) {
    const snapshot = buildElementSnapshot(entry.element, { detached: entry.detached });
    const signature = [
      entry.baseChangeType,
      snapshot.bestLocator || snapshot.css || snapshot.xpath,
      snapshot.tag,
      snapshot.text,
      entry.attributeName || ""
    ].join("|");

    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    unique.push(entry);
  }

  return unique.slice(0, MAX_SNAPSHOT_ELEMENTS);
}

function dedupeBusinessElements(elements) {
  const seen = new Set();
  const unique = [];

  for (const element of elements) {
    const signature = `${element.locator}|${element.name}|${element.text}`;
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    unique.push(element);
  }

  return unique;
}

function toRecordedAction(action) {
  return {
    timestamp: action.timestamp,
    actionType: action.actionType,
    triggerElement: action.triggerElement
  };
}

function normalizeRecordedActions(actions) {
  return Array.isArray(actions)
    ? actions.slice(-MAX_RECORDED_ACTIONS).map((action) => ({
        timestamp: action.timestamp || "",
        actionType: action.actionType || "",
        triggerElement: action.triggerElement || {}
      }))
    : [];
}

function normalizeUserFlows(flows) {
  return Array.isArray(flows)
    ? flows.slice(-MAX_USER_FLOWS).map((flow) => ({
        timestamp: flow.timestamp || "",
        flowName: flow.flowName || "",
        interactionType: flow.interactionType || "",
        trigger: flow.trigger || "",
        action: flow.action || {},
        result: flow.result || {},
        capturedElements: Array.isArray(flow.capturedElements) ? flow.capturedElements : []
      }))
    : [];
}

function buildInteractionSummary(flows) {
  return normalizeUserFlows(flows).map((flow) => ({
    flowName: flow.flowName,
    steps: buildFlowSummarySteps(flow)
  }));
}

function buildFlowSummarySteps(flow) {
  const steps = [buildActionSummaryStep(flow.action), buildResultSummaryStep(flow.result)].filter(Boolean);
  const importantElements = (flow.capturedElements || [])
    .filter((element) => isImportantAvailableElement(element, flow.action))
    .slice(0, 4);

  for (const element of importantElements) {
    steps.push(`${toReadableElementLabel(element)} became available`);
  }

  return steps;
}

function buildActionSummaryStep(action) {
  const label = getActionTriggerLabel(action);
  const suffix = getActionElementSuffix(action);
  const labeledTarget = suffix && !label.toLowerCase().endsWith(suffix) ? `${label} ${suffix}` : label;

  if (action.type === "input typing") {
    return `Type into ${labeledTarget}`.trim();
  }

  if (action.type === "checkbox selection") {
    return `Select ${removeTrailingWord(label, "checkbox")} checkbox`;
  }

  if (action.type === "radio selection") {
    return `Select ${removeTrailingWord(label, "radio")} radio option`;
  }

  if (action.type === "dropdown selection") {
    return `Select ${action.value || label} from ${label} dropdown`;
  }

  if (action.type === "form submission") {
    return `Submit ${removeTrailingWord(label, "form")} form`;
  }

  if (action.type?.startsWith("keyboard ")) {
    return `Press ${action.key || action.type.replace("keyboard ", "")} on ${label}`;
  }

  return `${toReadableName(action.type || "Interact")} ${labeledTarget}`.trim();
}

function buildResultSummaryStep(result) {
  if (!result || result.type === "none") {
    return "No visible UI change detected";
  }

  const title = result.title || toReadableName(result.name || result.type);
  const typeLabel = getResultDisplayType(result.type);

  if (result.interactionType === "form submitted") {
    return `${title || "Form"} submitted`;
  }

  if (result.interactionType === "page navigation") {
    return "Page navigation was triggered";
  }

  if (result.interactionType === "new window opened") {
    return "New window was opened";
  }

  if (result.interactionType?.includes("closed")) {
    return `${title || typeLabel} ${typeLabel} closed`;
  }

  if (result.interactionType?.includes("appeared") || result.interactionType?.includes("opened")) {
    return `${title || typeLabel} ${typeLabel} appeared`;
  }

  return buildResultDescription(result.interactionType, title);
}

function buildBusinessElement(element, options = {}) {
  return buildBusinessElementFromSnapshot(buildElementSnapshot(element, options), options);
}

function buildBusinessElementFromSnapshot(snapshot, options = {}) {
  const suffix = options.suffix || inferBusinessElementSuffix(snapshot);
  const nameSource =
    options.nameSource ||
    snapshot.elementName ||
    snapshot.text ||
    snapshot.ariaLabel ||
    snapshot.placeholder ||
    snapshot.name ||
    snapshot.id ||
    snapshot.role ||
    snapshot.tag;

  return {
    name: toBusinessIdentifier(nameSource, suffix),
    locator: snapshot.bestLocator || snapshot.css || snapshot.xpath || "",
    locatorType: snapshot.locatorType || "",
    confidence: Number(snapshot.confidence) || 0,
    text: snapshot.text || "",
    tag: snapshot.tag || "",
    role: snapshot.role || "",
    isVisible: Boolean(snapshot.isVisible)
  };
}

function inferBusinessElementSuffix(snapshot) {
  const tag = snapshot.tag || "";
  const role = snapshot.role || "";
  const type = snapshot.type || "";
  const tokens = `${snapshot.className || ""} ${snapshot.id || ""} ${role}`.toLowerCase();

  if (role === "dialog" || /modal|dialog/.test(tokens)) {
    return "Modal";
  }
  if (/drawer/.test(tokens)) {
    return "Drawer";
  }
  if (role === "tooltip" || /tooltip/.test(tokens)) {
    return "Tooltip";
  }
  if (["alert", "status"].includes(role) || /toast|snackbar|notification/.test(tokens)) {
    return "Toast";
  }
  if (tag === "button" || role === "button" || ["button", "submit", "reset"].includes(type)) {
    return "Button";
  }
  if (tag === "a" || role === "link") {
    return "Link";
  }
  if (type === "checkbox" || role === "checkbox") {
    return "Checkbox";
  }
  if (type === "radio" || role === "radio") {
    return "Radio";
  }
  if (tag === "select" || ["combobox", "listbox"].includes(role)) {
    return "Dropdown";
  }
  if (tag === "textarea" || role === "textbox" || isTextInputType(type)) {
    return "Input";
  }
  if (tag === "form" || role === "form") {
    return "Form";
  }
  if (tag === "iframe") {
    return "Iframe";
  }
  if (tag === "table" || role === "table") {
    return "Table";
  }
  if (role === "tab") {
    return "Tab";
  }

  return "Element";
}

function toBusinessIdentifier(value, suffix = "Element") {
  const suffixWord = String(suffix || "Element").toLowerCase();
  const words = extractBusinessWords(value).filter((word) => !isGenericBusinessWord(word, suffixWord));

  if (!words.length) {
    words.push("interactive");
  }

  if (words[words.length - 1] !== suffixWord) {
    words.push(suffixWord);
  }

  return words
    .slice(0, 9)
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join("");
}

function extractBusinessWords(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/&/g, " and ")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.toLowerCase())
    .filter(Boolean)
    .filter((word) => !/^\d+$/.test(word));
}

function isGenericBusinessWord(word, suffixWord) {
  return (
    word === suffixWord ||
    ["element", "div", "span", "container", "wrapper", "content", "item", "field"].includes(word)
  );
}

function getInteractionValue(element, actionType) {
  if (!(element instanceof Element)) {
    return "";
  }

  if (element instanceof HTMLInputElement) {
    if (element.type === "password") {
      return element.value ? "[password]" : "";
    }
    if (["checkbox", "radio"].includes(element.type)) {
      return element.checked ? "checked" : "unchecked";
    }
    return normalizeText(element.value);
  }

  if (element instanceof HTMLTextAreaElement) {
    return normalizeText(element.value);
  }

  if (element instanceof HTMLSelectElement) {
    return normalizeText(element.options[element.selectedIndex]?.text || element.value);
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    return normalizeText(element.innerText || element.textContent);
  }

  if (actionType?.startsWith("keyboard ")) {
    return "";
  }

  return normalizeText(element.getAttribute("value"));
}

function isTextEntryElement(element) {
  if (element instanceof HTMLTextAreaElement) {
    return true;
  }

  if (element instanceof HTMLInputElement) {
    return isTextInputType(element.type || "text");
  }

  return element instanceof HTMLElement && element.isContentEditable;
}

function isTextInputType(type) {
  return ["email", "number", "password", "search", "tel", "text", "url"].includes(String(type || "").toLowerCase());
}

function isHiddenMutation(entry) {
  return (
    entry.baseChangeType === "visibility change" &&
    entry.element instanceof Element &&
    !isElementVisible(entry.element)
  );
}

function getResultTitle(element, resultType) {
  if (!(element instanceof Element)) {
    return "";
  }

  const labelledTitle = getAriaLabelledByText(element);
  if (labelledTitle) {
    return labelledTitle;
  }

  const directTitle =
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    element.getAttribute("data-title") ||
    element.getAttribute("data-name");
  if (directTitle) {
    return normalizeText(directTitle);
  }

  const heading = element.querySelector?.(
    "[role='heading'], h1, h2, h3, h4, h5, h6, [class*='title' i], [class*='heading' i]"
  );
  if (heading) {
    return normalizeText(heading.innerText || heading.textContent);
  }

  if (resultType === "form") {
    const legend = element.querySelector?.("legend");
    if (legend) {
      return normalizeText(legend.innerText || legend.textContent);
    }
  }

  return normalizeText(element.innerText || element.textContent || element.getAttribute("name") || element.id).slice(0, 80);
}

function getResultNameSuffix(type) {
  const suffixes = {
    modal: "Modal",
    drawer: "Drawer",
    dropdown: "Dropdown",
    toast: "Toast",
    tooltip: "Tooltip",
    validationMessage: "Message",
    form: "Form",
    table: "Table",
    accordion: "Accordion",
    tab: "Tab",
    iframe: "Iframe",
    navigation: "Navigation",
    window: "Window"
  };

  return suffixes[type] || "Result";
}

function buildResultDescription(interactionType, title) {
  const readableType = toReadableName(interactionType || "UI change");
  return title ? `${title} ${readableType.toLowerCase()}` : readableType;
}

function buildFlowName(action, result) {
  if (result?.type && result.type !== "none") {
    const actionVerb = getFlowActionVerb(result.interactionType, action.type);
    const resultLabel = result.title || toReadableName(result.name || result.type);
    return `${actionVerb} ${resultLabel}`.trim().slice(0, 120);
  }

  return `${toReadableName(action.type || "Interact")} ${getActionTriggerLabel(action)}`.trim().slice(0, 120);
}

function getFlowActionVerb(interactionType, actionType) {
  if (/opened|appeared|expanded|changed|activated/i.test(interactionType || "")) {
    return "Open";
  }
  if (/closed/i.test(interactionType || "")) {
    return "Close";
  }
  if (/submitted/i.test(interactionType || "") || actionType === "form submission") {
    return "Submit";
  }
  if (/navigation/i.test(interactionType || "")) {
    return "Navigate To";
  }
  return toReadableName(actionType || "Interact");
}

function getActionTriggerLabel(action) {
  const text = normalizeText(action?.text);
  if (text) {
    return text;
  }

  if (action?.elementName) {
    return toReadableName(action.elementName);
  }

  return normalizeText(action?.locator || "target");
}

function getActionElementSuffix(action) {
  const type = action?.locatorType || "";
  const name = action?.elementName || "";

  if (/button$/i.test(name) || type === "role + text") {
    return "button";
  }

  return "";
}

function removeTrailingWord(value, word) {
  const text = normalizeText(value);
  const suffix = String(word || "").toLowerCase();
  if (!text.toLowerCase().endsWith(suffix)) {
    return text;
  }

  return normalizeText(text.slice(0, -suffix.length)) || text;
}

function getResultDisplayType(type) {
  const labels = {
    validationMessage: "message"
  };

  return labels[type] || toReadableName(type || "result").toLowerCase();
}

function isImportantAvailableElement(element, action) {
  if (!element?.isVisible || !element.locator || element.locator === action?.locator) {
    return false;
  }

  return ["button", "input", "select", "textarea", "form", "a"].includes(element.tag) || ["button", "link"].includes(element.role);
}

function toReadableElementLabel(element) {
  const label = normalizeText(element.text || toReadableName(element.name || element.locator));
  const suffix = inferBusinessElementSuffix({
    tag: element.tag,
    role: element.role,
    type: "",
    className: "",
    id: ""
  }).toLowerCase();

  if (!label) {
    return toReadableName(element.name || "Element");
  }

  return label.toLowerCase().endsWith(suffix) ? label : `${label} ${suffix}`;
}

function trimArray(array, maxLength) {
  if (array.length > maxLength) {
    array.splice(0, array.length - maxLength);
  }
}

function recordMutationSnapshots(mutations) {
  for (const mutation of mutations) {
    if (capturedSnapshots.length >= MAX_SNAPSHOTS) {
      break;
    }

    if (mutation.type === "childList") {
      recordNodeListSnapshots(mutation.addedNodes, "added node", false);
      recordNodeListSnapshots(mutation.removedNodes, "removed node", true);
      continue;
    }

    if (mutation.type === "attributes") {
      recordAttributeSnapshot(mutation);
    }
  }
}

function recordNodeListSnapshots(nodes, baseChangeType, detached) {
  for (const node of Array.from(nodes)) {
    if (capturedSnapshots.length >= MAX_SNAPSHOTS) {
      break;
    }

    if (node.nodeType !== Node.ELEMENT_NODE || shouldIgnoreElement(node)) {
      continue;
    }

    const targets = getMeaningfulCaptureTargets(node);
    for (const target of targets) {
      if (capturedSnapshots.length >= MAX_SNAPSHOTS) {
        break;
      }
      addCaptureSnapshot(target, baseChangeType, { detached });
    }
  }
}

function recordAttributeSnapshot(mutation) {
  const element = mutation.target;
  if (
    !(element instanceof Element) ||
    shouldIgnoreElement(element) ||
    !isMeaningfulCaptureTarget(element)
  ) {
    return;
  }

  const previousValue = mutation.oldValue || "";
  const currentValue = element.getAttribute(mutation.attributeName) || "";
  if (previousValue === currentValue) {
    return;
  }

  addCaptureSnapshot(element, "visibility change", { attributeName: mutation.attributeName });
}

function addCaptureSnapshot(element, baseChangeType, options = {}) {
  if (shouldIgnoreElement(element)) {
    return;
  }

  const detached = Boolean(options.detached);
  const changeType = classifyChangeType(element, baseChangeType, detached);
  const elements = collectSnapshotElements(element, {
    detached,
    includeHidden: captureOptions.includeHidden || detached
  });

  if (!elements.length || isDuplicateSnapshot(changeType, elements)) {
    return;
  }

  const primaryElement = elements[0];
  capturedSnapshots.push({
    snapshotName: buildSnapshotName(changeType, primaryElement),
    timestamp: new Date().toISOString(),
    changeType,
    elements
  });
}

function collectSnapshotElements(root, options = {}) {
  const includeHidden = Boolean(options.includeHidden);
  const detached = Boolean(options.detached);
  const candidates = [];

  if (root instanceof Element) {
    candidates.push(root);
    if (root.querySelectorAll) {
      candidates.push(...Array.from(root.querySelectorAll(CAPTURE_ELEMENT_SELECTOR)));
    }
  }

  return uniqueElements(candidates)
    .filter((element) => !shouldIgnoreElement(element))
    .filter((element) => includeHidden || detached || isElementVisible(element))
    .slice(0, MAX_SNAPSHOT_ELEMENTS)
    .map((element) => buildElementSnapshot(element, { detached }));
}

function getMeaningfulCaptureTargets(root) {
  if (!(root instanceof Element) || shouldIgnoreElement(root)) {
    return [];
  }

  const targets = [];
  if (isMeaningfulCaptureTarget(root)) {
    targets.push(root);
  }

  if (root.querySelectorAll) {
    const descendants = Array.from(root.querySelectorAll(CAPTURE_ELEMENT_SELECTOR)).filter(
      (element) => isMeaningfulCaptureTarget(element) || matchesSelector(element, SCANNED_ELEMENT_SELECTOR)
    );
    targets.push(...descendants.slice(0, 5));
  }

  return uniqueElements(targets);
}

function isMeaningfulCaptureTarget(element) {
  if (!(element instanceof Element)) {
    return false;
  }

  if (matchesSelector(element, DYNAMIC_UI_SELECTOR) || matchesSelector(element, SCANNED_ELEMENT_SELECTOR)) {
    return true;
  }

  const tokens = getElementTokens(element);
  return /(modal|dialog|toast|snackbar|dropdown|popover|tooltip|drawer|datepicker|date-picker|calendar|validation|error|alert|menu)/i.test(
    tokens
  );
}

function isDuplicateSnapshot(changeType, elements) {
  const primary = elements[0];
  const signature = [
    changeType,
    primary?.tag || "",
    primary?.id || "",
    primary?.className || "",
    primary?.text || "",
    primary?.bestLocator || ""
  ].join("|");
  const recent = capturedSnapshots.slice(-5);

  return recent.some((snapshot) => {
    const element = snapshot.elements[0] || {};
    return (
      [
        snapshot.changeType,
        element.tag || "",
        element.id || "",
        element.className || "",
        element.text || "",
        element.bestLocator || ""
      ].join("|") === signature
    );
  });
}

function classifyChangeType(element, baseChangeType, detached) {
  const tokens = getElementTokens(element);
  const visible = !detached && isElementVisible(element);
  const isRemoval = detached || baseChangeType === "removed node" || (baseChangeType === "visibility change" && !visible);

  if (/(modal|dialog)/i.test(tokens) || element.getAttribute("role") === "dialog" || element.getAttribute("aria-modal") === "true") {
    return isRemoval ? "modal removal" : "modal appearance";
  }

  if (/(dropdown|select-menu|combobox|listbox|menu|popover)/i.test(tokens) || ["menu", "listbox"].includes(element.getAttribute("role"))) {
    return isRemoval ? "dropdown removal" : "dropdown appearance";
  }

  if (/(toast|snackbar|notification)/i.test(tokens) || ["alert", "status"].includes(element.getAttribute("role"))) {
    return isRemoval ? "toast removal" : "toast appearance";
  }

  if (/(tooltip)/i.test(tokens) || element.getAttribute("role") === "tooltip") {
    return isRemoval ? "tooltip removal" : "tooltip appearance";
  }

  if (/(drawer|side-panel|sidepanel)/i.test(tokens)) {
    return isRemoval ? "drawer removal" : "drawer appearance";
  }

  if (/(datepicker|date-picker|calendar)/i.test(tokens)) {
    return isRemoval ? "date picker removal" : "date picker appearance";
  }

  if (/(validation|invalid|error|field-error)/i.test(tokens)) {
    return isRemoval ? "validation message removal" : "validation message appearance";
  }

  return baseChangeType;
}

function buildSnapshotName(changeType, element) {
  const name = element?.elementName || element?.tag || "Element";
  return `${toReadableName(changeType)} - ${name}`.slice(0, 120);
}

function normalizeSnapshots(snapshots) {
  return Array.isArray(snapshots)
    ? snapshots
        .filter((snapshot) => snapshot && Array.isArray(snapshot.elements))
        .slice(0, MAX_SNAPSHOTS)
        .map((snapshot) => ({
          snapshotName: snapshot.snapshotName || "",
          timestamp: snapshot.timestamp || "",
          changeType: snapshot.changeType || "",
          elements: snapshot.elements
        }))
    : [];
}

function applyLocatorIssues(elements) {
  const warningCounts = new Map();

  for (const element of elements) {
    element.locatorIssue = "";
  }

  markDuplicateIssue(elements, "id", "Non-unique ID", warningCounts);
  markDuplicateIssue(elements, "css", "Duplicate CSS selector", warningCounts);
  markDuplicateIssue(elements, "xpath", "Duplicate XPath", warningCounts);
  markDuplicateIssue(elements, "textLocator", "Duplicate text locator", warningCounts);

  const dynamicElements = elements.filter(isDynamicLocatorElement);
  if (dynamicElements.length) {
    warningCounts.set("Dynamic locator detected", dynamicElements.length);
    for (const element of dynamicElements) {
      setLocatorIssue(element, "Dynamic locator detected");
    }
  }

  return WARNING_TYPES.filter((type) => warningCounts.has(type)).map((type) => ({
    type,
    count: warningCounts.get(type)
  }));
}

function markDuplicateIssue(elements, key, issueType, warningCounts) {
  const groups = new Map();

  for (const element of elements) {
    const value = normalizeCollisionValue(element[key], key);
    if (!value) {
      continue;
    }

    if (!groups.has(value)) {
      groups.set(value, []);
    }
    groups.get(value).push(element);
  }

  let duplicateCount = 0;
  for (const group of groups.values()) {
    if (group.length <= 1) {
      continue;
    }

    duplicateCount += group.length;
    for (const element of group) {
      setLocatorIssue(element, issueType);
    }
  }

  if (duplicateCount) {
    warningCounts.set(issueType, duplicateCount);
  }
}

function setLocatorIssue(element, issueType) {
  if (!element.locatorIssue) {
    element.locatorIssue = issueType;
  }
}

function normalizeCollisionValue(value, key) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }

  if (key === "textLocator" && normalized.length < 3) {
    return "";
  }

  return normalized.toLowerCase();
}

function isDynamicLocatorElement(element) {
  return (
    looksDynamicValue(element.id) ||
    looksDynamicValue(element.name) ||
    looksDynamicValue(element.bestLocator) ||
    String(element.className || "")
      .split(/\s+/)
      .some(looksGeneratedClassName)
  );
}

function calculateAutomationReadiness(elements, warnings, metrics) {
  const total = elements.length || 1;
  const warningCountByType = new Map(warnings.map((warning) => [warning.type, warning.count]));
  const testAttributeCount = elements.filter(hasTestAttributeSnapshot).length;
  const uniqueIdCount = countUniqueValues(elements, "id");
  const uniqueNameCount = countUniqueValues(elements, "name");
  const visibleCount = elements.filter((element) => element.isVisible).length;
  const cssFallbackCount = elements.filter((element) => element.locatorType === "css").length;
  const xpathFallbackCount = elements.filter((element) => element.locatorType === "xpath").length;
  const longXPathCount = elements.filter((element) => isLongXPath(element.xpath)).length;
  const iframeCount = elements.filter((element) => element.tag === "iframe").length;
  const hiddenElementCount = metrics.hiddenElementCount || 0;

  let score = 70;
  score += Math.min(14, Math.round((testAttributeCount / total) * 30));
  score += Math.min(10, Math.round((uniqueIdCount / total) * 25));
  score += Math.min(6, Math.round((uniqueNameCount / total) * 15));
  score += Math.min(8, Math.round((visibleCount / total) * 8));
  score -= Math.min(18, (warningCountByType.get("Duplicate CSS selector") || 0) * 3);
  score -= Math.min(14, (warningCountByType.get("Duplicate XPath") || 0) * 3);
  score -= Math.min(14, (warningCountByType.get("Duplicate text locator") || 0) * 2);
  score -= Math.min(16, (warningCountByType.get("Non-unique ID") || 0) * 4);
  score -= Math.min(14, (warningCountByType.get("Dynamic locator detected") || 0) * 2);
  score -= Math.min(10, hiddenElementCount);
  score -= Math.min(12, longXPathCount * 2);
  score -= Math.min(10, cssFallbackCount + xpathFallbackCount * 2);
  score -= iframeCount > 2 ? Math.min(12, (iframeCount - 2) * 4) : 0;
  score = clamp(Math.round(score), 0, 100);

  const strengths = [];
  const weaknesses = [];

  if (testAttributeCount) {
    strengths.push("Stable test attributes detected");
  }
  if (uniqueIdCount) {
    strengths.push("Unique IDs detected");
  }
  if (uniqueNameCount) {
    strengths.push("Unique names detected");
  }
  if (hasStableFormLocators(elements)) {
    strengths.push("Stable form locators available");
  }
  if (visibleCount / total >= 0.85) {
    strengths.push("Most automation model elements are visible");
  }

  if (warningCountByType.get("Duplicate CSS selector")) {
    weaknesses.push("Several duplicate CSS selectors found");
  }
  if (warningCountByType.get("Duplicate XPath")) {
    weaknesses.push("Several duplicate XPath locators found");
  }
  if (warningCountByType.get("Duplicate text locator")) {
    weaknesses.push("Repeated text locators may be ambiguous");
  }
  if (warningCountByType.get("Non-unique ID")) {
    weaknesses.push("Non-unique IDs detected");
  }
  if (warningCountByType.get("Dynamic locator detected")) {
    weaknesses.push("Dynamic locators detected");
  }
  if (hiddenElementCount) {
    weaknesses.push("Hidden elements detected");
  }
  if (longXPathCount) {
    weaknesses.push("Long XPath locators required for some elements");
  }
  if (iframeCount > 2) {
    weaknesses.push("Multiple iframe dependencies detected");
  }
  if (!testAttributeCount && !uniqueIdCount && !uniqueNameCount) {
    weaknesses.push("Few stable attributes found");
  }

  return {
    score,
    strengths: strengths.length ? strengths : ["No major locator collisions detected"],
    weaknesses
  };
}

function hasTestAttributeSnapshot(element) {
  return TEST_ID_ATTRIBUTES.some((attribute) => {
    const locatorType = element.locatorType || "";
    const css = element.css || "";
    const bestLocator = element.bestLocator || "";
    return locatorType === attribute || css.includes(`[${attribute}=`) || bestLocator.includes(`[${attribute}=`);
  });
}

function countUniqueValues(elements, key) {
  const counts = new Map();

  for (const element of elements) {
    const value = normalizeText(element[key]);
    if (!value) {
      continue;
    }
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return Array.from(counts.values()).filter((count) => count === 1).length;
}

function hasStableFormLocators(elements) {
  return elements.some(
    (element) =>
      ["input", "select", "textarea", "button"].includes(element.tag) &&
      ["data-testid", "data-cy", "data-test", "id", "name"].includes(element.locatorType)
  );
}

function isLongXPath(xpath) {
  return Boolean(xpath && (xpath.length > 140 || xpath.split("/").length > 9));
}

function generateElementName(element, text) {
  const candidates = [
    getAssociatedLabelText(element),
    getAriaLabelledByText(element),
    element?.getAttribute("aria-label"),
    element?.getAttribute("placeholder"),
    element?.getAttribute("alt"),
    element?.getAttribute("title"),
    text,
    element?.getAttribute("name"),
    element?.id,
    `${getElementType(element)} ${element?.tagName?.toLowerCase() || "element"}`
  ];

  const value = candidates.find((candidate) => normalizeText(candidate));
  return toReadableName(value || element?.tagName?.toLowerCase() || "element");
}

function generateStableCssSelector(element) {
  if (!(element instanceof Element)) {
    return "";
  }

  const tag = element.tagName.toLowerCase();
  const simpleSelectors = [];

  for (const attribute of TEST_ID_ATTRIBUTES) {
    const value = element.getAttribute(attribute);
    if (value) {
      simpleSelectors.push(`${tag}[${attribute}="${escapeCssString(value)}"]`);
      simpleSelectors.push(`[${attribute}="${escapeCssString(value)}"]`);
    }
  }

  if (element.id) {
    simpleSelectors.push(`#${escapeCssIdentifier(element.id)}`);
    simpleSelectors.push(`${tag}#${escapeCssIdentifier(element.id)}`);
  }

  const name = element.getAttribute("name");
  if (name) {
    simpleSelectors.push(`${tag}[name="${escapeCssString(name)}"]`);
  }

  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) {
    simpleSelectors.push(`${tag}[aria-label="${escapeCssString(ariaLabel)}"]`);
  }

  const placeholder = element.getAttribute("placeholder");
  if (placeholder) {
    simpleSelectors.push(`${tag}[placeholder="${escapeCssString(placeholder)}"]`);
  }

  for (const selector of simpleSelectors) {
    if (isUniqueSelector(selector)) {
      return selector;
    }
  }

  const parts = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    parts.unshift(buildCssPathSegment(current));
    const selector = parts.join(" > ");

    if (isUniqueSelector(selector)) {
      return selector;
    }

    if (current === document.documentElement) {
      break;
    }

    current = current.parentElement;
  }

  return parts.join(" > ");
}

function generateDetachedCssSelector(element) {
  if (!(element instanceof Element)) {
    return "";
  }

  const tag = element.tagName.toLowerCase();
  for (const attribute of [...TEST_ID_ATTRIBUTES, "id", "name", "aria-label", "placeholder", "role"]) {
    const value = attribute === "id" ? element.id : element.getAttribute(attribute);
    if (!value) {
      continue;
    }

    if (attribute === "id") {
      return `#${escapeCssIdentifier(value)}`;
    }

    return `${tag}[${attribute}="${escapeCssString(value)}"]`;
  }

  const classSegment = getStableClassSegment(element);
  return `${tag}${classSegment}`;
}

function generateXPath(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  if (element.id) {
    return `//*[@id=${toXPathLiteral(element.id)}]`;
  }

  const parts = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const tag = current.tagName.toLowerCase();
    let index = 1;
    let sibling = current.previousElementSibling;

    while (sibling) {
      if (sibling.tagName.toLowerCase() === tag) {
        index += 1;
      }
      sibling = sibling.previousElementSibling;
    }

    parts.unshift(`${tag}[${index}]`);
    current = current.parentElement;
  }

  return `/${parts.join("/")}`;
}

function isElementVisible(element) {
  if (!element || !element.isConnected) {
    return false;
  }

  if (element.closest("[hidden], [aria-hidden='true'], [inert]")) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.visibility === "collapse" ||
    Number(style.opacity) === 0
  ) {
    return false;
  }

  if (element instanceof HTMLInputElement && element.type === "hidden") {
    return false;
  }

  if (isDisabledForInteraction(element)) {
    return false;
  }

  const rects = element.getClientRects();
  if (!rects.length) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isDisabledForInteraction(element) {
  return Boolean(
    element.closest("[disabled], [aria-disabled='true']") ||
      (typeof element.matches === "function" && element.matches(":disabled"))
  );
}

function chooseBestLocator(element, css, xpath, role, text) {
  for (const attribute of TEST_ID_ATTRIBUTES) {
    const value = element?.getAttribute(attribute);
    if (value) {
      return {
        bestLocator: `[${attribute}="${escapeCssString(value)}"]`,
        locatorType: attribute,
        confidence: 0.98,
        reason: `${attribute} attribute found`
      };
    }
  }

  if (element?.id) {
    const locator = `#${escapeCssIdentifier(element.id)}`;
    return {
      bestLocator: locator,
      locatorType: "id",
      confidence: 0.95,
      reason: isUniqueSelector(locator) ? "Unique ID found" : "ID found but it is not unique"
    };
  }

  const name = element?.getAttribute("name");
  if (name) {
    return {
      bestLocator: `[name="${escapeCssString(name)}"]`,
      locatorType: "name",
      confidence: 0.9,
      reason: isUniqueSelector(`[name="${escapeCssString(name)}"]`) ? "Unique name attribute found" : "Name attribute found"
    };
  }

  const ariaLabel = element?.getAttribute("aria-label");
  if (ariaLabel) {
    return {
      bestLocator: `[aria-label="${escapeCssString(ariaLabel)}"]`,
      locatorType: "aria-label",
      confidence: 0.85,
      reason: "Accessible aria-label found"
    };
  }

  const placeholder = element?.getAttribute("placeholder");
  if (placeholder) {
    return {
      bestLocator: `[placeholder="${escapeCssString(placeholder)}"]`,
      locatorType: "placeholder",
      confidence: 0.8,
      reason: "Placeholder text found"
    };
  }

  if (role && text) {
    return {
      bestLocator: `role=${role}; text="${escapeLocatorText(text)}"`,
      locatorType: "role + text",
      confidence: 0.75,
      reason: "Role and visible text found"
    };
  }

  if (css) {
    return {
      bestLocator: css,
      locatorType: "css",
      confidence: 0.65,
      reason: "Generated CSS selector fallback"
    };
  }

  return {
    bestLocator: xpath,
    locatorType: "xpath",
    confidence: 0.5,
    reason: "Generated XPath fallback"
  };
}

function getPageName() {
  return document.title || window.location.hostname || window.location.pathname || "Untitled Page";
}

function getElementType(element) {
  const tag = element?.tagName?.toLowerCase() || "";

  if (tag === "input") {
    return (element.getAttribute("type") || "text").toLowerCase();
  }

  if (tag === "button") {
    return (element.getAttribute("type") || "submit").toLowerCase();
  }

  if (tag === "select") {
    return element.multiple ? "select-multiple" : "select-one";
  }

  return element?.getAttribute("type") || "";
}

function getElementText(element) {
  const tag = element?.tagName?.toLowerCase() || "";
  const type = getElementType(element);

  if (tag === "input" && ["button", "submit", "reset"].includes(type)) {
    return normalizeText(element.value || element.getAttribute("value"));
  }

  if (tag === "img") {
    return normalizeText(element.getAttribute("alt"));
  }

  if (tag === "iframe") {
    return normalizeText(element.getAttribute("title"));
  }

  return normalizeText(element?.innerText || element?.textContent);
}

function getRole(element) {
  return element?.getAttribute("role") || getImplicitRole(element);
}

function getImplicitRole(element) {
  const tag = element?.tagName?.toLowerCase() || "";
  const type = getElementType(element);

  if (tag === "a" && element.getAttribute("href")) {
    return "link";
  }

  if (tag === "button") {
    return "button";
  }

  if (tag === "select") {
    return element.multiple ? "listbox" : "combobox";
  }

  if (tag === "textarea") {
    return "textbox";
  }

  if (tag === "form") {
    return "form";
  }

  if (tag === "img" && element.getAttribute("alt")) {
    return "img";
  }

  if (tag === "input") {
    if (["button", "submit", "reset"].includes(type)) {
      return "button";
    }
    if (type === "checkbox") {
      return "checkbox";
    }
    if (type === "radio") {
      return "radio";
    }
    if (["email", "password", "search", "tel", "text", "url"].includes(type)) {
      return "textbox";
    }
  }

  return "";
}

function getHref(element) {
  if (element && "href" in element && element.href) {
    return element.href;
  }
  return element?.getAttribute("href") || "";
}

function getSrc(element) {
  if (element && "src" in element && element.src) {
    return element.src;
  }
  return element?.getAttribute("src") || "";
}

function getAssociatedLabelText(element) {
  if (!element || !(element instanceof Element)) {
    return "";
  }

  if (element.tagName.toLowerCase() === "label") {
    return normalizeText(element.innerText || element.textContent);
  }

  const labelParent = element.closest("label");
  if (labelParent) {
    return normalizeText(labelParent.innerText || labelParent.textContent);
  }

  if (!element.id || !element.isConnected) {
    return "";
  }

  const labels = Array.from(document.querySelectorAll(`label[for="${escapeCssString(element.id)}"]`));
  return normalizeText(labels.map((label) => label.innerText || label.textContent).join(" "));
}

function getAriaLabelledByText(element) {
  const labelledBy = element?.getAttribute("aria-labelledby");
  if (!labelledBy || !element.isConnected) {
    return "";
  }

  return normalizeText(
    labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .map((labelElement) => labelElement.innerText || labelElement.textContent)
      .join(" ")
  );
}

function buildCssPathSegment(element) {
  const tag = element.tagName.toLowerCase();

  if (element.id) {
    return `${tag}#${escapeCssIdentifier(element.id)}`;
  }

  const attributeSegment = getPreferredAttributeSegment(element);
  if (attributeSegment) {
    return `${tag}${attributeSegment}`;
  }

  const classSegment = getStableClassSegment(element);
  let selector = `${tag}${classSegment}`;
  const parent = element.parentElement;

  if (parent) {
    const sameTagSiblings = Array.from(parent.children).filter(
      (sibling) => sibling.tagName.toLowerCase() === tag
    );

    if (sameTagSiblings.length > 1) {
      selector += `:nth-of-type(${sameTagSiblings.indexOf(element) + 1})`;
    }
  }

  return selector;
}

function getPreferredAttributeSegment(element) {
  const attributes = [...TEST_ID_ATTRIBUTES, "name", "aria-label", "placeholder", "role"];

  for (const attribute of attributes) {
    const value = element.getAttribute(attribute);
    if (value) {
      return `[${attribute}="${escapeCssString(value)}"]`;
    }
  }

  return "";
}

function getStableClassSegment(element) {
  const classNames = Array.from(element.classList || [])
    .filter((className) => !looksGeneratedClassName(className))
    .slice(0, 2);

  if (!classNames.length) {
    return "";
  }

  return `.${classNames.map(escapeCssIdentifier).join(".")}`;
}

function looksGeneratedClassName(className) {
  return (
    String(className).length > 24 ||
    /^[a-z0-9_-]*[0-9a-f]{8,}[a-z0-9_-]*$/i.test(className) ||
    /^[a-z]+-[0-9]{4,}$/i.test(className)
  );
}

function looksDynamicValue(value) {
  const text = String(value || "");
  return (
    text.length > 0 &&
    (/[0-9a-f]{8,}/i.test(text) ||
      /[?&]?(session|token|uuid|guid|timestamp|time|nonce|random|hash)=/i.test(text) ||
      /\b\d{10,}\b/.test(text) ||
      /\b[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\b/i.test(text))
  );
}

function shouldIgnoreElement(element) {
  if (!(element instanceof Element)) {
    return true;
  }

  if (matchesSelector(element, "script, style, meta, link, noscript, template")) {
    return true;
  }

  const src = element.getAttribute("src") || "";
  const href = element.getAttribute("href") || "";
  const tokens = `${element.id || ""} ${element.className || ""} ${src} ${href}`.toLowerCase();

  if (/recaptcha|grecaptcha|g-recaptcha/.test(tokens)) {
    return true;
  }

  if (/chrome-extension:\/\/|moz-extension:\/\/|safari-extension:\/\//.test(tokens)) {
    return true;
  }

  if (
    /(google-analytics|googletagmanager|gtag|segment|mixpanel|hotjar|fullstory|analytics|tracking|telemetry)/.test(
      tokens
    )
  ) {
    return true;
  }

  if (
    matchesSelector(element, "iframe") &&
    /(doubleclick|googlesyndication|adservice|adsystem|adnxs|taboola|outbrain|advertising|ads)/.test(tokens)
  ) {
    return true;
  }

  return false;
}

function buildTextLocator(role, text) {
  const normalizedText = normalizeText(text);
  if (!normalizedText) {
    return "";
  }

  return role ? `role=${role}; text="${escapeLocatorText(normalizedText)}"` : `text="${escapeLocatorText(normalizedText)}"`;
}

function isUniqueSelector(selector) {
  try {
    return document.querySelectorAll(selector).length === 1;
  } catch (_error) {
    return false;
  }
}

function matchesSelector(element, selector) {
  try {
    return Boolean(element?.matches?.(selector));
  } catch (_error) {
    return false;
  }
}

function uniqueElements(elements) {
  const seen = new Set();
  const unique = [];

  for (const element of elements) {
    if (!(element instanceof Element) || seen.has(element)) {
      continue;
    }
    seen.add(element);
    unique.push(element);
  }

  return unique;
}

function getElementTokens(element) {
  return [
    element?.tagName || "",
    element?.id || "",
    element?.className || "",
    element?.getAttribute("role") || "",
    element?.getAttribute("aria-modal") || "",
    element?.getAttribute("aria-live") || "",
    element?.getAttribute("aria-expanded") || "",
    element?.getAttribute("data-testid") || "",
    element?.getAttribute("data-cy") || "",
    element?.getAttribute("data-test") || "",
    element?.getAttribute("data-component") || "",
    element?.getAttribute("data-ui") || "",
    element?.getAttribute("data-state") || "",
    element?.getAttribute("data-slot") || "",
    normalizeText(element?.textContent).slice(0, 80)
  ]
    .join(" ")
    .toLowerCase();
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function toReadableName(value) {
  const normalized = normalizeText(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .slice(0, 80);
}

function escapeCssIdentifier(value) {
  if (window.CSS?.escape) {
    return window.CSS.escape(value);
  }

  return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function escapeCssString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\A ");
}

function escapeLocatorText(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function toXPathLiteral(value) {
  const text = String(value);

  if (!text.includes('"')) {
    return `"${text}"`;
  }

  if (!text.includes("'")) {
    return `'${text}'`;
  }

  return `concat("${text.replace(/"/g, '", \'"\', "')}")`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  try {
    if (message?.type === "LOCATOR_SCAN_PAGE") {
      sendResponse({
        ok: true,
        data: scanDomElements(message.options || {})
      });
      return false;
    }

    if (message?.type === "LOCATOR_CAPTURE_START") {
      sendResponse({
        ok: true,
        data: startCapture(message.options || {})
      });
      return false;
    }

    if (message?.type === "LOCATOR_CAPTURE_STOP") {
      sendResponse({
        ok: true,
        data: stopCapture(message.options || {})
      });
      return false;
    }

    if (message?.type === "LOCATOR_CAPTURE_STATUS") {
      sendResponse({
        ok: true,
        data: getCaptureStatus()
      });
      return false;
    }

    if (message?.type === "LOCATOR_INTERACTION_START") {
      Promise.resolve()
          .then(() => startInteractionRecording(message.options || {}))
          .then((data) => {
            sendResponse({
              ok: true,
              data
            });
          })
          .catch((error) => {
            sendResponse({
              ok: false,
              error: error?.message || String(error)
            });
          });
      return true;
    }

    if (message?.type === "LOCATOR_INTERACTION_STOP") {
      sendResponse({
        ok: true,
        data: stopInteractionRecording(message.options || {})
      });
      return false;
    }

    if (message?.type === "LOCATOR_INTERACTION_CLEAR") {
      sendResponse({
        ok: true,
        data: clearInteractionHistory(message.options || {})
      });
      return false;
    }

    if (message?.type === "LOCATOR_INTERACTION_STATUS") {
      sendResponse({
        ok: true,
        data: getInteractionStatus()
      });
      return false;
    }
  } catch (error) {
    sendResponse({
      ok: false,
      error: error.message
    });
    return false;
  }

  return undefined;
});
