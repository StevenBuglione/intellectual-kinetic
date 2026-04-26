import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { CanonicalDocument } from "@/lib/editor-core/types";
import { pageLayoutContract } from "@/lib/layout/page-layout-contract";
import type { LatexDiagnostic } from "./serializer";
import { serializeCanonicalDocumentToLatex } from "./serializer";

const execFileAsync = promisify(execFile);

export type LatexCompileResult = {
  status: "compiled" | "failed";
  artifactName: string;
  pdfBase64?: string;
  previewImageBase64?: string;
  previewPageImageBase64?: string[];
  pdfFonts?: string[];
  extractedText?: string;
  log: string;
  diagnostics: LatexDiagnostic[];
};

export async function compileCanonicalDocumentToPdf(
  document: CanonicalDocument,
): Promise<LatexCompileResult> {
  const serialized = serializeCanonicalDocumentToLatex(document);
  const artifactName = `${document.id}-preview.pdf`;
  const workingDirectory = await mkdtemp(path.join(tmpdir(), "ik-latex-"));
  const texFile = path.join(workingDirectory, "main.tex");

  try {
    await writeFile(texFile, serialized.source, "utf8");
    const compile = await runPdflatex(workingDirectory);
    const pdfPath = path.join(workingDirectory, "main.pdf");
    const pdf = await readFile(pdfPath);
    const previewImages = await renderPdfPreviewImages(pdfPath, workingDirectory);
    const pdfFonts = await extractPdfFonts(pdfPath);
    const extractedText = await extractPdfText(pdfPath);
    await persistPreviewArtifact(artifactName, pdf);

    return {
      status: "compiled",
      artifactName,
      pdfBase64: pdf.toString("base64"),
      previewImageBase64: previewImages[0]?.toString("base64"),
      previewPageImageBase64: previewImages.map((previewImage) => previewImage.toString("base64")),
      pdfFonts,
      extractedText,
      log: compile.stdout + compile.stderr,
      diagnostics: serialized.diagnostics,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown LaTeX compile failure";
    return {
      status: "failed",
      artifactName,
      log: message,
      diagnostics: [
        ...serialized.diagnostics,
        {
          severity: "error",
          code: "latex-compile-failed",
          message,
        },
      ],
    };
  } finally {
    await rm(workingDirectory, { recursive: true, force: true });
  }
}

export function pdfSatisfiesFontContract(pdfFonts: string[]): boolean {
  return pageLayoutContract.fonts.requiredPdfBodyFonts.every((requiredFont) => pdfFonts.includes(requiredFont));
}

async function runPdflatex(cwd: string) {
  return execFileAsync(
    "pdflatex",
    ["-interaction=nonstopmode", "-halt-on-error", "main.tex"],
    {
      cwd,
      timeout: 20_000,
      maxBuffer: 1024 * 1024 * 4,
    },
  );
}

async function extractPdfText(pdfPath: string): Promise<string> {
  const result = await execFileAsync("pdftotext", [pdfPath, "-"], {
    timeout: 10_000,
    maxBuffer: 1024 * 1024 * 4,
  });

  return result.stdout;
}

async function extractPdfFonts(pdfPath: string): Promise<string[]> {
  const result = await execFileAsync("pdffonts", [pdfPath], {
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
  });

  return [...new Set(result.stdout
    .split("\n")
    .slice(2)
    .map((line) => normalizePdfFontName(line.trim().split(/\s+/)[0] ?? ""))
    .filter(Boolean))]
    .sort();
}

function normalizePdfFontName(fontName: string): string {
  return fontName.replace(/^[A-Z]{6}\+/, "");
}

async function renderPdfPreviewImages(pdfPath: string, cwd: string): Promise<Buffer[]> {
  const outputPrefix = path.join(cwd, "preview-page");
  await execFileAsync("pdftoppm", ["-png", "-r", "96", pdfPath, outputPrefix], {
    timeout: 10_000,
    maxBuffer: 1024 * 1024 * 4,
  });

  const files = (await readdir(cwd))
    .filter((file) => /^preview-page-\d+\.png$/.test(file))
    .sort((left, right) => pageImageIndex(left) - pageImageIndex(right));

  return Promise.all(files.map((file) => readFile(path.join(cwd, file))));
}

function pageImageIndex(file: string): number {
  return Number(file.match(/preview-page-(\d+)\.png/)?.[1] ?? 0);
}

async function persistPreviewArtifact(artifactName: string, pdf: Buffer) {
  const root = process.env.IK_ARTIFACT_ROOT;
  if (!root) {
    return;
  }

  const latexDirectory = path.join(root, "latex");
  await mkdir(latexDirectory, { recursive: true });
  await writeFile(path.join(latexDirectory, artifactName), pdf);
}
