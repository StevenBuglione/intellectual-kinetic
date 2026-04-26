import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { CanonicalDocument } from "@/lib/editor-core/types";
import { compileCanonicalDocumentToPdf } from "@/lib/latex/compiler";
import { renderCanonicalDocumentToEditorHtml } from "./editor-html-renderer";

const execFileAsync = promisify(execFile);
const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1056;
const DEFAULT_MAX_DIFFERENT_PIXELS = Number(process.env.IK_VISUAL_MAX_DIFFERENT_PIXELS ?? 108_500);
const DEFAULT_MAX_NORMALIZED_DIFFERENCE = Number(process.env.IK_VISUAL_MAX_NORMALIZED_DIFFERENCE ?? 0.126);

export type VisualParityThresholds = {
  maxDifferentPixels: number;
  maxNormalizedDifference: number;
};

export type VisualParityMetrics = {
  differentPixels: number;
  normalizedDifference: number;
  pixelPerfect: boolean;
  editorWidth: number;
  editorHeight: number;
  pdfWidth: number;
  pdfHeight: number;
};

export type VisualParityFixtureReport = {
  id: string;
  checks: string[];
  errors: string[];
  metrics: VisualParityMetrics;
  thresholds: VisualParityThresholds;
  artifacts?: {
    editorImage?: string;
    pdfImage?: string;
    diffImage?: string;
  };
};

export type VisualParityVerificationReport = {
  status: "passed" | "failed";
  fixtures: VisualParityFixtureReport[];
};

export async function runVisualParityVerification(
  documents: CanonicalDocument[],
  thresholds: VisualParityThresholds = {
    maxDifferentPixels: DEFAULT_MAX_DIFFERENT_PIXELS,
    maxNormalizedDifference: DEFAULT_MAX_NORMALIZED_DIFFERENCE,
  },
): Promise<VisualParityVerificationReport> {
  const fixtures: VisualParityFixtureReport[] = [];

  for (const document of documents) {
    fixtures.push(await runVisualParityFixture(document, thresholds));
  }

  return {
    status: fixtures.every((fixture) => fixture.errors.length === 0) ? "passed" : "failed",
    fixtures,
  };
}

export async function runVisualParityFixture(
  document: CanonicalDocument,
  thresholds: VisualParityThresholds = {
    maxDifferentPixels: DEFAULT_MAX_DIFFERENT_PIXELS,
    maxNormalizedDifference: DEFAULT_MAX_NORMALIZED_DIFFERENCE,
  },
): Promise<VisualParityFixtureReport> {
  const workingDirectory = await mkdtemp(path.join(tmpdir(), "ik-visual-parity-"));
  const checks: string[] = [];
  const errors: string[] = [];
  const artifacts: NonNullable<VisualParityFixtureReport["artifacts"]> = {};
  const htmlPath = path.join(workingDirectory, "editor.html");
  const editorImagePath = path.join(workingDirectory, "editor.png");
  const pdfImagePath = path.join(workingDirectory, "pdf.png");
  const diffImagePath = path.join(workingDirectory, "diff.png");

  try {
    await writeFile(htmlPath, renderCanonicalDocumentToEditorHtml(document), "utf8");
    await renderEditorScreenshot(htmlPath, editorImagePath);
    checks.push("editor-browser-render");

    const pdf = await compileCanonicalDocumentToPdf(document);
    if (pdf.status !== "compiled" || !pdf.previewImageBase64) {
      errors.push("PDF compilation did not produce a preview image.");
      return emptyReport(document.id, checks, errors, thresholds, artifacts);
    }

    await writeFile(pdfImagePath, Buffer.from(pdf.previewImageBase64, "base64"));
    checks.push("pdf-page-render");

    const [editorSize, pdfSize] = await Promise.all([
      identifyImage(editorImagePath),
      identifyImage(pdfImagePath),
    ]);

    if (editorSize.width !== PAGE_WIDTH || editorSize.height !== PAGE_HEIGHT) {
      errors.push(`Editor render size drifted to ${editorSize.width}x${editorSize.height}.`);
    }

    if (pdfSize.width !== PAGE_WIDTH || pdfSize.height !== PAGE_HEIGHT) {
      errors.push(`PDF render size drifted to ${pdfSize.width}x${pdfSize.height}.`);
    }

    const differentPixels = await compareImages(editorImagePath, pdfImagePath, diffImagePath);
    const normalizedDifference = differentPixels / (PAGE_WIDTH * PAGE_HEIGHT);
    const metrics = {
      differentPixels,
      normalizedDifference,
      pixelPerfect: differentPixels === 0,
      editorWidth: editorSize.width,
      editorHeight: editorSize.height,
      pdfWidth: pdfSize.width,
      pdfHeight: pdfSize.height,
    };
    checks.push("editor-pdf-visual-diff");

    if (differentPixels > thresholds.maxDifferentPixels) {
      errors.push(
        `Visual diff exceeded threshold: ${differentPixels} changed pixels > ${thresholds.maxDifferentPixels}.`,
      );
    }

    if (normalizedDifference > thresholds.maxNormalizedDifference) {
      errors.push(
        `Visual diff ratio exceeded threshold: ${normalizedDifference.toFixed(4)} > ${thresholds.maxNormalizedDifference}.`,
      );
    }

    Object.assign(artifacts, await persistVisualArtifacts(document.id, {
      editorImagePath,
      pdfImagePath,
      diffImagePath,
    }));

    return {
      id: document.id,
      checks,
      errors,
      metrics,
      thresholds,
      artifacts: Object.keys(artifacts).length > 0 ? artifacts : undefined,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Unknown visual parity verification failure.");
    return emptyReport(document.id, checks, errors, thresholds, artifacts);
  } finally {
    await rm(workingDirectory, { recursive: true, force: true });
  }
}

async function renderEditorScreenshot(htmlPath: string, outputPath: string) {
  const chrome = resolveChromeExecutable();
  await execFileAsync(
    chrome,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=${PAGE_WIDTH},${PAGE_HEIGHT}`,
      `--screenshot=${outputPath}`,
      `file://${htmlPath}`,
    ],
    {
      timeout: 20_000,
      maxBuffer: 1024 * 1024 * 4,
    },
  );
}

async function identifyImage(imagePath: string): Promise<{ width: number; height: number }> {
  const result = await execFileAsync("identify", ["-format", "%w %h", imagePath], {
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
  });
  const [width, height] = result.stdout.trim().split(/\s+/).map(Number);

  return { width, height };
}

async function compareImages(editorImagePath: string, pdfImagePath: string, diffImagePath: string): Promise<number> {
  try {
    const result = await execFileAsync(
      "compare",
      ["-metric", "AE", editorImagePath, pdfImagePath, diffImagePath],
      {
        timeout: 20_000,
        maxBuffer: 1024 * 1024 * 4,
      },
    );

    return parseChangedPixelCount(result.stderr);
  } catch (error) {
    if (isExecError(error)) {
      return parseChangedPixelCount(error.stderr);
    }

    throw error;
  }
}

function parseChangedPixelCount(value: string): number {
  const match = value.match(/\d+/);
  if (!match) {
    throw new Error(`Could not parse ImageMagick compare output: ${value}`);
  }

  return Number(match[0]);
}

async function persistVisualArtifacts(
  documentId: string,
  paths: {
    editorImagePath: string;
    pdfImagePath: string;
    diffImagePath: string;
  },
): Promise<NonNullable<VisualParityFixtureReport["artifacts"]>> {
  const root = process.env.IK_ARTIFACT_ROOT;
  if (!root) {
    return {};
  }

  const artifactDirectory = path.join(root, "visual-parity", documentId);
  await mkdir(artifactDirectory, { recursive: true });
  const editorImage = path.join(artifactDirectory, "editor.png");
  const pdfImage = path.join(artifactDirectory, "pdf.png");
  const diffImage = path.join(artifactDirectory, "diff.png");
  await Promise.all([
    copyFile(paths.editorImagePath, editorImage),
    copyFile(paths.pdfImagePath, pdfImage),
    copyFile(paths.diffImagePath, diffImage),
  ]);

  return { editorImage, pdfImage, diffImage };
}

function emptyReport(
  id: string,
  checks: string[],
  errors: string[],
  thresholds: VisualParityThresholds,
  artifacts: NonNullable<VisualParityFixtureReport["artifacts"]>,
): VisualParityFixtureReport {
  return {
    id,
    checks,
    errors,
    metrics: {
      differentPixels: Number.POSITIVE_INFINITY,
      normalizedDifference: Number.POSITIVE_INFINITY,
      pixelPerfect: false,
      editorWidth: 0,
      editorHeight: 0,
      pdfWidth: 0,
      pdfHeight: 0,
    },
    thresholds,
    artifacts: Object.keys(artifacts).length > 0 ? artifacts : undefined,
  };
}

function resolveChromeExecutable(): string {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.GOOGLE_CHROME_BIN,
    "/home/sbuglione/.local/bin/google-chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean) as string[];

  return candidates[0];
}

function isExecError(error: unknown): error is Error & { stderr: string } {
  return error instanceof Error && "stderr" in error && typeof error.stderr === "string";
}
