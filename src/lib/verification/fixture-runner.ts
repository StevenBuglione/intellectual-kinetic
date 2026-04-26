import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { validateCanonicalDocument } from "@/lib/editor-core/canonical-document";
import { compileCanonicalDocumentToPdf } from "@/lib/latex/compiler";
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

const fixtures = [restorationFoundationFixture];

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

    const expectedText = fixture.blocks.flatMap((block) => {
      if (block.type === "paragraph" || block.type === "heading" || block.type === "theorem") {
        return block.children.flatMap((child) => (child.type === "text" ? [child.text.trim()] : []));
      }

      if (block.type === "math_display") {
        return [block.tex.replaceAll(" ", "")];
      }

      return [];
    }).filter(Boolean);

    const extractedText = normalizePdfText(pdf.extractedText ?? "");
    const missingText = expectedText.filter((text) => !extractedText.includes(normalizePdfText(text)));
    if (pdf.status === "compiled" && missingText.length === 0) {
      checks.push("pdf-text-extraction");
    } else {
      errors.push(`PDF text extraction did not contain expected fixture text: ${missingText.join(", ")}`);
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

function normalizePdfText(value: string): string {
  return value.replace(/\s+/g, " ").replaceAll(" ", "").trim();
}
