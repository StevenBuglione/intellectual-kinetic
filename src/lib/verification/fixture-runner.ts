import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { validateCanonicalDocument } from "@/lib/editor-core/canonical-document";
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

export function runParityFixtureVerification(): FixtureVerificationReport {
  const fixtureReports = fixtures.map((fixture) => {
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

    return {
      id: fixture.id,
      checks,
      errors,
    };
  });

  return {
    status: fixtureReports.every((fixture) => fixture.errors.length === 0) ? "passed" : "failed",
    fixtures: fixtureReports,
  };
}
