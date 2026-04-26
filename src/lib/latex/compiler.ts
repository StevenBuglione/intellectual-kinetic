import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { CanonicalDocument } from "@/lib/editor-core/types";
import { getLyxDocumentClassEntry } from "@/lib/lyx/document-classes";
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
  const documentClass = getLyxDocumentClassEntry(document.settings.documentClass);
  const serialized = serializeCanonicalDocumentToLatex(document);
  const artifactName = `${document.id}-preview.pdf`;

  if (documentClass?.previewSupport === "unsupported") {
    return {
      status: "failed",
      artifactName,
      log: documentClass.previewSupportMessage,
      diagnostics: [
        ...serialized.diagnostics,
        {
          severity: "error",
          code: "docbook-preview-unsupported",
          message: documentClass.previewSupportMessage,
        },
      ],
    };
  }

  if (documentClass?.previewSupport === "source-only") {
    return {
      status: "failed",
      artifactName,
      log: documentClass.previewSupportMessage,
      diagnostics: [
        ...serialized.diagnostics,
        {
          severity: "error",
          code: "document-class-preview-unavailable",
          message: documentClass.previewSupportMessage,
        },
      ],
    };
  }

  const workingDirectory = await mkdtemp(path.join(tmpdir(), "ik-latex-"));
  const texFile = path.join(workingDirectory, "main.tex");

  try {
    await writeFile(texFile, serialized.source, "utf8");
    await materializeEmbeddedAssets(document, workingDirectory);
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

async function materializeEmbeddedAssets(document: CanonicalDocument, workingDirectory: string) {
  await Promise.all(collectEmbeddedAssets(document.blocks).map((asset) => (
    writeFile(path.join(workingDirectory, asset.fileName), Buffer.from(asset.dataBase64, "base64"))
  )));
}

function collectEmbeddedAssets(blocks: CanonicalDocument["blocks"]) {
  return blocks.flatMap((block): Array<Extract<NonNullable<Extract<CanonicalDocument["blocks"][number], { type: "figure" }>["asset"]>, { kind: "embedded" }>> => {
    if (block.type === "figure" && block.asset?.kind === "embedded") {
      return [block.asset];
    }

    if (block.type === "branch") {
      return collectEmbeddedAssets(block.blocks);
    }

    if (block.type === "include" && block.resolvedBlocks) {
      return collectEmbeddedAssets(block.resolvedBlocks);
    }

    return [];
  });
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
