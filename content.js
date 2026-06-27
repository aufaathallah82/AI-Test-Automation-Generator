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
  "svg",
  "path",
  "use",
  "i",
  'span[class*="icon" i]',
  'span[class*="material-icons" i]',
  'span[class*="material-symbol" i]',
  'span[class*="fa-" i]',
  "span[data-icon]",
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
  '[role="alertdialog"]',
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
  '[class*="popup" i]',
  '[class*="overlay" i]',
  '[class*="toast" i]',
  '[class*="snackbar" i]',
  '[class*="dropdown" i]',
  '[class*="popover" i]',
  '[class*="tooltip" i]',
  '[class*="drawer" i]',
  '[id*="modal" i]',
  '[id*="dialog" i]',
  '[id*="popup" i]',
  '[id*="overlay" i]',
  '[id*="drawer" i]',
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
const MODAL_CANDIDATE_SELECTOR = [
  "dialog",
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[aria-modal="true"]',
  "[popover]",
  '[class*="modal" i]',
  '[class*="dialog" i]',
  '[class*="popup" i]',
  '[class*="overlay" i]',
  '[class*="drawer" i]',
  '[id*="modal" i]',
  '[id*="dialog" i]',
  '[id*="popup" i]',
  '[id*="overlay" i]',
  '[id*="drawer" i]'
].join(",");
const VISUAL_TARGET_SELECTOR = [
  "svg",
  "path",
  "use",
  "img",
  "i",
  'span[class*="icon" i]',
  'span[class*="material-icons" i]',
  'span[class*="material-symbol" i]',
  'span[class*="fa-" i]',
  "span[data-icon]"
].join(",");
const INTERACTIVE_ANCESTOR_SELECTOR = [
  "button",
  "a[href]",
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  '[role="button"]',
  '[role="link"]',
  "[onclick]",
  "[tabindex]"
].join(",");
const TEST_ID_ATTRIBUTES = ["data-testid", "data-cy", "data-test"];
const VISIBILITY_ATTRIBUTES = [
  "class",
  "style",
  "disabled",
  "hidden",
  "aria-hidden",
  "aria-disabled",
  "aria-expanded",
  "open",
  "role",
  "inert"
];
const WARNING_TYPES = [
  "Duplicate data-testid",
  "Duplicate data-cy",
  "Duplicate data-test",
  "Duplicate CSS selector",
  "Duplicate XPath",
  "Duplicate text locator",
  "Non-unique ID",
  "Dynamic locator detected",
  "Hidden modal detected",
  "Low-value interaction",
  "Assertion candidate limit reached"
];
const MAX_SNAPSHOTS = 100;
const MAX_SNAPSHOT_ELEMENTS = 30;
const INTERACTION_CORRELATION_MS = 500;
const MAX_USER_FLOWS = 100;
const MAX_RECORDED_ACTIONS = 200;
const DEFAULT_ASSERTION_EXPORT_LIMITS = {
  maxAssertionCandidates: 100,
  maxAssertionCandidatesPerFlow: 5,
  maxAssertionTextLength: 160,
  skipDuplicateAssertionText: true,
  skipHiddenAssertionText: true
};
const ASSERTION_SOURCE_PRIORITY = {
  interactionResult: 5,
  changedNode: 4,
  snapshot: 3,
  interactionAction: 2,
  selectedElement: 1
};
const ASSERTION_CANDIDATE_LIMIT_WARNING = "Assertion candidate limit reached";
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
const MODEL_VERSION = "0.2.0";
const ISSUE_SEVERITY_RANK = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3
};

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
let captureModalStateCache = new WeakMap();
let interactionModalStateCache = new WeakMap();

function scanDomElements(options = {}) {
  const includeHidden = Boolean(options.includeHidden);
  const elements = Array.from(document.querySelectorAll(CAPTURE_ELEMENT_SELECTOR)).filter(
    (element) => !shouldIgnoreElement(element)
  );
  const allScannedElements = dedupeAutomationSourceElements(elements).map((element) => buildElementSnapshot(element));
  const hiddenElementCount = allScannedElements.filter((element) => !element.isVisible).length;
  const scannedElements = includeHidden
    ? allScannedElements
    : allScannedElements.filter((element) => element.isVisible);
  const snapshots = normalizeSnapshots(options.snapshots || capturedSnapshots);
  const normalizedRecordedActions = normalizeRecordedActions(recordedActions);
  const assertionExportLimits = getAssertionExportLimits(options);
  const includeAssertionCandidates = shouldIncludeAssertionCandidates(options, {
    snapshots,
    userFlows,
    recordedActions: normalizedRecordedActions
  });
  const normalizedUserFlows = normalizeUserFlows(userFlows, {
    includeAssertionCandidates,
    assertionExportLimits
  });
  const interactionSummary = buildInteractionSummary(normalizedUserFlows);
  const warnings = applyLocatorIssues(scannedElements);
  addBehaviorWarnings(warnings, allScannedElements, normalizedUserFlows);
  const assertionExtraction = buildAssertionExport({
    enabled: includeAssertionCandidates,
    snapshots,
    userFlows: normalizedUserFlows,
    exportLimits: assertionExportLimits
  });
  warnings.push(...assertionExtraction.warnings);
  const automationReadiness = calculateAutomationReadiness(scannedElements, warnings, {
    hiddenElementCount,
    totalScannedElements: allScannedElements.length
  });
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
    interactionSummary,
    exportLimits: assertionExportLimits,
    assertionCandidates: assertionExtraction.assertionCandidates,
    assertionExtractionSummary: assertionExtraction.summary
  };
}

function buildExportMetadata(generatedAt) {
  return {
    projectName: PRODUCT_NAME,
    modelVersion: MODEL_VERSION,
    description: PRODUCT_DESCRIPTION,
    exportType: "AI-ready automation model",
    exportFileName: EXPORT_FILE_NAME,
    generatedAt,
    targetFrameworks: [...AUTOMATION_TARGETS],
    capabilities: [...AUTOMATION_CAPABILITIES]
  };
}

function buildElementSnapshot(element, options = {}) {
  const targetDetails = resolveAutomationTarget(element);
  const target = targetDetails.actualElement || element;
  const visualElement = targetDetails.visualElement || null;
  const isDetached = Boolean(options.detached) || !target?.isConnected;
  const tag = target?.tagName ? target.tagName.toLowerCase() : "";
  const type = getElementType(target);
  const text = getElementText(target);
  const role = getRole(target);
  const labelText = getAssociatedLabelText(target) || getAriaLabelledByText(target);
  const css = isDetached ? generateDetachedCssSelector(target) : generateStableCssSelector(target);
  const xpath = isDetached ? "" : generateXPath(target);
  const textLocator = buildTextLocator(role, text);
  const locatorChoice = chooseBestLocator(target, css, xpath, role, text);
  const visibilityResult = isDetached ? buildDetachedVisibilityResult(target) : isActuallyVisible(target);
  const interactabilityResult = isDetached
    ? buildDetachedInteractabilityResult()
    : isActuallyInteractable(target, visibilityResult);
  const modalState = buildModalState(target, {
    visibilityResult,
    interactabilityResult,
    detached: isDetached
  });
  const isVisible = visibilityResult.isVisible;
  const isInteractable = modalState.isModalCandidate
    ? modalState.isInteractable
    : interactabilityResult.isInteractable;
  const interactabilityReason =
    modalState.isModalCandidate && modalState.isInteractable && !interactabilityResult.isInteractable
      ? modalState.reason
      : interactabilityResult.interactabilityReason;
  const isInteractive = isInteractiveAutomationElement(target);
  const visualTarget = buildVisualTargetSummary(visualElement);
  const elementCategory = classifyElementCategory(target, {
    isInteractive,
    visualElement,
    sourceElement: element
  });

  const snapshot = {
    elementName: generateElementName(target, text),
    tag,
    type,
    text,
    textLocator,
    elementCategory,
    isInteractive,
    id: target?.id || "",
    name: target?.getAttribute("name") || "",
    className: target?.getAttribute("class") || "",
    placeholder: target?.getAttribute("placeholder") || "",
    ariaLabel: target?.getAttribute("aria-label") || "",
    labelText,
    role,
    href: getHref(target),
    src: getSrc(target),
    testAttributes: getTestAttributes(target),
    domContext: getElementDomContext(target),
    css,
    xpath,
    bestLocator: locatorChoice.bestLocator,
    locatorType: locatorChoice.locatorType,
    confidence: locatorChoice.confidence,
    reason: locatorChoice.reason,
    isVisible,
    isInteractable,
    visibilityReason: visibilityResult.visibilityReason,
    interactabilityReason,
    visibilityChecks: visibilityResult.visibilityChecks,
    modalState,
    actualTarget: {},
    visualTarget,
    targetingReason: targetDetails.targetingReason,
    locatorIssue: "",
    issueSeverity: "none"
  };

  snapshot.actualTarget = buildActualTargetSummary(snapshot);
  return snapshot;
}

function dedupeAutomationSourceElements(elements) {
  const byTarget = new Map();

  for (const element of elements) {
    const targetDetails = resolveAutomationTarget(element);
    const target = targetDetails.actualElement || element;
    if (!(target instanceof Element)) {
      continue;
    }

    const existing = byTarget.get(target);
    if (!existing || getAutomationSourcePriority(element, targetDetails) > existing.priority) {
      byTarget.set(target, {
        element,
        priority: getAutomationSourcePriority(element, targetDetails)
      });
    }
  }

  return Array.from(byTarget.values()).map((entry) => entry.element);
}

function getAutomationSourcePriority(element, targetDetails) {
  let priority = 0;
  if (targetDetails.visualElement) {
    priority += 4;
  }
  if (targetDetails.actualElement && targetDetails.actualElement !== element) {
    priority += 2;
  }
  if (isInteractiveAutomationElement(element)) {
    priority += 1;
  }
  return priority;
}

function resolveAutomationTarget(element) {
  if (!(element instanceof Element)) {
    return {
      actualElement: element,
      visualElement: null,
      targetingReason: ""
    };
  }

  const visualElement = getVisualTargetElement(element);
  if (visualElement) {
    const interactiveAncestor = getNearestInteractiveAncestor(visualElement);
    if (interactiveAncestor) {
      return {
        actualElement: interactiveAncestor,
        visualElement,
        targetingReason:
          "SVG/IMG is inside an interactive parent, so the parent element is better for automation."
      };
    }

    if (isInteractiveAutomationElement(visualElement)) {
      return {
        actualElement: visualElement,
        visualElement,
        targetingReason: "Visual media has its own interaction handler, so it can be automated directly."
      };
    }

    return {
      actualElement: visualElement,
      visualElement,
      targetingReason: ""
    };
  }

  const embeddedVisualTarget = findEmbeddedVisualTarget(element);
  if (embeddedVisualTarget && isInteractiveAutomationElement(element)) {
    return {
      actualElement: element,
      visualElement: embeddedVisualTarget,
      targetingReason:
        "SVG/IMG is inside an interactive parent, so the parent element is better for automation."
    };
  }

  return {
    actualElement: element,
    visualElement: null,
    targetingReason: ""
  };
}

function getVisualTargetElement(element) {
  if (!(element instanceof Element)) {
    return null;
  }

  const tag = element.tagName.toLowerCase();
  if (["path", "use"].includes(tag)) {
    return element.closest("svg") || element;
  }

  return isVisualTargetElement(element) ? element : null;
}

function findEmbeddedVisualTarget(element) {
  if (!(element instanceof Element) || !element.querySelector) {
    return null;
  }

  const candidate = element.querySelector(VISUAL_TARGET_SELECTOR);
  return candidate ? getVisualTargetElement(candidate) : null;
}

function isVisualTargetElement(element) {
  if (!(element instanceof Element)) {
    return false;
  }

  const tag = element.tagName.toLowerCase();
  return ["svg", "path", "use", "img", "i"].includes(tag) || isSpanIconElement(element);
}

function isSpanIconElement(element) {
  if (!(element instanceof Element) || element.tagName.toLowerCase() !== "span") {
    return false;
  }

  const tokens = getElementTokens(element);
  return (
    element.hasAttribute("data-icon") ||
    /(^|\s)(icon|material-icons|material-symbols|fa|fas|far|fal|fab)(\s|$)/i.test(
      element.getAttribute("class") || ""
    ) ||
    /\b(icon|material-icons|material-symbol|fa-)/i.test(tokens)
  );
}

function getNearestInteractiveAncestor(element) {
  let current = element instanceof Element ? element.parentElement : null;

  while (current && current !== document.documentElement) {
    if (matchesSelector(current, INTERACTIVE_ANCESTOR_SELECTOR) && isInteractiveParentCandidate(current)) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

function isInteractiveParentCandidate(element) {
  if (!(element instanceof Element)) {
    return false;
  }

  const tag = element.tagName.toLowerCase();
  const type = getElementType(element);
  const role = getRole(element);

  return (
    tag === "button" ||
    (tag === "a" && Boolean(element.getAttribute("href"))) ||
    (tag === "input" && ["button", "submit", "reset"].includes(type)) ||
    ["button", "link"].includes(role) ||
    hasClickHandlerSignal(element) ||
    hasTabIndexClickSignal(element)
  );
}

function isInteractiveAutomationElement(element) {
  if (!(element instanceof Element)) {
    return false;
  }

  const tag = element.tagName.toLowerCase();
  const type = getElementType(element);
  const role = getRole(element);

  return (
    tag === "button" ||
    (tag === "a" && Boolean(element.getAttribute("href"))) ||
    (tag === "input" && type !== "hidden") ||
    ["select", "textarea"].includes(tag) ||
    ["button", "link", "checkbox", "radio", "textbox", "combobox", "listbox", "option", "tab"].includes(role) ||
    (element instanceof HTMLElement && element.isContentEditable) ||
    hasClickHandlerSignal(element) ||
    hasTabIndexClickSignal(element)
  );
}

function hasClickHandlerSignal(element) {
  return Boolean(
    element instanceof Element &&
      (element.hasAttribute("onclick") || (typeof element.onclick === "function" && element.onclick))
  );
}

function hasTabIndexClickSignal(element) {
  if (!(element instanceof Element) || !element.hasAttribute("tabindex")) {
    return false;
  }

  const tabIndex = Number(element.getAttribute("tabindex"));
  return tabIndex >= 0 && (hasClickHandlerSignal(element) || ["button", "link"].includes(getRole(element)));
}

function buildActualTargetSummary(snapshot) {
  return {
    tag: snapshot.tag || "",
    elementName: snapshot.elementName || "",
    elementCategory: snapshot.elementCategory || "unknown",
    role: snapshot.role || "",
    text: snapshot.text || "",
    bestLocator: snapshot.bestLocator || "",
    locatorType: snapshot.locatorType || "",
    confidence: Number(snapshot.confidence) || 0,
    isVisible: Boolean(snapshot.isVisible),
    isInteractable: Boolean(snapshot.isInteractable),
    visibilityReason: snapshot.visibilityReason || "",
    interactabilityReason: snapshot.interactabilityReason || ""
  };
}

function buildVisualTargetSummary(element) {
  if (!(element instanceof Element)) {
    return {
      tag: "",
      alt: "",
      ariaLabel: "",
      title: "",
      className: ""
    };
  }

  return {
    tag: element.tagName.toLowerCase(),
    alt: element.getAttribute("alt") || "",
    ariaLabel: element.getAttribute("aria-label") || "",
    title: getVisualTargetTitle(element),
    className: element.getAttribute("class") || ""
  };
}

function getVisualTargetTitle(element) {
  if (!(element instanceof Element)) {
    return "";
  }

  const directTitle = element.getAttribute("title");
  if (directTitle) {
    return normalizeText(directTitle);
  }

  const svgTitle = element.tagName.toLowerCase() === "svg" ? element.querySelector("title") : null;
  return normalizeText(svgTitle?.textContent || "");
}

function getTestAttributes(element) {
  const attributes = {};

  for (const attribute of TEST_ID_ATTRIBUTES) {
    const value = element?.getAttribute?.(attribute);
    if (value) {
      attributes[attribute] = value;
    }
  }

  return attributes;
}

function getElementDomContext(element) {
  if (!(element instanceof Element)) {
    return "";
  }

  if (element.closest("footer, [role='contentinfo']")) {
    return "footer";
  }
  if (element.closest("nav, [role='navigation']")) {
    return "navigation";
  }
  if (element.closest("[role='dialog'], [aria-modal='true'], [class*='modal' i], [class*='dialog' i]")) {
    return "dialog";
  }
  if (element.closest("form")) {
    return "form";
  }
  if (element.closest("header, [role='banner']")) {
    return "header";
  }
  if (element.closest("main, [role='main']")) {
    return "main";
  }

  return "";
}

function classifyElementCategory(element, options = {}) {
  if (!(element instanceof Element)) {
    return "unknown";
  }

  const tag = element.tagName.toLowerCase();
  const role = getRole(element);
  const type = getElementType(element);
  const tokens = getElementTokens(element);
  const isInteractive = Boolean(options.isInteractive);

  if (element.getAttribute("aria-modal") === "true" || /\bmodal\b/i.test(tokens)) {
    return "modal";
  }
  if (role === "dialog" || tag === "dialog" || /\bdialog\b/i.test(tokens)) {
    return "dialog";
  }
  if (element.getAttribute("aria-live") || ["alert", "status"].includes(role) || /(toast|snackbar|notification)/i.test(tokens)) {
    return "toast";
  }
  if (role === "tooltip" || /tooltip/i.test(tokens)) {
    return "tooltip";
  }
  if (!["input", "textarea", "select"].includes(tag) && /(validation|invalid|error|field-error)/i.test(tokens)) {
    return "validationMessage";
  }
  if (tag === "table" || role === "table" || /\btable\b/i.test(tokens)) {
    return "table";
  }
  if (
    !["input", "textarea", "select"].includes(tag) &&
    (["combobox", "listbox", "menu", "option"].includes(role) || /(dropdown|select-menu|menu|popover)/i.test(tokens))
  ) {
    return "dropdown";
  }
  if (tag === "nav" || role === "navigation") {
    return "navigation";
  }
  if (["input", "textarea", "select"].includes(tag)) {
    return "formControl";
  }
  if (tag === "button" || role === "button" || ["button", "submit", "reset"].includes(type)) {
    return "button";
  }
  if (tag === "a" && element.getAttribute("href")) {
    return "link";
  }
  if (role === "link") {
    return "link";
  }
  if (isVisualTargetElement(element)) {
    if (isInteractive) {
      return "button";
    }
    return isDecorativeMediaElement(element) ? "decorativeMedia" : "media";
  }

  if (options.visualElement && !isInteractive) {
    return isDecorativeMediaElement(options.visualElement) ? "decorativeMedia" : "media";
  }

  return "unknown";
}

function isDecorativeMediaElement(element) {
  if (!(element instanceof Element)) {
    return false;
  }

  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute("role") || "";
  const tokens = getElementTokens(element);
  const hiddenFromAccessibility = element.getAttribute("aria-hidden") === "true" || ["presentation", "none"].includes(role);

  if (hiddenFromAccessibility) {
    return true;
  }

  if (tag === "img") {
    const alt = element.getAttribute("alt");
    if (alt === "") {
      return true;
    }
    return !normalizeText(alt) && /(logo|sprite|icon|decorative|spacer|tracking)/i.test(tokens);
  }

  if (["svg", "path", "use", "i"].includes(tag) || isSpanIconElement(element)) {
    return !getVisualTargetAccessibleName(element) || /(decorative|sprite|chevron|caret)/i.test(tokens);
  }

  return false;
}

function getVisualTargetAccessibleName(element) {
  if (!(element instanceof Element)) {
    return "";
  }

  return normalizeText(
    element.getAttribute("aria-label") ||
      element.getAttribute("alt") ||
      getAriaLabelledByText(element) ||
      getVisualTargetTitle(element)
  );
}

function getEmbeddedVisualLabel(element) {
  if (!(element instanceof Element) || !element.querySelector) {
    return "";
  }

  const visualTarget = findEmbeddedVisualTarget(element);
  return getVisualTargetAccessibleName(visualTarget);
}

function startCapture(options = {}) {
  stopCaptureObserverOnly();

  captureOptions = {
    includeHidden: Boolean(options.includeHidden),
    includeAssertionCandidates: getOptionBoolean(options, "includeAssertionCandidates", false)
  };
  capturedSnapshots = [];
  captureStartedAt = new Date().toISOString();
  captureModalStateCache = createPrimedModalStateCache();
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
  captureOptions = {
    includeHidden: Boolean(options.includeHidden),
    includeAssertionCandidates: getOptionBoolean(
      options,
      "includeAssertionCandidates",
      Boolean(captureOptions.includeAssertionCandidates)
    )
  };

  return {
    active: false,
    startedAt: captureStartedAt,
    totalSnapshots: capturedSnapshots.length,
    snapshots: normalizeSnapshots(capturedSnapshots),
    scan: scanDomElements({
      includeHidden: captureOptions.includeHidden,
      includeAssertionCandidates: captureOptions.includeAssertionCandidates
    })
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
  interactionOptions = {
    includeHidden: Boolean(options.includeHidden),
    includeAssertionCandidates: getOptionBoolean(options, "includeAssertionCandidates", true)
  };
  interactionRecordingActive = true;
  interactionStartedAt = new Date().toISOString();
  interactionModalStateCache = createPrimedModalStateCache();
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
  interactionOptions = {
    includeHidden: Boolean(options.includeHidden),
    includeAssertionCandidates: getOptionBoolean(
      options,
      "includeAssertionCandidates",
      Boolean(interactionOptions.includeAssertionCandidates)
    )
  };
  flushPendingInteraction();
  interactionRecordingActive = false;
  removeInteractionEventListeners();
  stopInteractionObserverOnly();

  return {
    ...getInteractionStatus(),
    scan: scanDomElements({
      includeHidden: interactionOptions.includeHidden,
      includeAssertionCandidates: interactionOptions.includeAssertionCandidates
    })
  };
}

function clearInteractionHistory(options = {}) {
  interactionOptions = {
    includeHidden: Boolean(options.includeHidden),
    includeAssertionCandidates: getOptionBoolean(
      options,
      "includeAssertionCandidates",
      Boolean(interactionOptions.includeAssertionCandidates)
    )
  };
  clearPendingInteraction();
  recordedActions = [];
  userFlows = [];

  return {
    ...getInteractionStatus(),
    scan: scanDomElements({
      includeHidden: interactionOptions.includeHidden,
      includeAssertionCandidates: interactionOptions.includeAssertionCandidates
    })
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

  const rawTarget = event.target instanceof Element ? event.target : null;
  if (!rawTarget) {
    return null;
  }

  const resolvedTarget = resolveAutomationTarget(rawTarget).actualElement;
  if (resolvedTarget instanceof Element && resolvedTarget !== rawTarget) {
    return resolvedTarget;
  }

  const closestTarget = rawTarget.closest(
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
      "[onclick]",
      "[tabindex]",
      "[role='checkbox']",
      "[role='radio']",
      "[role='textbox']",
      "[role='combobox']",
      "[contenteditable='true']"
    ].join(",")
  );

  return closestTarget && isInteractiveAutomationElement(closestTarget) ? closestTarget : rawTarget;
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

  const mutationEntries = [];
  for (const mutation of mutations) {
    mutationEntries.push(...extractMutationEntries(mutation, { modalStateCache: interactionModalStateCache }));
  }
  mutationEntries.push(...collectModalTransitionEntries(interactionModalStateCache));
  pendingInteraction.mutationEntries.push(...mutationEntries);
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

function extractMutationEntries(mutation, options = {}) {
  const entries = [];
  const modalStateCache = options.modalStateCache || interactionModalStateCache;

  if (mutation.type === "childList") {
    for (const node of Array.from(mutation.addedNodes)) {
      if (node.nodeType !== Node.ELEMENT_NODE || shouldIgnoreElement(node)) {
        continue;
      }
      for (const target of getMeaningfulCaptureTargets(node)) {
        const entry = buildMutationEntry(target, "added node", false, "", modalStateCache);
        if (entry) {
          entries.push(entry);
        }
      }
    }

    for (const node of Array.from(mutation.removedNodes)) {
      if (node.nodeType !== Node.ELEMENT_NODE || shouldIgnoreElement(node)) {
        continue;
      }
      for (const target of getMeaningfulCaptureTargets(node)) {
        const entry = buildMutationEntry(target, "removed node", true, "", modalStateCache);
        if (entry) {
          entries.push(entry);
        }
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
      const entry = buildMutationEntry(
        element,
        "visibility change",
        false,
        mutation.attributeName,
        modalStateCache
      );
      if (entry) {
        entries.push(entry);
      }
    }
  }

  return entries;
}

function buildMutationEntry(element, baseChangeType, detached, attributeName, modalStateCache) {
  const isKnownModal =
    getModalCandidateInfo(element).isModalCandidate || Boolean(modalStateCache?.has?.(element));
  if (isKnownModal) {
    const transition = buildModalTransition(element, baseChangeType, detached, modalStateCache);
    if (!transition.type) {
      return null;
    }
    return {
      element,
      baseChangeType,
      detached,
      attributeName,
      modalTransition: transition.type,
      modalTransitionDetails: transition,
      modalState: transition.currentState
    };
  }

  return {
    element,
    baseChangeType,
    detached,
    attributeName
  };
}

function buildUserFlow(interaction) {
  const mutationEntries = dedupeMutationEntries(interaction.mutationEntries);
  const capturedElements = collectInteractionCapturedElements(mutationEntries);
  const result = classifyInteractionResult(interaction.action, mutationEntries, capturedElements, interaction.syntheticResults);
  const action = {
    type: interaction.action.actionType,
    elementName: interaction.action.triggerElement.name,
    actualTarget: interaction.action.triggerElement.actualTarget || {},
    visualTarget: interaction.action.triggerElement.visualTarget || buildVisualTargetSummary(null),
    bestLocator: interaction.action.triggerElement.bestLocator || interaction.action.triggerElement.locator,
    locator: interaction.action.triggerElement.locator,
    locatorType: interaction.action.triggerElement.locatorType,
    confidence: interaction.action.triggerElement.confidence,
    elementCategory: interaction.action.triggerElement.elementCategory || "unknown",
    targetingReason: interaction.action.triggerElement.targetingReason || "",
    text: interaction.action.triggerElement.text,
    isVisible: interaction.action.triggerElement.isVisible,
    isInteractable: interaction.action.triggerElement.isInteractable,
    value: interaction.action.value,
    key: interaction.action.key
  };

  action.humanReadableStep = buildHumanReadableActionStep(action);
  result.newElements = capturedElements;
  result.humanReadableResult = buildHumanReadableResult(result);

  const flow = {
    timestamp: interaction.action.timestamp,
    flowName: buildFlowName(action, result),
    interactionType: result.interactionType,
    trigger: getActionTriggerLabel(action),
    action,
    result,
    capturedElements,
    assertionCandidates: [],
    gherkinSuggestion: buildGherkinSuggestion(action, result)
  };

  flow.assertionCandidates = buildFlowAssertionCandidates(flow, DEFAULT_ASSERTION_EXPORT_LIMITS);
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
    if (isLowValueInteractionAction(action)) {
      return {
        type: "lowValueInteraction",
        interactionType: "low-value interaction",
        name: "",
        title: "",
        description: "No meaningful visible UI change detected within 500ms",
        isVisible: false,
        isInteractable: false,
        visibilityReason: "",
        interactabilityReason: "",
        modalState: {},
        capturedElements
      };
    }

    return {
      type: "none",
      interactionType: "no visible UI change",
      name: "",
      title: "",
      description: "No visible UI change detected within 500ms",
      isVisible: false,
      isInteractable: false,
      visibilityReason: "",
      interactabilityReason: "",
      modalState: {},
      capturedElements
    };
  }

  const title = selected.title || getResultTitle(selected.element, selected.type);
  const name = selected.name || toBusinessIdentifier(title || selected.interactionType, getResultNameSuffix(selected.type));
  const selectedSnapshot = selected.element instanceof Element ? buildElementSnapshot(selected.element) : {};
  const modalState = selected.modalState || selectedSnapshot.modalState || {};
  const isVisible = selected.isVisible ?? Boolean(selectedSnapshot.isVisible);
  const isInteractable = selected.isInteractable ?? Boolean(selectedSnapshot.isInteractable);
  const description =
    selected.description ||
    (selected.type === "modal" && selected.interactionType === "modal opened"
      ? "The modal became visible and interactable."
      : buildResultDescription(selected.interactionType, title));

  return {
    type: selected.type,
    interactionType: selected.interactionType,
    name,
    title,
    description,
    bestLocator: selected.bestLocator || selectedSnapshot.bestLocator || selectedSnapshot.css || selectedSnapshot.xpath || "",
    locatorType: selected.locatorType || selectedSnapshot.locatorType || "",
    isVisible,
    isInteractable,
    visibilityReason: selected.visibilityReason || selectedSnapshot.visibilityReason || "",
    interactabilityReason: selected.interactabilityReason || selectedSnapshot.interactabilityReason || "",
    modalState,
    capturedElements
  };
}

function isLowValueInteractionAction(action) {
  return ["click", "double click"].includes(action?.actionType || "");
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
  const modalState = entry.modalState || buildModalState(element, { detached: entry.detached });

  if (modalState.isModalCandidate) {
    if (entry.modalTransition === "opened" || (!removed && modalState.isOpen)) {
      return highLevelCandidate("modal opened", "modal", element, 100, { modalState });
    }
    if (entry.modalTransition === "closed" || removed) {
      return highLevelCandidate("modal closed", "modal", element, 96, { modalState });
    }
    return null;
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

function highLevelCandidate(interactionType, type, element, priority, options = {}) {
  const snapshot = element instanceof Element ? buildElementSnapshot(element, { detached: options.detached }) : {};
  const modalState = options.modalState || snapshot.modalState || {};

  return {
    interactionType,
    type,
    element,
    priority,
    title: getResultTitle(element, type),
    bestLocator: snapshot.bestLocator || snapshot.css || snapshot.xpath || "",
    locatorType: snapshot.locatorType || "",
    isVisible: Boolean(snapshot.isVisible),
    isInteractable: Boolean(snapshot.isInteractable),
    visibilityReason: snapshot.visibilityReason || "",
    interactabilityReason: snapshot.interactabilityReason || "",
    modalState
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
    if (entry.modalState?.isModalCandidate && !entry.modalState.isOpen) {
      continue;
    }
    const entrySnapshots = collectSnapshotElements(entry.element, {
      detached: entry.detached,
      includeHidden: entry.modalTransition === "opened" ? false : interactionOptions.includeHidden || entry.detached
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

function normalizeUserFlows(flows, options = {}) {
  const includeAssertionCandidates = Boolean(options.includeAssertionCandidates);
  const exportLimits = getAssertionExportLimits(options.assertionExportLimits || {});

  return Array.isArray(flows)
    ? flows.slice(-MAX_USER_FLOWS).map((flow, index) => {
        const normalizedFlow = {
          timestamp: flow.timestamp || "",
          flowName: flow.flowName || "",
          interactionType: flow.interactionType || "",
          trigger: flow.trigger || "",
          action: flow.action || {},
          result: flow.result || {},
          capturedElements: Array.isArray(flow.capturedElements) ? flow.capturedElements : [],
          assertionCandidates: [],
          gherkinSuggestion: flow.gherkinSuggestion || {},
          summarySteps: Array.isArray(flow.summarySteps) ? flow.summarySteps : []
        };

        if (includeAssertionCandidates) {
          normalizedFlow.assertionCandidates = buildFlowAssertionCandidates(normalizedFlow, exportLimits)
            .slice(0, exportLimits.maxAssertionCandidatesPerFlow)
            .map((candidate, candidateIndex) => ({
              ...candidate,
              id: candidate.id || `flow${index + 1}Assertion${candidateIndex + 1}`
            }));
        }

        return normalizedFlow;
      })
    : [];
}

function buildInteractionSummary(flows) {
  return normalizeUserFlows(flows).map((flow) => ({
    flowName: flow.flowName,
    steps: buildFlowSummarySteps(flow)
  }));
}

function buildHumanReadableActionStep(action) {
  const targetLabel = getReadableActionTargetLabel(action);
  const visualTag = action.visualTarget?.tag || "";
  const visualPhrase = visualTag ? ` represented by ${getVisualTargetPhrase(visualTag)}` : "";

  if (action.type === "input typing") {
    return `Type into ${targetLabel}.`;
  }

  if (action.type === "checkbox selection") {
    return `Select ${removeTrailingWord(targetLabel, "checkbox")} checkbox.`;
  }

  if (action.type === "radio selection") {
    return `Select ${removeTrailingWord(targetLabel, "radio")} radio option.`;
  }

  if (action.type === "dropdown selection") {
    return `Select ${action.value || "an option"} from ${targetLabel}.`;
  }

  if (action.type === "form submission") {
    return `Submit ${removeTrailingWord(targetLabel, "form")} form.`;
  }

  if (action.type?.startsWith("keyboard ")) {
    return `Press ${action.key || action.type.replace("keyboard ", "")} on ${targetLabel}.`;
  }

  return `${toReadableName(action.type || "Interact")} ${targetLabel}${visualPhrase}.`.trim();
}

function buildHumanReadableResult(result) {
  if (result?.type === "modal" && result.isVisible && result.isInteractable) {
    return "The modal became visible and interactable.";
  }
  if (result?.type === "lowValueInteraction") {
    return "No meaningful visible UI change was detected.";
  }
  return buildResultSummaryStep(result);
}

function buildGherkinSuggestion(action, result) {
  return {
    when: buildGherkinWhen(action),
    then: buildGherkinThen(result)
  };
}

function buildGherkinWhen(action) {
  const targetLabel = getReadableActionTargetLabel(action);

  if (action.type === "input typing") {
    return `When user enters text into ${targetLabel}`;
  }

  if (action.type === "dropdown selection") {
    return `When user selects ${action.value || "an option"} from ${targetLabel}`;
  }

  if (action.type === "checkbox selection" || action.type === "radio selection") {
    return `When user selects ${targetLabel}`;
  }

  if (action.type === "form submission") {
    return `When user submits ${removeTrailingWord(targetLabel, "form")} form`;
  }

  if (action.type?.startsWith("keyboard ")) {
    return `When user presses ${action.key || action.type.replace("keyboard ", "")} on ${targetLabel}`;
  }

  return `When user ${getGherkinActionVerb(action.type)} ${targetLabel}`;
}

function buildGherkinThen(result) {
  if (!result || result.type === "none" || result.type === "lowValueInteraction") {
    return "Then no visible UI change should occur";
  }

  const title = result.title || toReadableName(result.name || result.type);
  const subject = title || getResultDisplayType(result.type);

  if (result.interactionType === "page navigation") {
    return "Then the expected page should be loaded";
  }

  if (result.interactionType === "new window opened") {
    return "Then a new window should be opened";
  }

  if (result.interactionType === "form submitted") {
    return `Then ${subject} should be submitted`;
  }

  if (result.interactionType?.includes("closed")) {
    return `Then ${subject} should be closed`;
  }

  return `Then ${subject} should be displayed`;
}

function getReadableActionTargetLabel(action) {
  const label = getActionTriggerLabel(action);
  const targetKind = getActionTargetKind(action);

  if (!targetKind || label.toLowerCase().endsWith(targetKind)) {
    return label;
  }

  return `${label} ${targetKind}`;
}

function getActionTargetKind(action) {
  const actualTag = action.actualTarget?.tag || action.tag || "";
  const category = action.elementCategory || action.actualTarget?.elementCategory || "";
  const role = action.actualTarget?.role || action.role || "";

  if (category === "button" || actualTag === "button" || role === "button") {
    return "button";
  }
  if (category === "link" || actualTag === "a" || role === "link") {
    return "link";
  }
  if (category === "formControl") {
    return "field";
  }
  if (category === "dropdown" || role === "combobox" || role === "listbox") {
    return "dropdown";
  }

  return "";
}

function getVisualTargetPhrase(tag) {
  if (tag === "svg") {
    return "an SVG icon";
  }
  if (tag === "img") {
    return "an image";
  }
  return `a ${tag} icon`;
}

function getGherkinActionVerb(actionType) {
  if (actionType === "double click") {
    return "double-clicks";
  }
  if (actionType === "click") {
    return "clicks";
  }
  return toReadableName(actionType || "interacts with").toLowerCase();
}

function buildFlowSummarySteps(flow) {
  const steps = [
    flow.action?.humanReadableStep || buildActionSummaryStep(flow.action),
    flow.result?.humanReadableResult || buildResultSummaryStep(flow.result)
  ].filter(Boolean);
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
  if (result.type === "lowValueInteraction") {
    return "No meaningful visible UI change detected";
  }
  if (result.type === "modal" && result.isVisible && result.isInteractable) {
    return "Modal became visible and interactable";
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
    bestLocator: snapshot.bestLocator || snapshot.css || snapshot.xpath || "",
    locatorType: snapshot.locatorType || "",
    confidence: Number(snapshot.confidence) || 0,
    text: snapshot.text || "",
    tag: snapshot.tag || "",
    role: snapshot.role || "",
    elementCategory: snapshot.elementCategory || "unknown",
    isInteractive: Boolean(snapshot.isInteractive),
    isVisible: Boolean(snapshot.isVisible),
    isInteractable: Boolean(snapshot.isInteractable),
    visibilityReason: snapshot.visibilityReason || "",
    interactabilityReason: snapshot.interactabilityReason || "",
    visibilityChecks: snapshot.visibilityChecks || {},
    modalState: snapshot.modalState || {},
    actualTarget: snapshot.actualTarget || buildActualTargetSummary(snapshot),
    visualTarget: snapshot.visualTarget || buildVisualTargetSummary(null),
    targetingReason: snapshot.targetingReason || ""
  };
}

function normalizeAssertionText(text, options = {}) {
  const settings = {
    caseSensitive: getOptionBoolean(options, "caseSensitive", false),
    maxLength: getPositiveIntegerOption(options.maxLength, DEFAULT_ASSERTION_EXPORT_LIMITS.maxAssertionTextLength),
    collapseWhitespace: getOptionBoolean(options, "collapseWhitespace", true)
  };
  const rawInput = String(text ?? "");
  let cleaned = rawInput.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b\u200c\u200d\ufeff]/g, "");

  if (settings.collapseWhitespace) {
    cleaned = cleaned.replace(/\s+/g, " ");
  }

  cleaned = cleaned.trim();
  let wasTruncated = false;
  if (cleaned.length > settings.maxLength) {
    cleaned = truncateAssertionText(cleaned, settings.maxLength);
    wasTruncated = true;
  }

  return {
    rawText: cleaned,
    normalizedText: settings.caseSensitive ? cleaned : cleaned.toLowerCase(),
    length: cleaned.length,
    wasTruncated
  };
}

function buildAssertionExport(options = {}) {
  const exportLimits = getAssertionExportLimits(options.exportLimits || {});
  const summary = createAssertionExtractionSummary(Boolean(options.enabled));
  const warnings = [];

  if (!summary.enabled) {
    return {
      assertionCandidates: [],
      summary,
      warnings
    };
  }

  const candidates = [];
  const userFlows = Array.isArray(options.userFlows) ? options.userFlows : [];
  const snapshots = Array.isArray(options.snapshots) ? options.snapshots : [];

  for (const flow of userFlows) {
    candidates.push(...buildFlowAssertionCandidates(flow, exportLimits, summary));
  }

  for (const snapshot of snapshots) {
    candidates.push(...buildSnapshotAssertionCandidates(snapshot, exportLimits, summary));
  }

  const assertionCandidates = dedupeAndLimitAssertionCandidates(candidates, exportLimits, summary).map(
    (candidate, index) => ({
      ...candidate,
      id: candidate.id || `assertion${index + 1}`
    })
  );

  summary.totalCandidates = assertionCandidates.length;
  if (summary.limitReached) {
    warnings.push({
      type: ASSERTION_CANDIDATE_LIMIT_WARNING,
      count: 1,
      severity: "low",
      affectedCategory: "assertionCandidates",
      recommendation: "Only the most relevant assertion candidates were exported to keep the JSON compact."
    });
  }

  return {
    assertionCandidates,
    summary,
    warnings
  };
}

function buildFlowAssertionCandidates(flow, exportLimits = DEFAULT_ASSERTION_EXPORT_LIMITS, summary) {
  if (!flow) {
    return [];
  }

  const limits = getAssertionExportLimits(exportLimits);
  const candidates = [];
  const action = flow.action || {};
  const result = flow.result || {};
  const capturedElements = Array.isArray(flow.capturedElements) ? flow.capturedElements : [];

  const actionCandidate = buildActionAssertionCandidate(action, limits, summary);
  if (actionCandidate) {
    candidates.push(actionCandidate);
  }

  const resultCandidate = buildResultAssertionCandidate(result, limits, summary);
  if (resultCandidate) {
    candidates.push(resultCandidate);
  }

  for (const element of capturedElements) {
    const candidate = buildElementAssertionCandidate(element, {
      source: "changedNode",
      exportLimits: limits,
      summary
    });
    if (candidate) {
      candidates.push(candidate);
    }
  }

  return dedupeAndLimitAssertionCandidates(candidates, {
    ...limits,
    maxAssertionCandidates: limits.maxAssertionCandidatesPerFlow
  }, summary).map((candidate, index) => ({
    ...candidate,
    id: candidate.id || `flowAssertion${index + 1}`
  }));
}

function buildSnapshotAssertionCandidates(snapshot, exportLimits, summary) {
  if (!snapshot || !Array.isArray(snapshot.elements)) {
    return [];
  }

  const limits = getAssertionExportLimits(exportLimits);
  const candidates = [];
  const source = isChangedSnapshot(snapshot) ? "changedNode" : "snapshot";

  for (const element of snapshot.elements.slice(0, MAX_SNAPSHOT_ELEMENTS)) {
    const candidate = buildElementAssertionCandidate(element, {
      source,
      exportLimits: limits,
      summary,
      snapshot
    });
    if (candidate) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

function buildActionAssertionCandidate(action, exportLimits, summary) {
  const type = getActionAssertionType(action);
  if (!type) {
    return null;
  }

  return createAssertionCandidate({
    type,
    text: getActionAssertionText(action),
    source: "interactionAction",
    relatedElementName: action.elementName || "",
    bestLocator: action.bestLocator || action.locator || "",
    confidence: 0.74,
    isVisible: action.isVisible !== false,
    exportLimits,
    summary
  });
}

function buildResultAssertionCandidate(result, exportLimits, summary) {
  const type = getResultAssertionType(result);
  if (!type) {
    return null;
  }

  return createAssertionCandidate({
    type,
    text: getResultAssertionText(result),
    source: "interactionResult",
    relatedElementName: result.name || result.title || "",
    bestLocator: result.bestLocator || "",
    confidence: getAssertionConfidence(type, "interactionResult"),
    isVisible: result.isVisible !== false,
    exportLimits,
    summary
  });
}

function buildElementAssertionCandidate(element, options = {}) {
  if (!isAssertionRelevantElement(element)) {
    return null;
  }

  const type = getElementAssertionType(element, options.snapshot);
  if (!type) {
    return null;
  }

  return createAssertionCandidate({
    type,
    text: getElementAssertionText(element, type),
    source: options.source || "selectedElement",
    relatedElementName: element.name || element.elementName || "",
    bestLocator: element.bestLocator || element.locator || element.css || element.xpath || "",
    confidence: getAssertionConfidence(type, options.source || "selectedElement"),
    isVisible: element.isVisible !== false,
    exportLimits: options.exportLimits,
    summary: options.summary
  });
}

function createAssertionCandidate(options = {}) {
  const exportLimits = getAssertionExportLimits(options.exportLimits || {});
  const summary = options.summary || null;

  if (exportLimits.skipHiddenAssertionText && options.isVisible === false) {
    if (summary) {
      summary.hiddenTextSkipped += 1;
    }
    return null;
  }

  const normalized = normalizeAssertionText(options.text, {
    maxLength: exportLimits.maxAssertionTextLength
  });

  if (!normalized.normalizedText || isLowValueAssertionText(normalized.normalizedText)) {
    return null;
  }

  if (normalized.wasTruncated && summary) {
    summary.longTextTruncated += 1;
  }

  return {
    id: options.id || "",
    type: options.type || "interactionResultText",
    text: normalized.rawText,
    normalizedText: normalized.normalizedText,
    recommendedAssertion: getRecommendedAssertion(options.type, normalized),
    confidence: Number(options.confidence) || getAssertionConfidence(options.type, options.source),
    source: options.source || "selectedElement",
    relatedElementName: normalizeText(options.relatedElementName || ""),
    bestLocator: options.bestLocator || ""
  };
}

function dedupeAndLimitAssertionCandidates(candidates, exportLimits, summary) {
  const limits = getAssertionExportLimits(exportLimits || {});
  const normalizedCandidates = candidates.filter(Boolean);
  if (!limits.skipDuplicateAssertionText) {
    const sorted = normalizedCandidates.sort(compareAssertionCandidatesForExport);
    if (sorted.length > limits.maxAssertionCandidates) {
      if (summary) {
        summary.limitReached = true;
      }
      return sorted.slice(0, limits.maxAssertionCandidates);
    }
    return sorted;
  }

  const byTextAndType = new Map();

  for (const candidate of normalizedCandidates) {
    const key = `${candidate.normalizedText}|${candidate.type}`;
    const existing = byTextAndType.get(key);

    if (!existing) {
      byTextAndType.set(key, candidate);
      continue;
    }

    if (summary) {
      summary.duplicatesSkipped += 1;
    }

    if (compareAssertionCandidatePriority(candidate, existing) > 0) {
      byTextAndType.set(key, candidate);
    }
  }

  const deduped = Array.from(byTextAndType.values()).sort(compareAssertionCandidatesForExport);
  if (deduped.length > limits.maxAssertionCandidates) {
    if (summary) {
      summary.limitReached = true;
    }
    return deduped.slice(0, limits.maxAssertionCandidates);
  }

  return deduped;
}

function getActionAssertionType(action) {
  const category = action?.elementCategory || action?.actualTarget?.elementCategory || "";
  const role = action?.actualTarget?.role || action?.role || "";
  const tag = action?.actualTarget?.tag || action?.tag || "";

  if (category === "button" || role === "button" || tag === "button") {
    return "buttonText";
  }
  if (category === "link" || role === "link" || tag === "a") {
    return "linkText";
  }
  if (category === "formControl" || ["textbox", "combobox", "checkbox", "radio"].includes(role)) {
    return "inputLabel";
  }

  return "";
}

function getActionAssertionText(action) {
  return normalizeText(action?.text || toReadableName(action?.elementName || "") || action?.value || "");
}

function getResultAssertionType(result) {
  if (!result || result.type === "none" || result.type === "lowValueInteraction") {
    return "";
  }

  if (result.type === "modal" || /modal|dialog/i.test(`${result.interactionType || ""} ${result.name || ""}`)) {
    return "modalTitle";
  }
  if (result.type === "toast") {
    return getMessageAssertionType(result.title || result.description || result.name, "toastMessage");
  }
  if (result.type === "validationMessage") {
    return "validationMessage";
  }
  if (/error|invalid|failed|failure/i.test(`${result.type || ""} ${result.interactionType || ""} ${result.title || ""}`)) {
    return "errorMessage";
  }
  if (/success|saved|created|updated|complete|completed/i.test(`${result.type || ""} ${result.interactionType || ""} ${result.title || ""}`)) {
    return "successMessage";
  }

  return result.title || result.description ? "interactionResultText" : "";
}

function getResultAssertionText(result) {
  return result?.title || result?.description || toReadableName(result?.name || "");
}

function isAssertionRelevantElement(element) {
  if (!element || element.elementCategory === "decorativeMedia" || element.isVisible === false) {
    return false;
  }

  if (isLowImpactRepeatedNavigationElement(element)) {
    return false;
  }

  if (["footer", "navigation"].includes(element.domContext || "") && !element.isInteractive) {
    return false;
  }

  return true;
}

function getElementAssertionType(element, snapshot) {
  const category = element?.elementCategory || "";
  const role = element?.role || "";
  const tokens = `${element?.name || ""} ${element?.text || ""} ${element?.className || ""} ${element?.id || ""}`.toLowerCase();

  if ((category === "modal" || category === "dialog" || role === "dialog" || element?.modalState?.isModalCandidate) && element?.modalState?.isOpen !== false) {
    return "modalTitle";
  }
  if (category === "toast" || ["alert", "status"].includes(role)) {
    return getMessageAssertionType(element.text || element.name, "toastMessage");
  }
  if (category === "validationMessage" || /validation|invalid|field-error/.test(tokens)) {
    return "validationMessage";
  }
  if (/error|failed|failure/.test(tokens)) {
    return "errorMessage";
  }
  if (/success|saved|created|updated|complete|completed/.test(tokens)) {
    return "successMessage";
  }
  if (category === "button" && element.isInteractive && snapshot?.changeType) {
    return "buttonText";
  }
  if (category === "link" && element.isInteractive && snapshot?.changeType) {
    return "linkText";
  }

  if (snapshot && isChangedSnapshot(snapshot) && element.text && element.text.length <= DEFAULT_ASSERTION_EXPORT_LIMITS.maxAssertionTextLength) {
    return "changedText";
  }

  return "";
}

function getElementAssertionText(element, type) {
  if (type === "modalTitle") {
    return element.elementName || element.name || element.text || "";
  }

  return element.text || element.elementName || element.name || "";
}

function getMessageAssertionType(text, fallbackType) {
  const value = String(text || "");
  if (/success|saved|created|updated|complete|completed/i.test(value)) {
    return "successMessage";
  }
  if (/error|invalid|failed|failure|required|missing/i.test(value)) {
    return fallbackType === "toastMessage" ? "errorMessage" : "validationMessage";
  }
  return fallbackType;
}

function getRecommendedAssertion(type, normalizedText) {
  if (!normalizedText?.normalizedText) {
    return "notRecommended";
  }
  if (normalizedText.wasTruncated || normalizedText.length > 100) {
    return "contains";
  }

  if (type === "modalTitle") {
    return "visibleText";
  }
  if (["toastMessage", "successMessage", "errorMessage", "validationMessage", "interactionResultText", "changedText"].includes(type)) {
    return "contains";
  }
  if (["buttonText", "linkText", "inputLabel", "pageHeading"].includes(type)) {
    return "visibleText";
  }

  return "contains";
}

function getAssertionConfidence(type, source) {
  const sourceBoost = {
    interactionResult: 0.08,
    changedNode: 0.04,
    snapshot: 0.02,
    interactionAction: 0,
    selectedElement: -0.05
  }[source] || 0;
  const base = {
    modalTitle: 0.88,
    toastMessage: 0.84,
    validationMessage: 0.86,
    errorMessage: 0.84,
    successMessage: 0.84,
    buttonText: 0.78,
    linkText: 0.76,
    inputLabel: 0.76,
    changedText: 0.7,
    interactionResultText: 0.72,
    pageHeading: 0.68
  }[type] || 0.65;

  return clamp(Number((base + sourceBoost).toFixed(2)), 0, 0.98);
}

function compareAssertionCandidatePriority(candidate, existing) {
  const sourcePriority =
    (ASSERTION_SOURCE_PRIORITY[candidate.source] || 0) -
    (ASSERTION_SOURCE_PRIORITY[existing.source] || 0);
  if (sourcePriority !== 0) {
    return sourcePriority;
  }

  return (Number(candidate.confidence) || 0) - (Number(existing.confidence) || 0);
}

function compareAssertionCandidatesForExport(left, right) {
  const sourcePriority =
    (ASSERTION_SOURCE_PRIORITY[right.source] || 0) -
    (ASSERTION_SOURCE_PRIORITY[left.source] || 0);
  if (sourcePriority !== 0) {
    return sourcePriority;
  }

  return (Number(right.confidence) || 0) - (Number(left.confidence) || 0);
}

function isChangedSnapshot(snapshot) {
  const changeType = `${snapshot?.changeType || ""} ${snapshot?.snapshotType || ""}`.toLowerCase();
  return /changed|visibility change|added node|opened|appeared/.test(changeType);
}

function isLowValueAssertionText(text) {
  const normalized = String(text || "").trim().toLowerCase();
  return (
    normalized.length < 2 ||
    ["button", "link", "element", "modal", "dialog", "close", "ok"].includes(normalized) ||
    /^\d+$/.test(normalized)
  );
}

function truncateAssertionText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.slice(0, Math.max(0, maxLength - 1)).trimEnd();
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace >= Math.floor(maxLength * 0.6)) {
    return truncated.slice(0, lastSpace).trimEnd();
  }

  return truncated;
}

function createAssertionExtractionSummary(enabled) {
  return {
    enabled: Boolean(enabled),
    totalCandidates: 0,
    duplicatesSkipped: 0,
    hiddenTextSkipped: 0,
    longTextTruncated: 0,
    limitReached: false
  };
}

function getAssertionExportLimits(options = {}) {
  return {
    maxAssertionCandidates: getPositiveIntegerOption(
      options.maxAssertionCandidates,
      DEFAULT_ASSERTION_EXPORT_LIMITS.maxAssertionCandidates
    ),
    maxAssertionCandidatesPerFlow: getPositiveIntegerOption(
      options.maxAssertionCandidatesPerFlow,
      DEFAULT_ASSERTION_EXPORT_LIMITS.maxAssertionCandidatesPerFlow
    ),
    maxAssertionTextLength: getPositiveIntegerOption(
      options.maxAssertionTextLength,
      DEFAULT_ASSERTION_EXPORT_LIMITS.maxAssertionTextLength
    ),
    skipDuplicateAssertionText: getOptionBoolean(
      options,
      "skipDuplicateAssertionText",
      DEFAULT_ASSERTION_EXPORT_LIMITS.skipDuplicateAssertionText
    ),
    skipHiddenAssertionText: getOptionBoolean(
      options,
      "skipHiddenAssertionText",
      DEFAULT_ASSERTION_EXPORT_LIMITS.skipHiddenAssertionText
    )
  };
}

function shouldIncludeAssertionCandidates(options = {}, context = {}) {
  if (Object.prototype.hasOwnProperty.call(options, "includeAssertionCandidates")) {
    return Boolean(options.includeAssertionCandidates);
  }

  return Boolean(
    (Array.isArray(context.userFlows) && context.userFlows.length) ||
      (Array.isArray(context.recordedActions) && context.recordedActions.length) ||
      (Array.isArray(context.snapshots) && context.snapshots.length)
  );
}

function getOptionBoolean(options, key, defaultValue) {
  if (!options || !Object.prototype.hasOwnProperty.call(options, key)) {
    return Boolean(defaultValue);
  }
  return Boolean(options[key]);
}

function getPositiveIntegerOption(value, defaultValue) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : defaultValue;
}

function inferBusinessElementSuffix(snapshot) {
  const tag = snapshot.tag || "";
  const role = snapshot.role || "";
  const type = snapshot.type || "";
  const category = snapshot.elementCategory || "";
  const tokens = `${snapshot.className || ""} ${snapshot.id || ""} ${role}`.toLowerCase();

  if (category === "modal" || role === "dialog" || /modal|dialog/.test(tokens)) {
    return "Modal";
  }
  if (category === "dialog") {
    return "Dialog";
  }
  if (/drawer/.test(tokens)) {
    return "Drawer";
  }
  if (category === "tooltip" || role === "tooltip" || /tooltip/.test(tokens)) {
    return "Tooltip";
  }
  if (category === "toast" || ["alert", "status"].includes(role) || /toast|snackbar|notification/.test(tokens)) {
    return "Toast";
  }
  if (category === "button" || tag === "button" || role === "button" || ["button", "submit", "reset"].includes(type)) {
    return "Button";
  }
  if (category === "link" || tag === "a" || role === "link") {
    return "Link";
  }
  if (type === "checkbox" || role === "checkbox") {
    return "Checkbox";
  }
  if (type === "radio" || role === "radio") {
    return "Radio";
  }
  if (category === "dropdown" || tag === "select" || ["combobox", "listbox"].includes(role)) {
    return "Dropdown";
  }
  if (category === "formControl" || tag === "textarea" || role === "textbox" || isTextInputType(type)) {
    return "Input";
  }
  if (tag === "form" || role === "form") {
    return "Form";
  }
  if (tag === "iframe") {
    return "Iframe";
  }
  if (category === "table" || tag === "table" || role === "table") {
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

  return normalizeText(
    element.innerText ||
      element.textContent ||
      getEmbeddedVisualLabel(element) ||
      element.getAttribute("name") ||
      element.id
  ).slice(0, 80);
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
  if (!element?.isVisible || !element.locator || [action?.locator, action?.bestLocator].includes(element.locator)) {
    return false;
  }

  return isBusinessRelevantSnapshot(element);
}

function toReadableElementLabel(element) {
  const label = normalizeText(element.text || toReadableName(element.name || element.locator));
  const suffix = inferBusinessElementSuffix({
    tag: element.tag,
    role: element.role,
    elementCategory: element.elementCategory,
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

  recordModalTransitionSnapshots();
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
      addCaptureSnapshot(target, baseChangeType, { detached, modalStateCache: captureModalStateCache });
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

  addCaptureSnapshot(element, "visibility change", {
    attributeName: mutation.attributeName,
    modalStateCache: captureModalStateCache
  });
}

function addCaptureSnapshot(element, baseChangeType, options = {}) {
  if (shouldIgnoreElement(element)) {
    return;
  }

  const detached = Boolean(options.detached);
  const modalStateCache = options.modalStateCache || captureModalStateCache;
  const modalTransition =
    options.modalTransitionDetails ||
    buildModalTransition(element, baseChangeType, detached, modalStateCache);
  const modalState = modalTransition.currentState || buildModalState(element, { detached });

  if (modalState.isModalCandidate && !modalTransition.type) {
    return;
  }

  const changeType = modalTransition.snapshotType || classifyChangeType(element, baseChangeType, detached);
  const elements =
    modalTransition.type === "closed"
      ? [buildElementSnapshot(element, { detached })]
      : collectSnapshotElements(element, {
          detached,
          includeHidden: modalTransition.type === "opened" ? false : captureOptions.includeHidden || detached
        });

  if (!elements.length || isDuplicateSnapshot(changeType, elements)) {
    return;
  }

  const primaryElement = elements[0];
  capturedSnapshots.push({
    snapshotName: buildSnapshotName(changeType, primaryElement),
    timestamp: new Date().toISOString(),
    changeType,
    snapshotType: changeType,
    elementName: primaryElement.elementName || "",
    isVisible: Boolean(primaryElement.isVisible),
    isInteractable: Boolean(primaryElement.isInteractable),
    modalState: primaryElement.modalState || modalState || {},
    newElements: modalTransition.type === "closed" ? [] : elements.slice(1),
    elements
  });
}

function recordModalTransitionSnapshots() {
  if (capturedSnapshots.length >= MAX_SNAPSHOTS) {
    return;
  }

  for (const entry of collectModalTransitionEntries(captureModalStateCache)) {
    if (capturedSnapshots.length >= MAX_SNAPSHOTS) {
      break;
    }
    addCaptureSnapshot(entry.element, entry.baseChangeType, {
      detached: entry.detached,
      attributeName: entry.attributeName,
      modalStateCache: captureModalStateCache,
      modalTransitionDetails: entry.modalTransitionDetails
    });
  }
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

  return dedupeAutomationSourceElements(
    uniqueElements(candidates)
      .filter((element) => !shouldIgnoreElement(element))
      .filter((element) => includeHidden || detached || isElementVisible(element))
  )
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

  if (getModalCandidateInfo(element).isModalCandidate) {
    return true;
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
  const modalState = buildModalState(element, { detached });

  if (modalState.isModalCandidate) {
    return isRemoval || !modalState.isOpen ? "Modal Closed" : "Modal Opened";
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
          snapshotType: snapshot.snapshotType || snapshot.changeType || "",
          elementName: snapshot.elementName || "",
          isVisible: Boolean(snapshot.isVisible),
          isInteractable: Boolean(snapshot.isInteractable),
          modalState: snapshot.modalState || {},
          newElements: Array.isArray(snapshot.newElements) ? snapshot.newElements : [],
          elements: snapshot.elements
        }))
    : [];
}

function applyLocatorIssues(elements) {
  const warningMap = new Map();

  for (const element of elements) {
    element.locatorIssue = "";
    element.issueSeverity = "none";
  }

  for (const attribute of TEST_ID_ATTRIBUTES) {
    markDuplicateIssue(elements, attribute, `Duplicate ${attribute}`, warningMap);
  }

  markDuplicateIssue(elements, "id", "Non-unique ID", warningMap);
  markDuplicateIssue(elements, "css", "Duplicate CSS selector", warningMap);
  markDuplicateIssue(elements, "xpath", "Duplicate XPath", warningMap);
  markDuplicateIssue(elements, "textLocator", "Duplicate text locator", warningMap);

  const dynamicElements = elements.filter(isDynamicLocatorElement);
  for (const element of dynamicElements) {
    const severity = getDynamicIssueSeverity(element);
    setLocatorIssue(element, "Dynamic locator detected", severity);
    addIssueWarning(warningMap, {
      type: "Dynamic locator detected",
      count: 1,
      severity,
      affectedCategory: element.elementCategory || "unknown",
      recommendation: "Use stable test attributes for interactive elements with generated IDs or classes."
    });
  }

  return Array.from(warningMap.values()).sort((left, right) => {
    const typeOrder = WARNING_TYPES.indexOf(left.type) - WARNING_TYPES.indexOf(right.type);
    if (typeOrder !== 0) {
      return typeOrder;
    }
    return ISSUE_SEVERITY_RANK[right.severity] - ISSUE_SEVERITY_RANK[left.severity];
  });
}

function addBehaviorWarnings(warnings, allElements, flows) {
  const hiddenModalCount = allElements.filter(
    (element) =>
      element.modalState?.isModalCandidate &&
      !element.modalState.isOpen &&
      (!element.isVisible || !element.isInteractable)
  ).length;

  if (hiddenModalCount) {
    warnings.push({
      type: "Hidden modal detected",
      count: hiddenModalCount,
      severity: "medium",
      affectedCategory: "modal",
      recommendation: "Do not generate automation steps from hidden modal content until the modal becomes visible."
    });
  }

  const lowValueCount = flows.filter((flow) => flow.result?.type === "lowValueInteraction").length;
  if (lowValueCount) {
    warnings.push({
      type: "Low-value interaction",
      count: lowValueCount,
      severity: "low",
      affectedCategory: "interaction",
      recommendation:
        "Ignore interactions that do not produce navigation, visible UI change, form input, modal, dropdown, toast, or validation result."
    });
  }
}

function markDuplicateIssue(elements, key, issueType, warningMap) {
  const groups = new Map();

  for (const element of elements) {
    const value = normalizeCollisionValue(getCollisionValue(element, key), key);
    if (!value) {
      continue;
    }

    if (!groups.has(value)) {
      groups.set(value, []);
    }
    groups.get(value).push(element);
  }

  for (const group of groups.values()) {
    if (group.length <= 1) {
      continue;
    }

    const severity = getDuplicateIssueSeverity(group, key, issueType);
    const affectedCategory = getAffectedCategory(group);
    const recommendation = getDuplicateIssueRecommendation(group, key, issueType, severity);
    for (const element of group) {
      setLocatorIssue(element, issueType, severity);
    }
    addIssueWarning(warningMap, {
      type: issueType,
      count: group.length,
      severity,
      affectedCategory,
      recommendation
    });
  }
}

function getCollisionValue(element, key) {
  if (TEST_ID_ATTRIBUTES.includes(key)) {
    return element.testAttributes?.[key] || "";
  }

  return element[key] || "";
}

function getDuplicateIssueSeverity(group, key, issueType) {
  if (group.every((element) => element.elementCategory === "decorativeMedia")) {
    return "low";
  }

  if (key === "textLocator" && group.every(isLowImpactRepeatedNavigationElement)) {
    return "low";
  }

  if (TEST_ID_ATTRIBUTES.includes(key)) {
    return hasDifferentBusinessActions(group) || group.filter(isBusinessActionSnapshot).length > 1 ? "high" : "medium";
  }

  if (issueType === "Duplicate text locator") {
    const actionButtons = group.filter((element) => element.elementCategory === "button" && element.isInteractive);
    if (actionButtons.length > 1) {
      return "high";
    }
    return group.some(isBusinessRelevantSnapshot) ? "medium" : "low";
  }

  if (issueType === "Duplicate XPath") {
    return group.some(isBusinessActionSnapshot) ? "high" : "medium";
  }

  if (issueType === "Duplicate CSS selector") {
    return group.some(isBusinessActionSnapshot) ? "high" : "medium";
  }

  if (issueType === "Non-unique ID") {
    return group.some(isBusinessActionSnapshot) ? "high" : "medium";
  }

  return group.some(isBusinessRelevantSnapshot) ? "medium" : "low";
}

function getDynamicIssueSeverity(element) {
  if (element.elementCategory === "decorativeMedia") {
    return "low";
  }

  if (isBusinessActionSnapshot(element)) {
    return "high";
  }

  return isBusinessRelevantSnapshot(element) ? "medium" : "low";
}

function getAffectedCategory(group) {
  const categories = Array.from(
    new Set(group.map((element) => element.elementCategory || "unknown").filter(Boolean))
  );

  if (categories.length === 1) {
    return categories[0];
  }

  const priority = ["button", "formControl", "link", "dropdown", "modal", "dialog", "table", "media"];
  return priority.find((category) => categories.includes(category)) || "mixed";
}

function getDuplicateIssueRecommendation(group, key, issueType, severity) {
  if (severity === "low") {
    return "Low-impact repeated locator; prioritize business actions before changing this locator.";
  }

  if (TEST_ID_ATTRIBUTES.includes(key)) {
    return "Use unique test attributes for different business actions.";
  }

  if (issueType === "Duplicate text locator") {
    return "Use a parent container or data-testid to disambiguate repeated buttons.";
  }

  if (issueType === "Duplicate XPath") {
    return "Avoid using long XPath as primary locator.";
  }

  if (issueType === "Duplicate CSS selector" && group.some((element) => element.locatorType === "css")) {
    return "Add data-testid to repeated action buttons.";
  }

  if (issueType === "Non-unique ID") {
    return "Use unique id values or prefer data-testid for automation targets.";
  }

  return "Add stable, unique locators to business-critical elements.";
}

function hasDifferentBusinessActions(group) {
  const businessElements = group.filter(isBusinessRelevantSnapshot);
  const names = new Set(
    businessElements
      .map((element) => normalizeText(element.elementName || element.text || element.ariaLabel || element.bestLocator).toLowerCase())
      .filter(Boolean)
  );

  return businessElements.length > 1 && names.size > 1;
}

function isLowImpactRepeatedNavigationElement(element) {
  return (
    ["footer", "navigation", "header"].includes(element.domContext || "") &&
    ["link", "navigation", "unknown"].includes(element.elementCategory || "unknown")
  );
}

function isBusinessRelevantSnapshot(element) {
  if (!element || element.elementCategory === "decorativeMedia") {
    return false;
  }

  if (element.elementCategory === "media" && !element.isInteractive) {
    return false;
  }

  return (
    Boolean(element.isInteractive) ||
    [
      "formControl",
      "button",
      "link",
      "modal",
      "dialog",
      "dropdown",
      "toast",
      "validationMessage",
      "table"
    ].includes(element.elementCategory)
  );
}

function isBusinessActionSnapshot(element) {
  return (
    isBusinessRelevantSnapshot(element) &&
    (Boolean(element.isInteractive) || ["button", "formControl", "link", "dropdown"].includes(element.elementCategory))
  );
}

function addIssueWarning(warningMap, warning) {
  const severity = warning.severity || "medium";
  const affectedCategory = warning.affectedCategory || "unknown";
  const key = `${warning.type}|${severity}|${affectedCategory}|${warning.recommendation || ""}`;
  const existing = warningMap.get(key);

  if (existing) {
    existing.count += warning.count || 0;
    return;
  }

  warningMap.set(key, {
    type: warning.type,
    count: warning.count || 0,
    severity,
    affectedCategory,
    recommendation: warning.recommendation || ""
  });
}

function setLocatorIssue(element, issueType, severity = "medium") {
  const currentSeverity = element.issueSeverity || "none";
  if (ISSUE_SEVERITY_RANK[severity] >= ISSUE_SEVERITY_RANK[currentSeverity]) {
    element.locatorIssue = issueType;
    element.issueSeverity = severity;
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
  const businessElements = elements.filter(isBusinessRelevantSnapshot);
  const scoringElements = businessElements.length
    ? businessElements
    : elements.filter((element) => element.elementCategory !== "decorativeMedia");
  const total = scoringElements.length || 1;
  const interactiveElements = scoringElements.filter((element) => element.isInteractive);
  const actionElements = scoringElements.filter(
    (element) => ["button", "link"].includes(element.elementCategory) || element.isInteractive
  );
  const formControls = scoringElements.filter((element) => element.elementCategory === "formControl");
  const visibleBusinessCount = scoringElements.filter((element) => element.isVisible).length;
  const visibleInteractiveCount = interactiveElements.filter((element) => element.isVisible).length;
  const testAttributeCount = scoringElements.filter(hasTestAttributeSnapshot).length;
  const uniqueIdCount = countUniqueValues(scoringElements, "id");
  const uniqueNameCount = countUniqueValues(scoringElements, "name");
  const stableAriaLabelCount = scoringElements.filter(hasStableAriaLabelSnapshot).length;
  const labeledFormControlCount = formControls.filter(hasFormControlLabelSnapshot).length;
  const namedActionCount = actionElements.filter(hasAccessibleNameSnapshot).length;
  const missingAccessibleNameCount = actionElements.filter(isMissingAccessibleNameSnapshot).length;
  const highIssueCount = scoringElements.filter((element) => element.issueSeverity === "high").length;
  const mediumIssueCount = scoringElements.filter((element) => element.issueSeverity === "medium").length;
  const dynamicInteractiveCount = scoringElements.filter(
    (element) => isBusinessActionSnapshot(element) && isDynamicLocatorElement(element)
  ).length;
  const cssFallbackCount = scoringElements.filter((element) => element.locatorType === "css").length;
  const xpathFallbackCount = scoringElements.filter((element) => element.locatorType === "xpath").length;
  const longXPathCount = scoringElements.filter(
    (element) => element.locatorType === "xpath" && isLongXPath(element.bestLocator || element.xpath)
  ).length;
  const iframeCount = elements.filter((element) => element.tag === "iframe").length;
  const hiddenInteractiveCount = interactiveElements.filter(
    (element) => !element.isVisible && !isHiddenLowImpactSnapshot(element)
  ).length;
  const formLabelRatio = formControls.length ? labeledFormControlCount / formControls.length : 1;
  const actionNameRatio = actionElements.length ? namedActionCount / actionElements.length : 1;
  const visibleBusinessRatio = visibleBusinessCount / total;
  const visibleInteractiveRatio = interactiveElements.length
    ? visibleInteractiveCount / interactiveElements.length
    : visibleBusinessRatio;
  const stableLocatorRatio = Math.min(
    1,
    (testAttributeCount + uniqueIdCount + uniqueNameCount + stableAriaLabelCount) / total
  );

  const businessElementScore = clamp(
    Math.round(45 + visibleBusinessRatio * 25 + formLabelRatio * 15 + actionNameRatio * 15 - hiddenInteractiveCount * 4),
    0,
    100
  );
  const locatorQualityScore = clamp(
    Math.round(
      50 +
        stableLocatorRatio * 35 +
        Math.min(10, (testAttributeCount / total) * 20) -
        Math.min(24, highIssueCount * 7) -
        Math.min(16, mediumIssueCount * 3) -
        Math.min(14, dynamicInteractiveCount * 4) -
        Math.min(12, longXPathCount * 5) -
        Math.min(10, cssFallbackCount + xpathFallbackCount * 2)
    ),
    0,
    100
  );
  const interactionReadinessScore = clamp(
    Math.round(
      55 +
        visibleInteractiveRatio * 25 +
        actionNameRatio * 10 +
        formLabelRatio * 10 -
        Math.min(18, hiddenInteractiveCount * 6) -
        Math.min(16, missingAccessibleNameCount * 5) -
        (iframeCount ? Math.min(10, iframeCount * 3) : 0)
    ),
    0,
    100
  );
  const score = clamp(
    Math.round(businessElementScore * 0.35 + locatorQualityScore * 0.4 + interactionReadinessScore * 0.25),
    0,
    100
  );

  const strengths = [];
  const weaknesses = [];
  const recommendations = [];

  if (testAttributeCount) {
    strengths.push("Stable test attributes detected");
  }
  if (uniqueIdCount) {
    strengths.push("Unique IDs detected");
  }
  if (uniqueNameCount) {
    strengths.push("Unique names detected");
  }
  if (stableAriaLabelCount) {
    strengths.push("Stable aria-label locators detected");
  }
  if (hasStableFormLocators(elements)) {
    strengths.push("Stable form locators available");
  }
  if (visibleInteractiveRatio >= 0.85) {
    strengths.push("Most interactive business elements are visible");
  }
  if (actionNameRatio >= 0.85) {
    strengths.push("Buttons and links generally have accessible names");
  }

  if (hasIssueType(warnings, "Duplicate CSS selector", "high")) {
    weaknesses.push("Duplicate CSS locators affect interactive business elements");
    recommendations.push("Add data-testid to repeated action buttons.");
  }
  if (hasIssueType(warnings, "Duplicate XPath")) {
    weaknesses.push("Duplicate XPath locators found");
  }
  if (hasIssueType(warnings, "Duplicate text locator", "high")) {
    weaknesses.push("Repeated action text may be ambiguous");
    recommendations.push("Use a parent container or data-testid to disambiguate repeated buttons.");
  }
  if (hasIssueType(warnings, "Non-unique ID", "high")) {
    weaknesses.push("Non-unique IDs affect business elements");
  }
  if (dynamicInteractiveCount) {
    weaknesses.push("Dynamic locators detected on interactive elements");
  }
  if (hiddenInteractiveCount) {
    weaknesses.push("Hidden interactive elements detected");
  }
  if (longXPathCount) {
    weaknesses.push("Long XPath locators required for business elements");
    recommendations.push("Avoid using long XPath as primary locator.");
  }
  if (iframeCount) {
    weaknesses.push("Iframe dependency detected");
  }
  if (missingAccessibleNameCount) {
    weaknesses.push("Some button/link targets are missing accessible names");
    recommendations.push("Provide aria-label for icon-only buttons.");
  }
  if (!testAttributeCount && !uniqueIdCount && !uniqueNameCount && !stableAriaLabelCount) {
    weaknesses.push("Few stable attributes found on business elements");
    recommendations.push("Add data-testid to repeated action buttons.");
  }
  if (elements.some((element) => /inside an interactive parent/i.test(element.targetingReason || ""))) {
    recommendations.push("Use parent button as locator instead of SVG child.");
  }

  return {
    score,
    businessElementScore,
    locatorQualityScore,
    interactionReadinessScore,
    strengths: strengths.length ? strengths : ["No major locator collisions detected"],
    weaknesses,
    recommendations: uniqueMessages(recommendations)
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

function hasStableAriaLabelSnapshot(element) {
  const ariaLabel = normalizeText(element.ariaLabel);
  return Boolean(
    ariaLabel &&
      element.locatorType === "aria-label" &&
      ariaLabel.length <= 80 &&
      !looksDynamicValue(ariaLabel)
  );
}

function hasFormControlLabelSnapshot(element) {
  if (element.elementCategory !== "formControl") {
    return false;
  }

  return Boolean(normalizeText(element.labelText || element.ariaLabel || element.placeholder || element.text));
}

function hasAccessibleNameSnapshot(element) {
  return Boolean(
    normalizeText(
      element.text ||
        element.ariaLabel ||
        element.labelText ||
        element.placeholder ||
        element.visualTarget?.ariaLabel ||
        element.visualTarget?.alt ||
        element.visualTarget?.title
    )
  );
}

function isMissingAccessibleNameSnapshot(element) {
  return (
    element.isVisible &&
    ["button", "link"].includes(element.elementCategory) &&
    !hasAccessibleNameSnapshot(element)
  );
}

function isHiddenLowImpactSnapshot(element) {
  return (
    !element.isVisible &&
    ["footer", "navigation", "header"].includes(element.domContext || "") &&
    ["link", "navigation"].includes(element.elementCategory || "")
  );
}

function hasIssueType(warnings, type, severity) {
  return warnings.some(
    (warning) => warning.type === type && (!severity || warning.severity === severity)
  );
}

function uniqueMessages(messages) {
  return Array.from(new Set(messages.filter(Boolean)));
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
      ["formControl", "button"].includes(element.elementCategory) &&
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
    getEmbeddedVisualLabel(element),
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

function isActuallyVisible(element) {
  const checks = createVisibilityChecks();

  if (!(element instanceof Element)) {
    return buildVisibilityResult(false, "Element does not exist.", checks);
  }

  if (!element.isConnected) {
    return buildVisibilityResult(false, "Element is not connected to the DOM.", checks);
  }

  const style = window.getComputedStyle(element);
  checks.display = style.display || "";
  checks.visibility = style.visibility || "";
  checks.opacity = style.opacity || "";
  checks.hiddenAttribute = element.hasAttribute("hidden");
  checks.ariaHidden = element.getAttribute("aria-hidden") === "true";
  checks.inert = element.hasAttribute("inert");

  const hiddenInfo = getHiddenElementOrAncestorInfo(element);
  if (hiddenInfo) {
    checks.ancestorHidden = hiddenInfo.element !== element;
    if (hiddenInfo.type === "hiddenAttribute") {
      checks.hiddenAttribute = hiddenInfo.element === element;
    }
    if (hiddenInfo.type === "ariaHidden") {
      checks.ariaHidden = hiddenInfo.element === element;
    }
    return buildVisibilityResult(
      false,
      "Element or ancestor is hidden by aria-hidden/display/visibility/opacity.",
      checks
    );
  }

  if (element instanceof HTMLInputElement && element.type === "hidden") {
    return buildVisibilityResult(false, "Input type hidden is not visible.", checks);
  }

  const rects = element.getClientRects();
  const rect = element.getBoundingClientRect();
  checks.hasBoundingBox = Boolean(rects.length && rect.width > 0 && rect.height > 0);
  if (!checks.hasBoundingBox) {
    return buildVisibilityResult(false, "Element does not have a visible bounding box.", checks);
  }

  checks.inViewport = isRectInsideViewport(rect);
  checks.reasonablyVisible = checks.inViewport || isRectReasonablyVisible(element, rect, style);
  if (!checks.reasonablyVisible) {
    return buildVisibilityResult(
      false,
      "Element is outside the viewport and is not reasonably visible.",
      checks
    );
  }

  return buildVisibilityResult(
    true,
    "Element has visible bounding box and visible computed style.",
    checks
  );
}

function isActuallyInteractable(element, visibilityResult) {
  const checks = createInteractabilityChecks();

  if (!(element instanceof Element)) {
    return buildInteractabilityResult(false, "Element does not exist.", checks);
  }

  const visibility = visibilityResult || isActuallyVisible(element);
  checks.isVisible = Boolean(visibility.isVisible);
  if (!visibility.isVisible) {
    return buildInteractabilityResult(false, visibility.visibilityReason || "Element is not visible.", checks);
  }

  checks.disabled = isDisabledForInteraction(element);
  checks.ariaDisabled = hasAriaDisabled(element);
  if (checks.disabled || checks.ariaDisabled) {
    return buildInteractabilityResult(false, "Element is disabled or aria-disabled.", checks);
  }

  const style = window.getComputedStyle(element);
  checks.pointerEvents = style.pointerEvents || "";
  const pointerBlocker = getPointerEventsBlocker(element);
  checks.pointerEventsBlocked = Boolean(pointerBlocker);
  if (pointerBlocker) {
    return buildInteractabilityResult(false, "Element or ancestor has pointer-events:none.", checks);
  }

  const coverage = getCenterPointCoverage(element);
  checks.centerPointChecked = coverage.checked;
  checks.centerPointCovered = coverage.covered;
  checks.coveringElement = coverage.coveringElement;
  if (coverage.covered) {
    return buildInteractabilityResult(false, "Element center point is covered by another element.", checks);
  }

  checks.focusable = isFocusableElement(element);
  checks.clickable = isClickableElement(element);
  checks.hasBehavior = hasInteractableBehavior(element);
  if (!checks.focusable && !checks.clickable && !checks.hasBehavior) {
    return buildInteractabilityResult(
      false,
      "Element is visible but does not expose focusable, clickable, or interactive behavior.",
      checks
    );
  }

  return buildInteractabilityResult(
    true,
    "Element is visible, enabled, and receives pointer events.",
    checks
  );
}

function buildModalState(element, options = {}) {
  const candidateInfo = getModalCandidateInfo(element);
  const visibilityResult = options.visibilityResult || (
    options.detached ? buildDetachedVisibilityResult(element) : isActuallyVisible(element)
  );
  const interactabilityResult = options.interactabilityResult || (
    options.detached ? buildDetachedInteractabilityResult() : isActuallyInteractable(element, visibilityResult)
  );
  const descendantInteractable =
    candidateInfo.isModalCandidate &&
    !options.detached &&
    !interactabilityResult.isInteractable &&
    hasVisibleInteractableDescendant(element);
  const isVisible = Boolean(visibilityResult.isVisible);
  const isInteractable = Boolean(interactabilityResult.isInteractable || descendantInteractable);
  const isOpen = Boolean(candidateInfo.isModalCandidate && isVisible && isInteractable);

  return {
    isModalCandidate: Boolean(candidateInfo.isModalCandidate),
    isOpen,
    isVisible,
    isInteractable,
    reason: getModalStateReason(candidateInfo, visibilityResult, interactabilityResult, descendantInteractable, isOpen),
    candidateReason: candidateInfo.reason || ""
  };
}

function createVisibilityChecks() {
  return {
    display: "",
    visibility: "",
    opacity: "",
    hasBoundingBox: false,
    hiddenAttribute: false,
    ariaHidden: false,
    ancestorHidden: false,
    inert: false,
    inViewport: false,
    reasonablyVisible: false
  };
}

function createInteractabilityChecks() {
  return {
    isVisible: false,
    disabled: false,
    ariaDisabled: false,
    pointerEvents: "",
    pointerEventsBlocked: false,
    centerPointChecked: false,
    centerPointCovered: false,
    coveringElement: "",
    focusable: false,
    clickable: false,
    hasBehavior: false
  };
}

function buildVisibilityResult(isVisible, visibilityReason, visibilityChecks) {
  return {
    isVisible: Boolean(isVisible),
    visibilityReason,
    visibilityChecks: {
      ...createVisibilityChecks(),
      ...(visibilityChecks || {})
    }
  };
}

function buildInteractabilityResult(isInteractable, interactabilityReason, interactabilityChecks) {
  return {
    isInteractable: Boolean(isInteractable),
    interactabilityReason,
    interactabilityChecks: {
      ...createInteractabilityChecks(),
      ...(interactabilityChecks || {})
    }
  };
}

function buildDetachedVisibilityResult(element) {
  const checks = createVisibilityChecks();
  if (element instanceof Element) {
    checks.hiddenAttribute = element.hasAttribute("hidden");
    checks.ariaHidden = element.getAttribute("aria-hidden") === "true";
  }
  return buildVisibilityResult(false, "Element is detached from the DOM.", checks);
}

function buildDetachedInteractabilityResult() {
  return buildInteractabilityResult(false, "Element is detached from the DOM.", createInteractabilityChecks());
}

function isElementVisible(element) {
  return isActuallyVisible(element).isVisible;
}

function getHiddenElementOrAncestorInfo(element) {
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const style = window.getComputedStyle(current);

    if (current.hasAttribute("hidden")) {
      return { element: current, type: "hiddenAttribute" };
    }
    if (current.getAttribute("aria-hidden") === "true") {
      return { element: current, type: "ariaHidden" };
    }
    if (current.hasAttribute("inert")) {
      return { element: current, type: "inert" };
    }
    if (style.display === "none") {
      return { element: current, type: "display" };
    }
    if (style.visibility === "hidden" || style.visibility === "collapse") {
      return { element: current, type: "visibility" };
    }
    if (isZeroOpacity(style.opacity)) {
      return { element: current, type: "opacity" };
    }

    current = current.parentElement;
  }

  return null;
}

function isZeroOpacity(value) {
  const opacity = Number.parseFloat(value);
  return Number.isFinite(opacity) && opacity <= 0;
}

function isRectInsideViewport(rect) {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  return rect.bottom > 0 && rect.right > 0 && rect.top < viewportHeight && rect.left < viewportWidth;
}

function isRectReasonablyVisible(element, rect, style) {
  const position = style.position || "";
  if (position === "fixed" || position === "sticky") {
    return false;
  }

  const margin = 24;
  const documentElement = document.documentElement;
  const body = document.body;
  const documentWidth = Math.max(
    documentElement.scrollWidth,
    body?.scrollWidth || 0,
    window.innerWidth || 0
  );
  const documentHeight = Math.max(
    documentElement.scrollHeight,
    body?.scrollHeight || 0,
    window.innerHeight || 0
  );
  const documentLeft = rect.left + (window.scrollX || window.pageXOffset || 0);
  const documentTop = rect.top + (window.scrollY || window.pageYOffset || 0);
  const documentRight = documentLeft + rect.width;
  const documentBottom = documentTop + rect.height;

  if (position === "absolute" && (documentRight < -margin || documentBottom < -margin)) {
    return false;
  }

  return (
    documentRight > -margin &&
    documentBottom > -margin &&
    documentLeft < documentWidth + margin &&
    documentTop < documentHeight + margin
  );
}

function isDisabledForInteraction(element) {
  return Boolean(
    element?.closest?.("[disabled]") ||
      (typeof element?.matches === "function" && element.matches(":disabled"))
  );
}

function hasAriaDisabled(element) {
  return Boolean(element?.closest?.("[aria-disabled='true']"));
}

function getPointerEventsBlocker(element) {
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const style = window.getComputedStyle(current);
    if (style.pointerEvents === "none") {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

function getCenterPointCoverage(element) {
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  if (
    rect.width <= 0 ||
    rect.height <= 0 ||
    centerX < 0 ||
    centerY < 0 ||
    centerX >= viewportWidth ||
    centerY >= viewportHeight
  ) {
    return {
      checked: false,
      covered: false,
      coveringElement: ""
    };
  }

  const topElement = document.elementFromPoint(centerX, centerY);
  if (!topElement || topElement === element || element.contains(topElement)) {
    return {
      checked: true,
      covered: false,
      coveringElement: ""
    };
  }

  return {
    checked: true,
    covered: true,
    coveringElement: getElementDescriptor(topElement)
  };
}

function isFocusableElement(element) {
  if (!(element instanceof Element) || isDisabledForInteraction(element) || hasAriaDisabled(element)) {
    return false;
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    return true;
  }

  if (element instanceof HTMLElement && element.tabIndex >= 0) {
    return true;
  }

  return matchesSelector(
    element,
    [
      "a[href]",
      "button",
      "input:not([type='hidden'])",
      "select",
      "textarea",
      "summary",
      "iframe",
      "dialog",
      "[contenteditable='true']"
    ].join(",")
  );
}

function isClickableElement(element) {
  return Boolean(
    element instanceof Element &&
      (isInteractiveAutomationElement(element) || hasClickHandlerSignal(element) || hasTabIndexClickSignal(element))
  );
}

function hasInteractableBehavior(element) {
  if (!(element instanceof Element)) {
    return false;
  }

  const tag = element.tagName.toLowerCase();
  const role = getRole(element);
  return (
    isInteractiveAutomationElement(element) ||
    ["dialog", "alertdialog", "button", "link", "checkbox", "radio", "textbox", "combobox", "listbox", "option", "tab"].includes(role) ||
    ["dialog", "details", "summary"].includes(tag) ||
    element.hasAttribute("popover") ||
    hasClickHandlerSignal(element)
  );
}

function hasVisibleInteractableDescendant(element) {
  if (!(element instanceof Element) || !element.querySelectorAll) {
    return false;
  }

  const candidates = Array.from(
    element.querySelectorAll(
      [
        "button",
        "a[href]",
        "input:not([type='hidden'])",
        "select",
        "textarea",
        "[role='button']",
        "[role='link']",
        "[role='checkbox']",
        "[role='radio']",
        "[role='textbox']",
        "[role='combobox']",
        "[contenteditable='true']",
        "[onclick]",
        "[tabindex]"
      ].join(",")
    )
  ).slice(0, 30);

  return candidates.some((candidate) => isActuallyInteractable(candidate).isInteractable);
}

function getModalCandidateInfo(element) {
  if (!(element instanceof Element)) {
    return {
      isModalCandidate: false,
      reason: ""
    };
  }

  const tag = element.tagName.toLowerCase();
  const role = getRole(element);
  const identityTokens = getModalIdentityTokens(element);

  if (tag === "dialog") {
    return {
      isModalCandidate: true,
      reason: "Native dialog element."
    };
  }
  if (role === "dialog" || role === "alertdialog") {
    return {
      isModalCandidate: true,
      reason: "Element uses a dialog role."
    };
  }
  if (element.getAttribute("aria-modal") === "true") {
    return {
      isModalCandidate: true,
      reason: "Element declares aria-modal=true."
    };
  }
  if (element.hasAttribute("popover")) {
    return {
      isModalCandidate: true,
      reason: "Element uses popover behavior."
    };
  }
  if (/(modal|dialog|popup|overlay|drawer)/i.test(identityTokens)) {
    return {
      isModalCandidate: true,
      reason: "Class, id, or attributes identify modal/dialog UI."
    };
  }
  if (isFixedOrAbsoluteOverlayPattern(element)) {
    return {
      isModalCandidate: true,
      reason: "Element matches a fixed or absolute overlay pattern."
    };
  }

  return {
    isModalCandidate: false,
    reason: ""
  };
}

function getModalIdentityTokens(element) {
  return [
    element.tagName || "",
    element.id || "",
    element.getAttribute("class") || "",
    element.getAttribute("role") || "",
    element.getAttribute("aria-modal") || "",
    element.getAttribute("aria-label") || "",
    element.getAttribute("data-testid") || "",
    element.getAttribute("data-cy") || "",
    element.getAttribute("data-test") || "",
    element.getAttribute("data-component") || "",
    element.getAttribute("data-ui") || "",
    element.getAttribute("data-state") || "",
    element.getAttribute("data-slot") || ""
  ]
    .join(" ")
    .toLowerCase();
}

function isFixedOrAbsoluteOverlayPattern(element) {
  if (!(element instanceof Element) || !element.isConnected) {
    return false;
  }

  const style = window.getComputedStyle(element);
  const position = style.position || "";
  if (position !== "fixed" && position !== "absolute") {
    return false;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const viewportArea = viewportWidth * viewportHeight || 1;
  const elementArea = rect.width * rect.height;
  const zIndex = Number.parseInt(style.zIndex, 10);
  const hasOverlaySize =
    elementArea >= viewportArea * 0.25 ||
    (rect.width >= viewportWidth * 0.6 && rect.height >= viewportHeight * 0.3);
  const hasOverlayStacking = position === "fixed" || (Number.isFinite(zIndex) && zIndex >= 10);

  return hasOverlaySize && hasOverlayStacking;
}

function getModalStateReason(candidateInfo, visibilityResult, interactabilityResult, descendantInteractable, isOpen) {
  if (!candidateInfo.isModalCandidate) {
    return "Element is not a modal/dialog candidate.";
  }
  if (isOpen) {
    if (descendantInteractable) {
      return "Dialog is visible and contains visible interactable content.";
    }
    return "Dialog is visible and not aria-hidden.";
  }
  if (!visibilityResult.isVisible) {
    return visibilityResult.visibilityReason || "Modal candidate is not visible.";
  }
  return interactabilityResult.interactabilityReason || "Modal candidate is visible but not interactable.";
}

function getElementDescriptor(element) {
  if (!(element instanceof Element)) {
    return "";
  }

  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const className = normalizeText(element.getAttribute("class") || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => `.${value}`)
    .join("");
  return `${tag}${id}${className}`.slice(0, 120);
}

function createPrimedModalStateCache(root = document) {
  const cache = new WeakMap();
  primeModalStateCache(cache, root);
  return cache;
}

function primeModalStateCache(cache, root = document) {
  for (const element of getModalCandidateElements(root)) {
    rememberModalState(cache, element, buildModalState(element));
  }
}

function getModalCandidateElements(root = document) {
  const candidates = [];

  if (root instanceof Element && getModalCandidateInfo(root).isModalCandidate) {
    candidates.push(root);
  }

  const queryRoot = root instanceof Element || root instanceof Document ? root : document;
  if (queryRoot.querySelectorAll) {
    candidates.push(...Array.from(queryRoot.querySelectorAll(MODAL_CANDIDATE_SELECTOR)));
  }

  if (queryRoot === document && document.body?.children) {
    candidates.push(...Array.from(document.body.children).filter((element) => getModalCandidateInfo(element).isModalCandidate));
  }

  return uniqueElements(candidates).filter((element) => getModalCandidateInfo(element).isModalCandidate);
}

function buildModalTransition(element, baseChangeType, detached, cache) {
  const candidateInfo = getModalCandidateInfo(element);
  const previousState = cache?.get(element) || null;
  const isKnownModal = candidateInfo.isModalCandidate || previousState?.isModalCandidate;

  if (!isKnownModal) {
    return {
      type: "",
      snapshotType: "",
      previousState,
      currentState: buildModalState(element, { detached })
    };
  }

  const currentState = detached
    ? {
        ...(previousState || buildModalState(element, { detached: true })),
        isVisible: false,
        isInteractable: false,
        isOpen: false,
        reason: "Modal candidate was detached from the DOM."
      }
    : buildModalState(element);
  let type = "";

  if (detached || baseChangeType === "removed node") {
    type = previousState?.isOpen ? "closed" : "";
  } else if (!previousState) {
    type = currentState.isOpen ? "opened" : "";
  } else if (!previousState.isOpen && currentState.isOpen) {
    type = "opened";
  } else if (previousState.isOpen && !currentState.isOpen) {
    type = "closed";
  }

  if (!detached && cache) {
    if (currentState.isModalCandidate) {
      rememberModalState(cache, element, currentState);
    } else {
      cache.delete(element);
    }
  }

  return {
    type,
    snapshotType: type === "opened" ? "Modal Opened" : type === "closed" ? "Modal Closed" : "",
    previousState,
    currentState
  };
}

function rememberModalState(cache, element, modalState) {
  if (!cache || !(element instanceof Element) || !modalState?.isModalCandidate) {
    return;
  }

  cache.set(element, {
    isModalCandidate: Boolean(modalState.isModalCandidate),
    isOpen: Boolean(modalState.isOpen),
    isVisible: Boolean(modalState.isVisible),
    isInteractable: Boolean(modalState.isInteractable),
    reason: modalState.reason || "",
    candidateReason: modalState.candidateReason || ""
  });
}

function collectModalTransitionEntries(cache) {
  return getModalCandidateElements(document)
    .map((element) => {
      const transition = buildModalTransition(element, "visibility change", false, cache);
      if (!transition.type) {
        return null;
      }
      return {
        element,
        baseChangeType: "visibility change",
        detached: false,
        attributeName: "modalState",
        modalTransition: transition.type,
        modalTransitionDetails: transition,
        modalState: transition.currentState
      };
    })
    .filter(Boolean);
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

  if (["svg", "i"].includes(tag) || isSpanIconElement(element)) {
    return getVisualTargetAccessibleName(element);
  }

  if (tag === "iframe") {
    return normalizeText(element.getAttribute("title"));
  }

  const visibleText = normalizeText(element?.innerText || element?.textContent);
  if (visibleText) {
    return visibleText;
  }

  return isInteractiveAutomationElement(element) ? getEmbeddedVisualLabel(element) : "";
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
