# AI Test Automation Generator

AI Test Automation Generator is a Chrome Extension that helps QA Engineers capture web page elements, user interactions, dynamic UI behavior, and locator quality information into an AI-ready JSON model.

This project is designed as a foundation for AI-assisted test automation generation.

Instead of only copying locators manually from DevTools, this extension helps generate structured data that can later be used to create:

* Selenium Page Objects
* Gherkin Feature Files
* Step Definitions
* Playwright Tests
* Cypress Tests
* Automation Reports

This project is especially useful for Junior QA Engineers who are learning how to move from manual testing into automation testing.

---

## Project Vision

The main goal of this project is to record how a user interacts with a web page and convert that information into an automation-ready model.

The extension does not only scan locators. It also captures:

* Page structure
* Important UI elements
* Recommended locators
* Locator confidence score
* Duplicate locator warnings
* Hidden element filtering
* Dynamic DOM snapshots
* User interaction flows
* Automation readiness score

The exported JSON model can be used as input for AI tools or automation frameworks.

---

## Recommended Companion Project

For the next step after exporting the JSON model, it is highly recommended to use this project together with:

[Selenium BDD AI JSON Locator](https://github.com/aufaathallah82/Selenium-BDD-AI-json-locator)

Recommended workflow:

```text
AI Test Automation Generator
        ↓
Export AI-ready JSON model
        ↓
Selenium BDD AI JSON Locator
        ↓
Generate / maintain Selenium BDD test automation
```

This combination is useful for learning how DOM analysis, locator modeling, Gherkin, Page Object Model, and Selenium automation can work together.

---

## Features

### 1. DOM Scanning

Scan the current web page and collect testable UI elements such as:

* input
* button
* link
* textarea
* select
* label
* form
* iframe
* image

Each element is exported with useful automation data.

---

### 2. Smart Locator Generation

The extension generates locator candidates such as:

* data-testid
* data-cy
* data-test
* id
* name
* aria-label
* placeholder
* role + text
* CSS selector
* XPath

The extension also recommends the best locator based on stability and readability.

---

### 3. Smart Locator Rating

Each locator includes:

* best locator
* locator type
* confidence score
* reason

Example:

```json
{
  "bestLocator": "#userName",
  "locatorType": "id",
  "confidence": 0.95,
  "reason": "Unique ID found"
}
```

This helps Junior QA Engineers understand why one locator is better than another.

---

### 4. Duplicate Locator Detection

The extension can detect locator issues such as:

* Duplicate CSS selector
* Duplicate XPath
* Duplicate text locator
* Non-unique ID
* Dynamic locator detected

This is useful because duplicate locators can make Selenium tests unstable.

---

### 5. Hidden Element Filtering

By default, the extension focuses on visible elements.

This helps reduce noise from elements that are not usually interactable by Selenium, such as:

* display:none
* visibility:hidden
* opacity:0
* detached DOM nodes

---

### 6. Automation Readiness Score

The extension calculates a page-level automation readiness score.

Example:

```json
{
  "automationReadiness": {
    "score": 87,
    "strengths": [
      "Unique IDs detected",
      "Stable form locators available"
    ],
    "weaknesses": [
      "Several duplicate CSS selectors found",
      "Multiple iframe dependencies detected"
    ]
  }
}
```

This helps QA Engineers quickly understand whether a page is easy or difficult to automate.

---

### 7. Dynamic DOM Snapshot Recording

Modern websites often create temporary UI elements such as:

* modal dialogs
* toast notifications
* dropdown menus
* tooltips
* date pickers
* drawers
* validation messages

These elements may disappear after the user closes them.

The Snapshot Recorder captures dynamic UI changes so they can still be included in the exported automation model.

---

### 8. Interaction Recording

The Interaction Recorder captures user actions and the UI behavior that happens after those actions.

Example:

```text
User clicks COOK CHOCOLATE CAKE
        ↓
Chocolate Cake modal appears
        ↓
Close button becomes available
        ↓
I COOKED IT button becomes available
```

This is useful because AI tools can understand user flows better than raw DOM mutations.

---

## Exported JSON Model

The extension exports a JSON file named:

```text
ai-test-automation-model.json
```

The exported model may include:

```json
{
  "pageName": "",
  "url": "",
  "title": "",
  "scanDate": "",
  "elements": [],
  "warnings": [],
  "snapshots": [],
  "userFlows": [],
  "interactionSummary": [],
  "automationReadiness": {}
}
```

This JSON model is designed to be consumed by AI workflows that generate Selenium, Playwright, Cypress, or Gherkin test assets.

---

## How to Use

### Step 1: Download or Clone This Repository

```bash
git clone https://github.com/aufaathallah82/AI-Test-Automation-Generator.git
```

Open the project folder in your code editor.

---

### Step 2: Load the Extension in Chrome

Open Chrome and go to:

```text
chrome://extensions/
```

Then:

1. Turn on Developer Mode.
2. Click Load unpacked.
3. Select the project folder.
4. Make sure the extension appears in the extension list.

The selected folder must contain:

```text
manifest.json
popup.html
popup.js
content.js
background.js
styles.css
```

---

### Step 3: Open a Website

Open any website you want to analyze.

Example test website:

```text
https://demoqa.com/login
```

or:

```text
https://broken-workshop.dequelabs.com/
```

After opening the website, refresh the page once.

---

### Step 4: Analyze the Page DOM

Click the extension icon.

Then click:

```text
Analyze Page DOM
```

The extension will scan the page and display:

* total elements
* warning count
* automation score
* JSON preview

---

### Step 5: Record Dynamic UI Snapshots

Use this when the page has modals, dropdowns, toast messages, or temporary UI elements.

Recommended flow:

```text
Start Snapshot Recording
        ↓
Interact with the website
        ↓
Open modal / dropdown / toast
        ↓
Stop Snapshot Recording
```

The captured dynamic elements will be included in the exported JSON.

---

### Step 6: Record User Interactions

Use this when you want to capture user behavior.

Recommended flow:

```text
Start Interaction Recording
        ↓
Click buttons, fill inputs, select dropdowns
        ↓
Stop Interaction Recording
```

The extension will try to convert user actions into AI-readable user flows.

---

### Step 7: Export the JSON Model

Click:

```text
Export JSON
```

The extension will download:

```text
ai-test-automation-model.json
```

You can use this JSON file as input for the companion Selenium BDD project or for AI-assisted code generation.

---

## Example Workflow for Junior QA

A Junior QA can use this project like this:

```text
1. Open a web page.
2. Analyze the DOM.
3. Record important user actions.
4. Export the JSON model.
5. Review the recommended locators.
6. Use the JSON as input for Selenium BDD generation.
7. Learn how UI elements become Page Objects and Step Definitions.
```

This makes it easier to understand the relationship between:

```text
Web Element
        ↓
Locator
        ↓
Page Object
        ↓
Gherkin Step
        ↓
Selenium Test
```

---

## Tech Stack

* Chrome Extension Manifest V3
* JavaScript
* HTML
* CSS
* JSON

No external framework is required.

---

## Current Status

Completed:

* DOM scanning
* Locator generation
* Smart locator rating
* Duplicate locator detection
* Hidden element filtering
* Automation readiness scoring
* Dynamic DOM snapshot recording
* Interaction recording
* JSON export

Planned:

* AI-based Page Object generation
* Gherkin feature generation
* Selenium Step Definition generation
* Playwright and Cypress export
* Daily automation report generation

---

## Roadmap

### Phase 1: DOM Intelligence

* Scan page elements
* Generate locators
* Score locator quality
* Detect duplicate locators

### Phase 2: Dynamic UI Capture

* Record modal appearance
* Record dropdown behavior
* Record toast and validation messages

### Phase 3: Interaction Modeling

* Record user actions
* Group DOM changes into user flows
* Generate AI-friendly interaction summaries

### Phase 4: Test Generation

* Generate Gherkin
* Generate Selenium Page Objects
* Generate Step Definitions

### Phase 5: Automation Execution

* Run generated tests
* Generate automation reports
* Generate daily test summary

---

## Repository Name

This project repository should use the following name:

```text
AI-Test-Automation-Generator
```

If the repository was created with a different name, rename it from GitHub:

1. Open the repository on GitHub.
2. Go to Settings.
3. Open the General section.
4. Find Repository name.
5. Change the repository name to AI-Test-Automation-Generator.
6. Click Rename.

After renaming the GitHub repository, update the local Git remote URL:

```bash
git remote set-url origin https://github.com/aufaathallah82/AI-Test-Automation-Generator.git
git remote -v
```

---

## Author

Aufa Athallah

GitHub: https://github.com/aufaathallah82
