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
const appUrl = `http://127.0.0.1:${port}`;

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
  const { server, logs } = startDevServer();
  const chromeExecutable = resolveChromeExecutable();
  let browser;

  try {
    await waitForApp(server, logs);
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
    if (selectedMatch.toLocaleLowerCase() !== "motion") {
      throw new Error(`Find next did not select matching editor text; selected ${JSON.stringify(selectedMatch)}.`);
    }

    await findDialog.getByRole("searchbox", { name: "Find text" }).fill("Let v");
    await findDialog.getByRole("textbox", { name: "Replace with" }).fill("go");
    await findDialog.getByRole("button", { name: "Replace all" }).click();
    await page.getByText("1 replacements").waitFor({ state: "visible" });
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

    console.log("Editor workflow browser verification passed: Ctrl-F floating find, selected find match, cross-inline replace, no math duplication, transparent TeX selection layer.");
  } finally {
    if (browser) {
      await browser.close();
    }
    await stopServer(server);
    await rm(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
