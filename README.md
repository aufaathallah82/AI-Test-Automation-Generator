# Locator Scanner Extension

A Chrome Extension (Manifest V3) that scans the current web page and exports a structured DOM snapshot (`element.dom.json`) for test automation purposes.

## Overview

Locator Scanner Extension is the first building block of a larger AI-assisted test automation platform.

The extension analyzes a web page, collects relevant UI elements, generates locator candidates, and exports a structured JSON model that can later be used to generate:

* Selenium Page Objects
* Gherkin Feature Files
* Step Definitions
* Playwright Tests
* Cypress Tests
* Automated Test Documentation

---

## Features

### Page Scanning

* Capture page URL
* Capture page title
* Capture scan timestamp
* Detect common UI elements

Supported elements:

* input
* button
* textarea
* select
* label
* form
* iframe
* image
* anchor

---

### Locator Generation

For every detected element, the extension generates:

* CSS Selector
* XPath
* Best Locator Recommendation
* Confidence Score
* Visibility Status

Locator priority:

1. data-testid
2. data-cy
3. data-test
4. id
5. name
6. aria-label
7. placeholder
8. role + text
9. CSS Selector
10. XPath

---

### JSON Export

The extension exports a structured file:

```json
{
  "pageName": "",
  "url": "",
  "title": "",
  "scanDate": "",
  "totalElements": 0,
  "elements": []
}
```

This JSON file serves as the foundation for future AI-driven automation generation.

---

## Tech Stack

* JavaScript
* HTML
* CSS
* Chrome Extension Manifest V3

---

## Example Workflow

```text
Open Web Page
        ↓
Scan Current Page
        ↓
Generate element.dom.json
        ↓
AI Analysis
        ↓
Generate:
- Page Objects
- Feature Files
- Step Definitions
        ↓
Run Automation Tests
```

---

## Roadmap

### Phase 1

* DOM Scanner
* Locator Generator
* JSON Export

### Phase 2

* Smart Page Modeling
* Business Element Filtering

### Phase 3

* Selenium Code Generation
* Gherkin Generation

### Phase 4

* Automated Test Execution

### Phase 5

* Daily Report Generator

---

## Author

Aufa Athallah

GitHub:
https://github.com/aufaathallah82
