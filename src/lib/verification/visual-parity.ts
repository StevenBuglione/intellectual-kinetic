import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { getVisualParityRatchet } from "@/fixtures/parity/visual-ratchets";
import type { CanonicalDocument } from "@/lib/editor-core/types";
import { compileCanonicalDocumentToPdf } from "@/lib/latex/compiler";
import { pageLayoutContract, pagePixelCount } from "@/lib/layout/page-layout-contract";
import { renderCanonicalDocumentPagesToEditorHtml } from "./editor-html-renderer";

const execFileAsync = promisify(execFile);
const { page } = pageLayoutContract;
const DEFAULT_MAX_DIFFERENT_PIXELS = Number(process.env.IK_VISUAL_MAX_DIFFERENT_PIXELS ?? 108_500);
const DEFAULT_MAX_NORMALIZED_DIFFERENCE = Number(process.env.IK_VISUAL_MAX_NORMALIZED_DIFFERENCE ?? 0.126);

export type VisualParityThresholds = {
  maxDifferentPixels: number;
  maxNormalizedDifference: number;
  targetDifferentPixels: number;
};

export type VisualParityMetrics = {
  differentPixels: number;
  normalizedDifference: number;
  pixelPerfect: boolean;
  editorWidth: number;
  editorHeight: number;
  pdfWidth: number;
  pdfHeight: number;
  pageCount: number;
  pages: VisualParityPageMetrics[];
};

export type VisualParityPageMetrics = {
  pageNumber: number;
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
  thresholdOverrides?: Partial<VisualParityThresholds>,
): Promise<VisualParityVerificationReport> {
  const fixtures: VisualParityFixtureReport[] = [];

  for (const document of documents) {
    fixtures.push(await runVisualParityFixture(document, resolveVisualParityThresholds(document.id, thresholdOverrides)));
  }

  return {
    status: fixtures.every((fixture) => fixture.errors.length === 0) ? "passed" : "failed",
    fixtures,
  };
}

export async function runVisualParityFixture(
  document: CanonicalDocument,
  thresholds: VisualParityThresholds = resolveVisualParityThresholds(document.id),
): Promise<VisualParityFixtureReport> {
  const workingDirectory = await mkdtemp(path.join(tmpdir(), "ik-visual-parity-"));
  const checks: string[] = [];
  const errors: string[] = [];
  const artifacts: NonNullable<VisualParityFixtureReport["artifacts"]> = {};

  try {
    const editorPageHtml = renderCanonicalDocumentPagesToEditorHtml(document);
    const editorImagePaths = await renderEditorPageScreenshots(workingDirectory, editorPageHtml);
    checks.push("editor-browser-render");

    const pdf = await compileCanonicalDocumentToPdf(document);
    const pdfPageImages = pdf.previewPageImageBase64 ?? (pdf.previewImageBase64 ? [pdf.previewImageBase64] : []);
    if (pdf.status !== "compiled" || pdfPageImages.length === 0) {
      errors.push("PDF compilation did not produce a preview image.");
      return emptyReport(document.id, checks, errors, thresholds, artifacts);
    }

    const pdfImagePaths = await writePdfPageImages(workingDirectory, pdfPageImages);
    checks.push("pdf-page-render");

    if (editorImagePaths.length !== pdfImagePaths.length) {
      errors.push(
        `Editor/PDF page count mismatch: ${editorImagePaths.length} editor pages vs ${pdfImagePaths.length} PDF pages.`,
      );
    }

    const pageCount = Math.min(editorImagePaths.length, pdfImagePaths.length);
    const pageMetrics: VisualParityPageMetrics[] = [];

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const editorImagePath = editorImagePaths[pageIndex];
      const pdfImagePath = pdfImagePaths[pageIndex];
      const diffImagePath = path.join(workingDirectory, `diff-page-${pageIndex + 1}.png`);
      const [editorSize, pdfSize] = await Promise.all([
        identifyImage(editorImagePath),
        identifyImage(pdfImagePath),
      ]);

      if (editorSize.width !== page.widthPx || editorSize.height !== page.heightPx) {
        errors.push(`Editor page ${pageIndex + 1} render size drifted to ${editorSize.width}x${editorSize.height}.`);
      }

      if (pdfSize.width !== page.widthPx || pdfSize.height !== page.heightPx) {
        errors.push(`PDF page ${pageIndex + 1} render size drifted to ${pdfSize.width}x${pdfSize.height}.`);
      }

      const pageDifferentPixels = await compareImages(editorImagePath, pdfImagePath, diffImagePath);
      pageMetrics.push({
        pageNumber: pageIndex + 1,
        differentPixels: pageDifferentPixels,
        normalizedDifference: pageDifferentPixels / pagePixelCount,
        pixelPerfect: pageDifferentPixels === thresholds.targetDifferentPixels,
        editorWidth: editorSize.width,
        editorHeight: editorSize.height,
        pdfWidth: pdfSize.width,
        pdfHeight: pdfSize.height,
      });
    }

    const differentPixels = pageMetrics.reduce((sum, pageMetric) => sum + pageMetric.differentPixels, 0);
    const normalizedDifference = differentPixels / Math.max(1, pageMetrics.length * pagePixelCount);
    const metrics = {
      differentPixels,
      normalizedDifference,
      pixelPerfect: differentPixels === thresholds.targetDifferentPixels,
      editorWidth: pageMetrics[0]?.editorWidth ?? 0,
      editorHeight: pageMetrics[0]?.editorHeight ?? 0,
      pdfWidth: pageMetrics[0]?.pdfWidth ?? 0,
      pdfHeight: pageMetrics[0]?.pdfHeight ?? 0,
      pageCount: pageMetrics.length,
      pages: pageMetrics,
    };
    checks.push("editor-pdf-visual-diff");
    checks.push("editor-pdf-page-sequence");

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
      editorImagePath: editorImagePaths[0],
      pdfImagePath: pdfImagePaths[0],
      diffImagePath: path.join(workingDirectory, "diff-page-1.png"),
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
      `--window-size=${page.widthPx},${page.heightPx}`,
      `--screenshot=${outputPath}`,
      `file://${htmlPath}`,
    ],
    {
      timeout: 20_000,
      maxBuffer: 1024 * 1024 * 4,
    },
  );
}

async function renderEditorPageScreenshots(workingDirectory: string, editorPageHtml: string[]): Promise<string[]> {
  const outputPaths: string[] = [];

  for (const [index, html] of editorPageHtml.entries()) {
    const htmlPath = path.join(workingDirectory, `editor-page-${index + 1}.html`);
    const outputPath = path.join(workingDirectory, `editor-page-${index + 1}.png`);
    await writeFile(htmlPath, html, "utf8");
    await renderEditorScreenshot(htmlPath, outputPath);
    outputPaths.push(outputPath);
  }

  return outputPaths;
}

async function writePdfPageImages(workingDirectory: string, pdfPageImages: string[]): Promise<string[]> {
  const outputPaths: string[] = [];

  for (const [index, image] of pdfPageImages.entries()) {
    const outputPath = path.join(workingDirectory, `pdf-page-${index + 1}.png`);
    await writeFile(outputPath, Buffer.from(image, "base64"));
    outputPaths.push(outputPath);
  }

  return outputPaths;
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
      pageCount: 0,
      pages: [],
    },
    thresholds,
    artifacts: Object.keys(artifacts).length > 0 ? artifacts : undefined,
  };
}

function resolveVisualParityThresholds(
  fixtureId: string,
  overrides?: Partial<VisualParityThresholds>,
): VisualParityThresholds {
  const ratchet = getVisualParityRatchet(fixtureId);
  return {
    maxDifferentPixels: overrides?.maxDifferentPixels ?? ratchet?.maxDifferentPixels ?? DEFAULT_MAX_DIFFERENT_PIXELS,
    maxNormalizedDifference: overrides?.maxNormalizedDifference ?? ratchet?.maxNormalizedDifference ?? DEFAULT_MAX_NORMALIZED_DIFFERENCE,
    targetDifferentPixels: overrides?.targetDifferentPixels ?? ratchet?.targetDifferentPixels ?? pageLayoutContract.targets.pixelPerfectDifferentPixels,
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
