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
  '[role="checkbox"]',
  '[role="radio"]'
].join(",");

const TEST_ID_ATTRIBUTES = ["data-testid", "data-cy", "data-test"];

function scanDomElements() {
  const elements = Array.from(document.querySelectorAll(SCANNED_ELEMENT_SELECTOR));
  const scannedElements = elements.map((element) => buildElementSnapshot(element));

  return {
    pageName: getPageName(),
    url: window.location.href,
    title: document.title || "",
    scanDate: new Date().toISOString(),
    totalElements: scannedElements.length,
    elements: scannedElements
  };
}

function buildElementSnapshot(element) {
  const tag = element.tagName.toLowerCase();
  const type = getElementType(element);
  const text = getElementText(element);
  const role = getRole(element);
  const css = generateStableCssSelector(element);
  const xpath = generateXPath(element);
  const locatorChoice = chooseBestLocator(element, css, xpath, role, text);

  return {
    elementName: generateElementName(element, text),
    tag,
    type,
    text,
    id: element.id || "",
    name: element.getAttribute("name") || "",
    className: element.getAttribute("class") || "",
    placeholder: element.getAttribute("placeholder") || "",
    ariaLabel: element.getAttribute("aria-label") || "",
    role,
    href: getHref(element),
    src: getSrc(element),
    css,
    xpath,
    bestLocator: locatorChoice.locator,
    confidence: locatorChoice.confidence,
    isVisible: isElementVisible(element)
  };
}

function generateElementName(element, text) {
  const candidates = [
    getAssociatedLabelText(element),
    getAriaLabelledByText(element),
    element.getAttribute("aria-label"),
    element.getAttribute("placeholder"),
    element.getAttribute("alt"),
    element.getAttribute("title"),
    text,
    element.getAttribute("name"),
    element.id,
    `${getElementType(element)} ${element.tagName.toLowerCase()}`
  ];

  const value = candidates.find((candidate) => normalizeText(candidate));
  return toReadableName(value || element.tagName.toLowerCase());
}

function generateStableCssSelector(element) {
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

  const rects = element.getClientRects();
  if (!rects.length) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function chooseBestLocator(element, css, xpath, role, text) {
  for (const attribute of TEST_ID_ATTRIBUTES) {
    const value = element.getAttribute(attribute);
    if (value) {
      return {
        locator: `[${attribute}="${escapeCssString(value)}"]`,
        confidence: 0.98
      };
    }
  }

  if (element.id) {
    return {
      locator: `#${escapeCssIdentifier(element.id)}`,
      confidence: 0.95
    };
  }

  const name = element.getAttribute("name");
  if (name) {
    return {
      locator: `[name="${escapeCssString(name)}"]`,
      confidence: 0.9
    };
  }

  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) {
    return {
      locator: `[aria-label="${escapeCssString(ariaLabel)}"]`,
      confidence: 0.85
    };
  }

  const placeholder = element.getAttribute("placeholder");
  if (placeholder) {
    return {
      locator: `[placeholder="${escapeCssString(placeholder)}"]`,
      confidence: 0.8
    };
  }

  if (role && text) {
    return {
      locator: `role=${role}; text="${escapeLocatorText(text)}"`,
      confidence: 0.75
    };
  }

  if (css) {
    return {
      locator: css,
      confidence: 0.65
    };
  }

  return {
    locator: xpath,
    confidence: 0.5
  };
}

function getPageName() {
  return document.title || window.location.hostname || window.location.pathname || "Untitled Page";
}

function getElementType(element) {
  const tag = element.tagName.toLowerCase();

  if (tag === "input") {
    return (element.getAttribute("type") || "text").toLowerCase();
  }

  if (tag === "button") {
    return (element.getAttribute("type") || "submit").toLowerCase();
  }

  if (tag === "select") {
    return element.multiple ? "select-multiple" : "select-one";
  }

  return element.getAttribute("type") || "";
}

function getElementText(element) {
  const tag = element.tagName.toLowerCase();
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

  return normalizeText(element.innerText || element.textContent);
}

function getRole(element) {
  return element.getAttribute("role") || getImplicitRole(element);
}

function getImplicitRole(element) {
  const tag = element.tagName.toLowerCase();
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
  if ("href" in element && element.href) {
    return element.href;
  }
  return element.getAttribute("href") || "";
}

function getSrc(element) {
  if ("src" in element && element.src) {
    return element.src;
  }
  return element.getAttribute("src") || "";
}

function getAssociatedLabelText(element) {
  if (element.tagName.toLowerCase() === "label") {
    return normalizeText(element.innerText || element.textContent);
  }

  const labelParent = element.closest("label");
  if (labelParent) {
    return normalizeText(labelParent.innerText || labelParent.textContent);
  }

  if (!element.id) {
    return "";
  }

  const labels = Array.from(document.querySelectorAll(`label[for="${escapeCssString(element.id)}"]`));
  return normalizeText(labels.map((label) => label.innerText || label.textContent).join(" "));
}

function getAriaLabelledByText(element) {
  const labelledBy = element.getAttribute("aria-labelledby");
  if (!labelledBy) {
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
    className.length > 24 ||
    /^[a-z0-9_-]*[0-9a-f]{8,}[a-z0-9_-]*$/i.test(className) ||
    /^[a-z]+-[0-9]{4,}$/i.test(className)
  );
}

function isUniqueSelector(selector) {
  try {
    return document.querySelectorAll(selector).length === 1;
  } catch (_error) {
    return false;
  }
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "LOCATOR_SCAN_PAGE") {
    return undefined;
  }

  try {
    sendResponse({
      ok: true,
      data: scanDomElements()
    });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error.message
    });
  }

  return false;
});
