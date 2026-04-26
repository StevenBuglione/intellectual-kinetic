import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { CanonicalDocument } from "@/lib/editor-core/types";
import { serializeCanonicalDocumentToLatex } from "@/lib/latex/serializer";

const execFileAsync = promisify(execFile);

export type LyxOracleFixture = {
  id: string;
  kind: "canonical-comparison" | "lyx-export-regression";
  lyxPath: string;
  expectedText: string[];
  lyxRequiredSource: string[];
  featureIds: string[];
  canonicalDocument?: CanonicalDocument;
  canonicalRequiredSource?: string[];
  referenceTexPath?: string;
};

export type LyxExportResult = {
  source: string;
  log: string;
};

export type LyxOracleExporter = {
  exportLyxToLatex: (fixture: LyxOracleFixture) => Promise<LyxExportResult>;
};

export type LyxOracleFixtureReport = {
  id: string;
  kind: LyxOracleFixture["kind"];
  checks: string[];
  errors: string[];
  featureIds: string[];
};

export type LyxOracleVerificationReport = {
  status: "passed" | "failed";
  fixtures: LyxOracleFixtureReport[];
  coveredFeatureIds: string[];
};

export async function runLyxOracleVerification(
  fixtures: LyxOracleFixture[],
  exporter: LyxOracleExporter = { exportLyxToLatex },
): Promise<LyxOracleVerificationReport> {
  const fixtureReports = await Promise.all(fixtures.map((fixture) => runLyxOracleFixture(fixture, exporter)));
  const coveredFeatureIds = [...new Set(fixtureReports.flatMap((fixture) => fixture.featureIds))].sort();

  return {
    status: fixtureReports.every((fixture) => fixture.errors.length === 0) ? "passed" : "failed",
    fixtures: fixtureReports,
    coveredFeatureIds,
  };
}

async function runLyxOracleFixture(
  fixture: LyxOracleFixture,
  exporter: LyxOracleExporter,
): Promise<LyxOracleFixtureReport> {
  const checks: string[] = [];
  const errors: string[] = [];
  const lyxExport = await exporter.exportLyxToLatex(fixture);
  checks.push("lyx-export");

  const lyxSource = normalizeLatex(lyxExport.source);
  const canonicalSource = fixture.canonicalDocument
    ? normalizeLatex(serializeCanonicalDocumentToLatex(fixture.canonicalDocument).source)
    : null;

  if (canonicalSource) {
    checks.push("canonical-latex-serialization");
  }

  assertSourceContains("LyX export", lyxSource, fixture.lyxRequiredSource, errors);
  checks.push("lyx-source-signatures");

  if (fixture.referenceTexPath) {
    const referenceSource = normalizeLatex(await readFile(fixture.referenceTexPath, "utf8"));
    assertSourceContains("LyX export", lyxSource, extractStableReferenceSignatures(referenceSource), errors);
    checks.push("upstream-reference-tex-signatures");
  }

  if (canonicalSource && fixture.canonicalRequiredSource) {
    assertSourceContains("Canonical export", canonicalSource, fixture.canonicalRequiredSource, errors);
    checks.push("canonical-source-signatures");
  }

  for (const text of fixture.expectedText) {
    const normalizedText = normalizeComparableText(text);
    const lyxComparableText = normalizeComparableText(lyxSource);
    const canonicalComparableText = canonicalSource ? normalizeComparableText(canonicalSource) : null;

    if (!lyxComparableText.includes(normalizedText)) {
      errors.push(`LyX export missing shared text signature: ${text}`);
    }

    if (canonicalComparableText && !canonicalComparableText.includes(normalizedText)) {
      errors.push(`Canonical export missing shared text signature: ${text}`);
    }
  }
  checks.push("shared-text-signatures");

  if (fixture.featureIds.length > 0) {
    checks.push("lyx-feature-coverage");
  } else {
    errors.push("LyX oracle fixture does not declare covered LyX feature IDs.");
  }

  return {
    id: fixture.id,
    kind: fixture.kind,
    checks,
    errors,
    featureIds: fixture.featureIds,
  };
}

async function exportLyxToLatex(fixture: LyxOracleFixture): Promise<LyxExportResult> {
  const workingDirectory = await mkdtemp(path.join(tmpdir(), "ik-lyx-oracle-"));
  const userDirectory = path.join(workingDirectory, "userdir");
  const inputPath = path.join(workingDirectory, path.basename(fixture.lyxPath));
  const outputPath = path.join(workingDirectory, "oracle.tex");

  try {
    await mkdir(userDirectory, { recursive: true });
    await copyFile(fixture.lyxPath, inputPath);
    const result = await execFileAsync(
      "lyx",
      ["-userdir", userDirectory, "-E", "latex", outputPath, inputPath],
      {
        cwd: workingDirectory,
        timeout: 60_000,
        maxBuffer: 1024 * 1024 * 8,
      },
    );
    const source = await readFile(outputPath, "utf8");

    return {
      source,
      log: `${result.stdout}${result.stderr}`,
    };
  } finally {
    await rm(workingDirectory, { recursive: true, force: true });
  }
}

function assertSourceContains(
  label: string,
  source: string,
  signatures: string[],
  errors: string[],
) {
  for (const signature of signatures) {
    if (!source.includes(normalizeLatex(signature))) {
      errors.push(`${label} missing source signature: ${signature}`);
    }
  }
}

function normalizeLatex(source: string): string {
  return source.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function normalizeComparableText(source: string): string {
  return normalizeLatex(source)
    .replace(/\\IkHeadingOne\{([^}]*)\}/g, "$1")
    .replace(/\\(?:section|subsection|chapter)\*?\{([^}]*)\}/g, "$1")
    .replace(/\s*=\s*/g, "=")
    .replace(/\\begin\{[^}]+\}|\\end\{[^}]+\}/g, " ")
    .replace(/\\\[|\\\]|\\\(|\\\)|\$/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractStableReferenceSignatures(referenceSource: string): string[] {
  return referenceSource
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => (
      line.length > 0
      && !line.startsWith("%%")
      && !line.startsWith("commit:")
      && !line.startsWith("author:")
      && !line.startsWith("date:")
      && !line.startsWith("time:")
    ))
    .slice(0, 12);
}
