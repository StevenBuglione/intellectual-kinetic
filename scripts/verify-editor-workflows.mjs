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
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
        consoleErrors.push(message.text());
      }
    });

    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    await page.locator(".ProseMirror").waitFor({ state: "visible", timeout: 30_000 });
    const initialText = await page.locator(".ProseMirror").innerText();
    if (countOccurrences(initialText, "s = vt") !== 1) {
      throw new Error(`Expected one math block before replace, saw text:\n${initialText}`);
    }

    const outline = page.getByRole("navigation", { name: "Document outline" });
    const initialOutlineHeading = outline.getByRole("button", { name: "A Treatise on Motion" });
    await initialOutlineHeading.waitFor({ state: "visible" });
    const initialOutlineCurrent = await initialOutlineHeading.getAttribute("aria-current");
    if (initialOutlineCurrent !== "true") {
      throw new Error(`Expected the first document heading to be current in the outline, got ${initialOutlineCurrent}.`);
    }

    await page.getByRole("button", { name: "Paste special" }).click();
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

    console.log("Editor workflow browser verification passed: document outline navigation, Ctrl-F floating find, visible highlights without native selection overlay, cross-inline replace, no math duplication, transparent TeX selection layer.");
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
