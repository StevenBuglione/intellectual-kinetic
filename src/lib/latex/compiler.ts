import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { CanonicalDocument } from "@/lib/editor-core/types";
import type { LatexDiagnostic } from "./serializer";
import { serializeCanonicalDocumentToLatex } from "./serializer";

const execFileAsync = promisify(execFile);

export type LatexCompileResult = {
  status: "compiled" | "failed";
  artifactName: string;
  pdfBase64?: string;
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
    const pdf = await readFile(path.join(workingDirectory, "main.pdf"));
    await persistPreviewArtifact(artifactName, pdf);

    return {
      status: "compiled",
      artifactName,
      pdfBase64: pdf.toString("base64"),
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

async function persistPreviewArtifact(artifactName: string, pdf: Buffer) {
  const root = process.env.IK_ARTIFACT_ROOT;
  if (!root) {
    return;
  }

  const latexDirectory = path.join(root, "latex");
  await mkdir(latexDirectory, { recursive: true });
  await writeFile(path.join(latexDirectory, artifactName), pdf);
}
