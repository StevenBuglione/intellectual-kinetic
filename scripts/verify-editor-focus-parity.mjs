import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { spawn } from "node:child_process";

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..");
const port = Number(process.env.IK_VERIFY_PORT ?? 3100);
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
    if (logs.length > 60) {
      logs.shift();
    }
  };

  server.stdout.on("data", capture);
  server.stderr.on("data", capture);

  return { server, logs };
}

async function waitForApp(server, logs) {
  const started = Date.now();
  while (Date.now() - started < 45000) {
    if (server.exitCode !== null) {
      throw new Error(`Next dev server exited early.\n${logs.join("")}`);
    }

    try {
      const response = await fetch(appUrl, { cache: "no-store" });
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the dev server is ready.
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
      // Fall back to signaling the direct child below.
    }
  }

  server.kill(signal);
}

async function changedPixelCount(beforePath, afterPath) {
  try {
    const { stderr } = await execFileAsync("compare", ["-metric", "AE", beforePath, afterPath, "null:"]);
    return Number(stderr.trim() || "0");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 1) {
      const metric = String(error.stderr ?? "").trim();
      return Number(metric || "0");
    }

    throw error;
  }
}

async function main() {
  const tmpDir = await mkdtemp(join(tmpdir(), "ik-focus-parity-"));
  const beforePath = join(tmpDir, "pdf-before-focus.png");
  const afterPath = join(tmpDir, "pdf-after-focus.png");
  const { server, logs } = startDevServer();
  const chromeExecutable = resolveChromeExecutable();
  let browser;

  try {
    await waitForApp(server, logs);
    browser = await chromium.launch({
      headless: true,
      ...(chromeExecutable ? { executablePath: chromeExecutable } : {}),
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const consoleErrors = [];
    let previewRequestCount = 0;
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

    await page.goto(appUrl, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /pdf preview/i }).click();

    const pdfPage = page.getByRole("img", { name: "Compiled PDF preview page" });
    await pdfPage.waitFor({ state: "visible", timeout: 45000 });
    await page.waitForFunction(() => {
      const image = [...document.images].find((candidate) => candidate.alt === "Compiled PDF preview page");
      return image?.complete && image.naturalWidth > 0;
    });
    const beforePreviewSrc = await pdfPage.evaluate((image) => image.getAttribute("src"));
    await pdfPage.screenshot({ path: beforePath });

    await page.locator(".ProseMirror").click({ position: { x: 120, y: 120 } });
    await page.waitForTimeout(1000);
    const afterPreviewSrc = await pdfPage.evaluate((image) => image.getAttribute("src"));
    await pdfPage.screenshot({ path: afterPath });

    if (previewRequestCount !== 1) {
      throw new Error(`Editor focus should not recompile the PDF preview, but saw ${previewRequestCount} preview requests.`);
    }

    if (afterPreviewSrc !== beforePreviewSrc) {
      throw new Error("Editor focus replaced the compiled PDF preview image source.");
    }

    const changedPixels = await changedPixelCount(beforePath, afterPath);
    if (changedPixels !== 0) {
      throw new Error(`PDF preview changed after focusing the editor: ${changedPixels} pixels differed.`);
    }

    if (consoleErrors.length > 0) {
      throw new Error(`Browser console errors were emitted:\n${consoleErrors.join("\n")}`);
    }

    console.log("Editor focus parity verified: compiled PDF preview stayed pixel-identical after editor focus.");
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
