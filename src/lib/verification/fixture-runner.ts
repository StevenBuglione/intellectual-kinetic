import { gateOneStructureFixture } from "@/fixtures/parity/gate-one-structure";
import { gateFourLyxCoreFixture } from "@/fixtures/parity/gate-four-lyx-core";
import { gateThreeLayoutFixture } from "@/fixtures/parity/gate-three-layout";
import { gateTwoScholarlyFixture } from "@/fixtures/parity/gate-two-scholarly";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { validateCanonicalDocument } from "@/lib/editor-core/canonical-document";
import { compareCanonicalDocumentToPdfText } from "@/lib/editor-core/plaintext";
import { compileCanonicalDocumentToPdf, pdfSatisfiesFontContract } from "@/lib/latex/compiler";
import { serializeCanonicalDocumentToLatex } from "@/lib/latex/serializer";
import { canonicalToTiptapDocument } from "@/lib/tiptap-adapter/projection";

export type FixtureVerificationReport = {
  status: "passed" | "failed";
  fixtures: Array<{
    id: string;
    checks: string[];
    errors: string[];
  }>;
};

const fixtures = [
  restorationFoundationFixture,
  gateOneStructureFixture,
  gateTwoScholarlyFixture,
  gateThreeLayoutFixture,
  gateFourLyxCoreFixture,
];

export async function runParityFixtureVerification(): Promise<FixtureVerificationReport> {
  const fixtureReports = await Promise.all(fixtures.map(async (fixture) => {
    const checks: string[] = [];
    const errors: string[] = [];

    const validation = validateCanonicalDocument(fixture);
    if (validation.ok) {
      checks.push("canonical-validation");
    } else {
      errors.push(...validation.errors);
    }

    const projected = canonicalToTiptapDocument(fixture);
    if (projected.type === "doc" && projected.content?.length === fixture.blocks.length) {
      checks.push("tiptap-projection");
    } else {
      errors.push("Tiptap projection did not preserve block count.");
    }

    const latex = serializeCanonicalDocumentToLatex(fixture);
    if (latex.source.includes("\\begin{document}") && latex.diagnostics.length === 0) {
      checks.push("latex-serialization");
    } else {
      errors.push("LaTeX serialization failed or produced diagnostics.");
    }

    const pdf = await compileCanonicalDocumentToPdf(fixture);
    if (pdf.status === "compiled" && pdf.pdfBase64?.startsWith("JVBER")) {
      checks.push("pdf-compilation");
    } else {
      errors.push("PDF compilation failed.");
    }

    if (pdf.status === "compiled" && pdfSatisfiesFontContract(pdf.pdfFonts ?? [])) {
      checks.push("pdf-font-contract");
    } else {
      errors.push(`PDF font contract failed. Fonts: ${(pdf.pdfFonts ?? []).join(", ") || "none"}.`);
    }

    const textParity = compareCanonicalDocumentToPdfText(fixture, pdf.extractedText);
    if (pdf.status === "compiled" && textParity.verified) {
      checks.push("pdf-text-parity");
    } else {
      errors.push(
        `PDF text does not match editor text. Expected "${textParity.expectedText}", received "${textParity.actualText}".`,
      );
    }

    return {
      id: fixture.id,
      checks,
      errors,
    };
  }));

  return {
    status: fixtureReports.every((fixture) => fixture.errors.length === 0) ? "passed" : "failed",
    fixtures: fixtureReports,
  };
}
