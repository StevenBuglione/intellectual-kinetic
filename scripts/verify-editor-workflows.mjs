import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..");
const port = Number(process.env.IK_WORKFLOW_VERIFY_PORT ?? 3104);
let appUrl = `http://127.0.0.1:${port}`;

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function resolveChromeExecutable() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    "/home/sbuglione/.local/bin/google-chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate));
}

function startDevServer() {
  const server = spawn(npmCommand(), ["run", "dev", "--", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: repoRoot,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = [];
  const capture = (chunk) => {
    logs.push(chunk.toString());
    if (logs.length > 80) {
      logs.shift();
    }
  };

  server.stdout.on("data", capture);
  server.stderr.on("data", capture);

  return { server, logs };
}

async function waitForApp(server, logs) {
  const started = Date.now();
  while (Date.now() - started < 45_000) {
    if (server.exitCode !== null) {
      throw new Error(`Next dev server exited early.\n${logs.join("")}`);
    }

    try {
      const response = await fetch(appUrl, { cache: "no-store" });
      if (response.ok) {
        return;
      }
    } catch {
      // Continue polling.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${appUrl}.\n${logs.join("")}`);
}

async function detectExistingAppUrl() {
  const candidates = [
    process.env.IK_WORKFLOW_VERIFY_APP_URL,
    "http://127.0.0.1:3000",
    "http://localhost:3000",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const response = await fetch(`${candidate}/api/documents/default`, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      if (payload?.document?.id) {
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

async function stopServer(server) {
  if (server.exitCode !== null) {
    return;
  }

  signalServer(server, "SIGTERM");
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      signalServer(server, "SIGKILL");
      resolve();
    }, 5000);

    server.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function signalServer(server, signal) {
  if (process.platform !== "win32" && server.pid) {
    try {
      process.kill(-server.pid, signal);
      return;
    } catch {
      // Fall back to direct child.
    }
  }

  server.kill(signal);
}

function countOccurrences(value, pattern) {
  return value.match(new RegExp(pattern, "g"))?.length ?? 0;
}

async function main() {
  const tmpDir = await mkdtemp(join(tmpdir(), "ik-editor-workflows-"));
  const existingAppUrl = await detectExistingAppUrl();
  const serverContext = existingAppUrl ? null : startDevServer();
  if (existingAppUrl) {
    appUrl = existingAppUrl;
  }
  const chromeExecutable = resolveChromeExecutable();
  let browser;

  try {
    if (serverContext) {
      await waitForApp(serverContext.server, serverContext.logs);
    }
    browser = await chromium.launch({
      headless: true,
      ...(chromeExecutable ? { executablePath: chromeExecutable } : {}),
    });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const savedDocuments = [];
    let previewRequestCount = 0;
    await page.route("**/api/documents/default", async (route) => {
      if (route.request().method() !== "PUT") {
        await route.continue();
        return;
      }

      const payload = route.request().postDataJSON();
      savedDocuments.push(payload.document);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ document: payload.document }),
      });
    });
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
        consoleErrors.push(message.text());
      }
    });
    page.on("request", (request) => {
      if (request.url().includes("/api/latex/preview")) {
        previewRequestCount += 1;
      }
    });

    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    await page.locator(".ProseMirror").waitFor({ state: "visible", timeout: 30_000 });
    const initialText = await page.locator(".ProseMirror").innerText();
    if (countOccurrences(initialText, "s = vt") !== 1) {
      throw new Error(`Expected one math block before replace, saw text:\n${initialText}`);
    }

    const documentClassOptions = await page.locator('[name="document-class"] option').evaluateAll((options) => (
      options.map((option) => ({
        value: option.getAttribute("value"),
        label: option.textContent?.trim(),
      }))
    ));
    if (documentClassOptions.length !== 26) {
      throw new Error(`Expected the document class selector to expose only the PDF-renderable LyX classes, found ${documentClassOptions.length} options.`);
    }
    if (
      !documentClassOptions.some((option) => option.value === "beamer")
      || !documentClassOptions.some((option) => option.value === "europecv")
      || !documentClassOptions.some((option) => option.value === "a0poster")
      || documentClassOptions.some((option) => option.value === "acmart")
      || documentClassOptions.some((option) => option.value === "docbook")
    ) {
      throw new Error(`Expected only PDF-renderable LyX document classes in the selector, saw ${JSON.stringify(documentClassOptions)}.`);
    }

    await page.getByRole("combobox", { name: "Document class" }).selectOption("report");
    await page.getByRole("button", { name: "Show source" }).click();
    const sourcePanel = page.getByRole("complementary", { name: "Generated LaTeX source" });
    await sourcePanel.waitFor({ state: "visible" });
    await sourcePanel.getByText("\\documentclass{report}").waitFor({ state: "visible" });
    await page.getByRole("button", { name: "Show source" }).click();
    await sourcePanel.waitFor({ state: "hidden" });

    const outline = page.getByRole("navigation", { name: "Document outline" });
    const initialOutlineHeading = outline.getByRole("button", { name: "A Treatise on Motion" });
    await initialOutlineHeading.waitFor({ state: "visible" });
    const initialOutlineCurrent = await initialOutlineHeading.getAttribute("aria-current");
    if (initialOutlineCurrent !== "true") {
      throw new Error(`Expected the first document heading to be current in the outline, got ${initialOutlineCurrent}.`);
    }

    const leftWorkspace = page.getByRole("complementary", { name: "Left workspace" });
    await leftWorkspace.getByRole("button", { name: "Collapse left sidebar" }).click();
    const expandLeftSidebar = leftWorkspace.getByRole("button", { name: "Expand left sidebar" });
    await expandLeftSidebar.waitFor({ state: "visible" });
    const expandState = await expandLeftSidebar.getAttribute("aria-expanded");
    if (expandState !== "false") {
      throw new Error(`Collapsed left sidebar should report aria-expanded=false, got ${expandState}.`);
    }
    const outlineCountAfterCollapse = await outline.count();
    if (outlineCountAfterCollapse !== 0) {
      throw new Error(`Collapsed left sidebar should hide the document outline, found ${outlineCountAfterCollapse}.`);
    }

    await expandLeftSidebar.click();
    const resizeHandle = leftWorkspace.getByRole("separator", { name: "Resize left sidebar" });
    const widthBeforeResize = await page.locator(".ik-doc-workspace").evaluate((node) => (
      getComputedStyle(node).getPropertyValue("--ik-left-sidebar-width").trim()
    ));
    const resizeHandleBox = await resizeHandle.boundingBox();
    if (!resizeHandleBox) {
      throw new Error("Could not measure the left sidebar resize handle.");
    }
    await page.mouse.move(resizeHandleBox.x + (resizeHandleBox.width / 2), resizeHandleBox.y + 30);
    await page.mouse.down();
    await page.mouse.move(resizeHandleBox.x + 84, resizeHandleBox.y + 30, { steps: 4 });
    await page.mouse.up();
    const widthAfterResize = await page.locator(".ik-doc-workspace").evaluate((node) => (
      getComputedStyle(node).getPropertyValue("--ik-left-sidebar-width").trim()
    ));
    const widthBeforeResizePx = Number.parseInt(widthBeforeResize, 10);
    const widthAfterResizePx = Number.parseInt(widthAfterResize, 10);
    if (widthBeforeResize === widthAfterResize || Number.isNaN(widthBeforeResizePx) || Number.isNaN(widthAfterResizePx) || (widthAfterResizePx - widthBeforeResizePx) < 60) {
      throw new Error(`Dragging the left sidebar should widen it, saw ${widthBeforeResize} -> ${widthAfterResize}.`);
    }

    await leftWorkspace.getByRole("button", { name: "Open source review" }).click();
    await page.getByRole("complementary", { name: "Source review" }).waitFor({ state: "visible" });
    const sourceReviewPressed = await leftWorkspace.getByRole("button", { name: "Open source review" }).getAttribute("aria-pressed");
    if (sourceReviewPressed !== "true") {
      throw new Error(`Source review rail button should be pressed after opening, got ${sourceReviewPressed}.`);
    }

    await leftWorkspace.getByRole("button", { name: "Open document statistics" }).click();
    await page.getByRole("complementary", { name: "Document statistics" }).waitFor({ state: "visible" });
    const sourceReviewCountAfterStats = await page.getByRole("complementary", { name: "Source review" }).count();
    if (sourceReviewCountAfterStats !== 0) {
      throw new Error("Opening statistics should close the source review panel.");
    }

    await page.getByRole("button", { name: "Add document tab" }).click();
    const tabTwo = page.getByRole("tab", { name: "Tab 2" });
    await tabTwo.waitFor({ state: "visible" });
    const tabTwoSelected = await tabTwo.getAttribute("aria-selected");
    if (tabTwoSelected !== "true") {
      throw new Error(`New document tab should become selected, got ${tabTwoSelected}.`);
    }
    await page.getByRole("heading", { name: "Untitled tab 2" }).waitFor({ state: "visible" });
    await page.getByRole("button", { name: "Version history" }).click();
    const historyDialog = page.getByRole("dialog", { name: "Version history" });
    await historyDialog.waitFor({ state: "visible" });
    await historyDialog.getByText("Restore recent workspace states, jump back to a known-good version, or step through your edit trail.").waitFor({ state: "visible" });
    await historyDialog.getByLabel("Version history summary").getByText(/3\s+of\s+3\s+versions/).waitFor({ state: "visible" });
    await historyDialog.getByRole("button", { name: "Changed document class to Report" }).waitFor({ state: "visible" });
    await historyDialog.getByRole("button", { name: "Close" }).click();
    await historyDialog.waitFor({ state: "hidden" });
    if ((await page.locator(".ProseMirror").innerText()).includes("A Treatise on Motion")) {
      throw new Error("Selecting a new document tab should replace the editor content, but Tab 1 text was still visible.");
    }

    await leftWorkspace.getByRole("button", { name: "Open paste special" }).click();
    const tabPastePanel = page.getByRole("complementary", { name: "Paste special" });
    await tabPastePanel.getByRole("combobox", { name: "Paste format" }).selectOption("latex");
    await tabPastePanel.getByRole("textbox", { name: "Paste source" }).fill("\\section{Tab Two Section}\nTab two body.");
    await tabPastePanel.getByRole("button", { name: "Insert paste" }).click();
    await page.getByRole("heading", { name: "Tab Two Section" }).waitFor({ state: "visible" });
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByText("Saved").waitFor({ state: "visible" });
    const savedDocument = savedDocuments.at(-1);
    if (
      savedDocument?.settings?.documentClass !== "report"
      || savedDocument?.settings?.templateFamily !== "Reports"
      || savedDocument?.metadata?.workspace?.activeDocumentTabId !== "tab-2"
      || savedDocument.metadata.workspace.documentTabs.length !== 2
      || !JSON.stringify(savedDocument.metadata.workspace.documentTabs[0].blocks).includes("A Treatise on Motion")
      || !JSON.stringify(savedDocument.metadata.workspace.documentTabs[1].blocks).includes("Tab Two Section")
    ) {
      throw new Error(`Saved document did not persist settings/tab metadata correctly: ${JSON.stringify({ settings: savedDocument?.settings, workspace: savedDocument?.metadata?.workspace })}`);
    }

    const tabOne = page.getByRole("tab", { name: "Tab 1" });
    await tabOne.click();
    const tabOneSelected = await tabOne.getAttribute("aria-selected");
    if (tabOneSelected !== "true") {
      throw new Error(`Clicking Tab 1 should select it, got ${tabOneSelected}.`);
    }
    const tabOneTextAfterSwitch = await page.locator(".ProseMirror").innerText();
    if (!tabOneTextAfterSwitch.includes("A Treatise on Motion") || tabOneTextAfterSwitch.includes("Tab Two Section")) {
      throw new Error(`Tab switch did not restore isolated Tab 1 content:\n${tabOneTextAfterSwitch}`);
    }
    await tabTwo.click();
    const tabTwoTextAfterReturn = await page.locator(".ProseMirror").innerText();
    if (!tabTwoTextAfterReturn.includes("Tab Two Section") || tabTwoTextAfterReturn.includes("A Treatise on Motion")) {
      throw new Error(`Tab switch did not restore isolated Tab 2 content:\n${tabTwoTextAfterReturn}`);
    }
    await page.getByRole("button", { name: "Delete Tab 2" }).click();
    await tabOne.waitFor({ state: "visible" });
    const deletedTabCount = await page.getByRole("tab", { name: "Tab 2" }).count();
    if (deletedTabCount !== 0) {
      throw new Error(`Deleting Tab 2 should remove it, found ${deletedTabCount}.`);
    }
    const deleteOnlyTabDisabled = await page.getByRole("button", { name: "Delete Tab 1" }).isDisabled();
    if (!deleteOnlyTabDisabled) {
      throw new Error("The last remaining document tab should not be deletable.");
    }

    await leftWorkspace.getByRole("button", { name: "Open document outline" }).click();
    await outline.waitFor({ state: "visible" });

    await page.getByRole("button", { name: "Paste special", exact: true }).click();
    const pastePanel = page.getByRole("complementary", { name: "Paste special" });
    await pastePanel.getByRole("combobox", { name: "Paste format" }).selectOption("latex");
    await pastePanel.getByRole("textbox", { name: "Paste source" }).fill("\\section{Imported Section}\nImported body.");
    await pastePanel.getByRole("button", { name: "Insert paste" }).click();
    const importedOutlineHeading = outline.getByRole("button", { name: "Imported Section" });
    await importedOutlineHeading.waitFor({ state: "visible" });
    await importedOutlineHeading.click();
    const importedOutlineCurrent = await importedOutlineHeading.getAttribute("aria-current");
    if (importedOutlineCurrent !== "true") {
      throw new Error(`Expected clicked outline heading to become current, got ${importedOutlineCurrent}.`);
    }
    const focusedCanonicalSelection = await page.evaluate(() => {
      const selection = window.getSelection();
      const anchorElement = selection?.anchorNode instanceof Element
        ? selection.anchorNode
        : selection?.anchorNode?.parentElement;
      const canonicalElement = anchorElement?.closest("[data-canonical-id], [canonicalid]");

      return {
        id: canonicalElement?.getAttribute("data-canonical-id")
          ?? canonicalElement?.getAttribute("canonicalid")
          ?? null,
        text: canonicalElement?.textContent ?? "",
      };
    });
    if (!focusedCanonicalSelection.text.includes("Imported Section")) {
      throw new Error(
        `Outline click did not move the editor selection to the imported heading; focused ${JSON.stringify(focusedCanonicalSelection)}.`,
      );
    }

    await page.getByRole("button", { name: "PDF preview" }).click();
    const pdfPreview = page.getByRole("complementary", { name: "PDF preview" });
    await pdfPreview.waitFor({ state: "visible" });
    const previewImage = page.getByRole("img", { name: "Compiled PDF preview page" });
    await previewImage.waitFor({ state: "visible", timeout: 45_000 });
    await page.getByLabel("PDF preview verified").waitFor({ state: "visible" });
    const initialPreviewSrc = await previewImage.getAttribute("src");
    if (previewRequestCount !== 1) {
      throw new Error(`Opening PDF preview should compile exactly once, saw ${previewRequestCount} preview requests.`);
    }

    await page.getByRole("combobox", { name: "Document class" }).selectOption("beamer");
    const classRecompileStart = Date.now();
    while (previewRequestCount < 2 && Date.now() - classRecompileStart < 45_000) {
      await page.waitForTimeout(250);
    }
    if (previewRequestCount !== 2) {
      throw new Error(`Changing the document class with PDF preview open should trigger one recompile, saw ${previewRequestCount} preview requests.`);
    }
    let beamerPreviewState = null;
    const beamerPreviewWaitStart = Date.now();
    while (Date.now() - beamerPreviewWaitStart < 45_000) {
      beamerPreviewState = await page.evaluate(() => {
        const pageStack = document.querySelector(".ik-doc-page-stack");
        const heading = document.querySelector(".ik-doc-editor-page h1");
        const preview = document.querySelector('img[alt="Compiled PDF preview page"]');
        return {
          documentClass: pageStack?.getAttribute("data-document-class"),
          documentBehavior: pageStack?.getAttribute("data-document-behavior"),
          headingAlign: heading ? window.getComputedStyle(heading).textAlign : null,
          previewSrc: preview?.getAttribute("src") ?? null,
        };
      });
      if (
        beamerPreviewState.documentClass === "beamer"
        && beamerPreviewState.documentBehavior === "beamer"
        && beamerPreviewState.headingAlign === "center"
        && beamerPreviewState.previewSrc !== initialPreviewSrc
      ) {
        break;
      }
      await page.waitForTimeout(250);
    }
    if (
      !beamerPreviewState
      || beamerPreviewState.documentClass !== "beamer"
      || beamerPreviewState.documentBehavior !== "beamer"
      || beamerPreviewState.headingAlign !== "center"
      || beamerPreviewState.previewSrc === initialPreviewSrc
    ) {
      throw new Error(`Document class change should update formatting and refresh the preview, got ${JSON.stringify(beamerPreviewState)}.`);
    }

    await page.getByRole("combobox", { name: "Document class" }).selectOption("report");
    const reportRecompileStart = Date.now();
    while (previewRequestCount < 3 && Date.now() - reportRecompileStart < 45_000) {
      await page.waitForTimeout(250);
    }
    if (previewRequestCount !== 3) {
      throw new Error(`Switching the document class back to report should trigger one recompile, saw ${previewRequestCount} preview requests.`);
    }
    await page.getByLabel("PDF preview verified").waitFor({ state: "visible" });

    await page.getByRole("button", { name: "Paste special", exact: true }).click();
    const previewPastePanel = page.getByRole("complementary", { name: "Paste special" });
    await previewPastePanel.getByRole("combobox", { name: "Paste format" }).selectOption("plain-text");
    await previewPastePanel.getByRole("textbox", { name: "Paste source" }).fill("Loop refresh note.");
    await previewPastePanel.getByRole("button", { name: "Insert paste" }).click();
    await page.getByText("Loop refresh note.").waitFor({ state: "visible" });
    const recompileStart = Date.now();
    while (previewRequestCount < 4 && Date.now() - recompileStart < 45_000) {
      await page.waitForTimeout(250);
    }
    if (previewRequestCount !== 4) {
      throw new Error(`Editing with PDF preview open should trigger one recompile, saw ${previewRequestCount} preview requests.`);
    }
    await page.getByLabel("PDF preview verified").waitFor({ state: "visible" });

    await page.keyboard.press(process.platform === "darwin" ? "Meta+F" : "Control+F");
    const findDialog = page.getByRole("dialog", { name: "Find and replace" });
    await findDialog.waitFor({ state: "visible" });
    const dialogBox = await findDialog.boundingBox();
    if (!dialogBox || dialogBox.width > 380 || dialogBox.x < 900) {
      throw new Error(`Find/replace should be a small floating dialog, got ${JSON.stringify(dialogBox)}.`);
    }

    const searchBox = findDialog.getByRole("searchbox", { name: "Find text" });
    await searchBox.fill("motion");
    await findDialog.getByRole("button", { name: "Find next" }).click();
    await page.getByText("1 of 2").waitFor({ state: "visible" });
    const selectedMatch = await page.evaluate(() => window.getSelection()?.toString() ?? "");
    if (selectedMatch !== "") {
      throw new Error(`Find next should not leave blue browser text selection over find highlights; selected ${JSON.stringify(selectedMatch)}.`);
    }
    const initialHighlights = await page.locator(".ik-find-highlight").evaluateAll((nodes) => (
      nodes.map((node) => ({
        text: node.textContent,
        current: node.classList.contains("ik-find-highlight-current"),
      }))
    ));
    if (initialHighlights.length !== 2 || initialHighlights.filter((highlight) => highlight.current).length !== 1) {
      throw new Error(`Find highlights did not mark all/current matches: ${JSON.stringify(initialHighlights)}.`);
    }

    await findDialog.getByRole("checkbox", { name: "Match case" }).click();
    await findDialog.getByRole("button", { name: "Find next" }).click();
    await page.getByText("1 of 1").waitFor({ state: "visible" });
    const selectedCaseSensitiveMatch = await page.evaluate(() => window.getSelection()?.toString() ?? "");
    if (selectedCaseSensitiveMatch !== "") {
      throw new Error(`Match case should not leave blue browser text selection; selected ${JSON.stringify(selectedCaseSensitiveMatch)}.`);
    }
    const caseSensitiveHighlights = await page.locator(".ik-find-highlight").count();
    if (caseSensitiveHighlights !== 1) {
      throw new Error(`Match case should leave one visible highlight, found ${caseSensitiveHighlights}.`);
    }

    await findDialog.getByRole("button", { name: "Close" }).click();
    await findDialog.waitFor({ state: "hidden" });
    const highlightsAfterClose = await page.locator(".ik-find-highlight").count();
    if (highlightsAfterClose !== 0) {
      throw new Error(`Find highlights should clear when the dialog closes, found ${highlightsAfterClose}.`);
    }
    await page.keyboard.press(process.platform === "darwin" ? "Meta+F" : "Control+F");
    await findDialog.waitFor({ state: "visible" });

    await searchBox.fill("Motion");
    await findDialog.getByRole("button", { name: "Find next" }).click();
    await page.getByText("1 of 1").waitFor({ state: "visible" });
    const selectedTitleMatch = await page.evaluate(() => window.getSelection()?.toString() ?? "");
    if (selectedTitleMatch !== "") {
      throw new Error(`Match case title find should not leave blue browser text selection; selected ${JSON.stringify(selectedTitleMatch)}.`);
    }

    await findDialog.getByRole("textbox", { name: "Replace with" }).fill("movement");
    await findDialog.getByRole("button", { name: /^Replace$/ }).click();
    await page.getByText("1 replacement").waitFor({ state: "visible" });
    const currentReplaceText = await page.locator(".ProseMirror").innerText();
    if (!currentReplaceText.includes("A Treatise on movement")) {
      throw new Error(`Replace did not update the selected match in the title:\n${currentReplaceText}`);
    }
    if (!currentReplaceText.includes("Uniform motion preserves proportional distance.")) {
      throw new Error(`Replace changed more than the selected match:\n${currentReplaceText}`);
    }
    if (countOccurrences(currentReplaceText, "movement") !== 1) {
      throw new Error(`Replace inserted too many replacement strings:\n${currentReplaceText}`);
    }

    await searchBox.fill("v");
    await findDialog.getByRole("button", { name: "Find next" }).click();
    await page.getByText("1 of 5").waitFor({ state: "visible" });
    await findDialog.getByRole("checkbox", { name: "Whole word" }).click();
    await findDialog.getByRole("button", { name: "Find next" }).click();
    await page.getByText("1 of 1").waitFor({ state: "visible" });
    const selectedWholeWordMatch = await page.evaluate(() => window.getSelection()?.toString() ?? "");
    if (selectedWholeWordMatch !== "") {
      throw new Error(`Whole word should not leave blue browser text selection; selected ${JSON.stringify(selectedWholeWordMatch)}.`);
    }

    await findDialog.getByRole("searchbox", { name: "Find text" }).fill("Let v");
    await findDialog.getByRole("textbox", { name: "Replace with" }).fill("go");
    await findDialog.getByRole("button", { name: "Replace all" }).click();
    await page.getByText("1 replacement").waitFor({ state: "visible" });
    const replacedText = await page.locator(".ProseMirror").innerText();

    if (!replacedText.includes("go denote velocity and cite @newton1687.")) {
      throw new Error(`Cross-inline find/replace did not update editor text correctly:\n${replacedText}`);
    }
    if (countOccurrences(replacedText, "s = vt") !== 1) {
      throw new Error(`Find/replace duplicated the math block; saw text:\n${replacedText}`);
    }

    await page.getByRole("button", { name: "Review", exact: true }).click();
    const reviewPanel = page.getByRole("complementary", { name: "Source review" });
    await reviewPanel.waitFor({ state: "visible" });
    await reviewPanel.getByRole("textbox", { name: "Review author" }).fill("Alex Reviewer");
    await reviewPanel.getByRole("combobox", { name: "Review target block" }).selectOption("block-intro");
    await reviewPanel.getByRole("textbox", { name: "Tracked deletion text" }).fill("velocity");
    await reviewPanel.getByRole("button", { name: "Track deletion" }).click();
    await page.getByText("Tracked deletion recorded.").waitFor({ state: "visible" });
    const trackedDeleteCount = await page.locator(".ik-tracked-delete").count();
    if (trackedDeleteCount !== 1) {
      throw new Error(`Review deletion should create one tracked deletion, found ${trackedDeleteCount}.`);
    }

    await reviewPanel.getByRole("textbox", { name: "Tracked insertion anchor" }).fill("go ");
    await reviewPanel.getByRole("textbox", { name: "Tracked insertion text" }).fill("carefully ");
    await reviewPanel.getByRole("button", { name: "Track insertion" }).click();
    await page.getByText("Tracked insertion recorded.").waitFor({ state: "visible" });
    const trackedInsertCount = await page.locator(".ik-tracked-insert").count();
    if (trackedInsertCount !== 1) {
      throw new Error(`Review insertion should create one tracked insertion, found ${trackedInsertCount}.`);
    }

    const reviewText = await page.locator(".ProseMirror").innerText();
    if (!reviewText.includes("go carefully denote velocity")) {
      throw new Error(`Tracked changes did not render in the editor text as expected:\n${reviewText}`);
    }

    await reviewPanel.getByRole("button", { name: "Accept" }).first().click();
    const acceptedTrackedInsertCount = await page.locator(".ik-tracked-insert").count();
    if (acceptedTrackedInsertCount !== 0) {
      throw new Error(`Accepting the tracked insertion should remove its review chip, found ${acceptedTrackedInsertCount}.`);
    }

    await reviewPanel.getByRole("button", { name: "Reject" }).first().click();
    await page.getByText("No tracked changes yet.").waitFor({ state: "visible" });
    const clearedTrackedChanges = await page.locator(".ik-tracked-delete, .ik-tracked-insert").count();
    if (clearedTrackedChanges !== 0) {
      throw new Error(`Resolving tracked changes should clear editor review spans, found ${clearedTrackedChanges}.`);
    }

    const overlayStyles = await page.evaluate(() => {
      const host = document.createElement("div");
      host.className = "ik-tex-page-live-layer";
      host.innerHTML = "<article class=\"ik-doc-editor-page\"><p>Ghost text probe</p></article>";
      document.body.append(host);
      const paragraph = host.querySelector("p");
      const normal = window.getComputedStyle(paragraph);
      const selection = window.getComputedStyle(paragraph, "::selection");
      const result = {
        normalColor: normal.color,
        normalTextFill: normal.webkitTextFillColor,
        selectionColor: selection.color,
        selectionTextFill: selection.webkitTextFillColor,
      };
      host.remove();
      return result;
    });

    if (
      overlayStyles.normalColor !== "rgba(0, 0, 0, 0)"
      || overlayStyles.normalTextFill !== "rgba(0, 0, 0, 0)"
      || overlayStyles.selectionColor !== "rgba(0, 0, 0, 0)"
      || overlayStyles.selectionTextFill !== "rgba(0, 0, 0, 0)"
    ) {
      throw new Error(`TeX live layer can reveal ghost text on selection: ${JSON.stringify(overlayStyles)}`);
    }

    if (consoleErrors.length > 0) {
      throw new Error(`Browser console errors were emitted:\n${consoleErrors.join("\n")}`);
    }

    console.log("Editor workflow browser verification passed: persisted real document tabs, collapsible left workspace, document outline navigation, PDF preview recompilation, tracked-change review workflow, Ctrl-F floating find, visible highlights without native selection overlay, cross-inline replace, no math duplication, transparent TeX selection layer.");
  } finally {
    if (browser) {
      await browser.close();
    }
    if (serverContext) {
      await stopServer(serverContext.server);
    }
    await rm(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
