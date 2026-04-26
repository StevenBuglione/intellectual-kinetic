import { describe, expect, it } from "vitest";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { tiptapDocumentToCanonicalPatch, canonicalToTiptapDocument } from "@/lib/tiptap-adapter/projection";
import { compileCanonicalDocumentToPdf } from "../compiler";

function normalizePdfParityText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

describe("LaTeX PDF compiler", () => {
  it("compiles the canonical fixture into a PDF preview artifact", async () => {
    const result = await compileCanonicalDocumentToPdf(restorationFoundationFixture);

    expect(result.status).toBe("compiled");
    expect(result.pdfBase64?.startsWith("JVBER")).toBe(true);
    expect(result.artifactName).toBe("fixture-restoration-foundation-preview.pdf");
    expect(result.diagnostics).toEqual([]);
  }, 30_000);

  it("proves edited Tiptap text reaches the compiled PDF text layer", async () => {
    const projected = canonicalToTiptapDocument(restorationFoundationFixture);
    projected.content![1] = {
      type: "paragraph",
      attrs: projected.content![1].attrs,
      content: [{ type: "text", text: "Concrete editor to PDF parity phrase 2026." }],
    };
    const patch = tiptapDocumentToCanonicalPatch(projected);
    const editedDocument = {
      ...restorationFoundationFixture,
      id: "fixture-edited-pdf-parity",
      blocks: patch.blocks,
    };

    const result = await compileCanonicalDocumentToPdf(editedDocument);

    expect(result.status).toBe("compiled");
    expect(result.extractedText).toContain("Concrete editor to PDF parity phrase 2026.");
  }, 30_000);

  it("renders the same semantic text in the editor surface and compiled PDF text layer", async () => {
    const result = await compileCanonicalDocumentToPdf(restorationFoundationFixture);

    expect(result.status).toBe("compiled");
    expect(normalizePdfParityText(result.extractedText)).toBe(
      "A Treatise on Motion Let v denote velocity and cite @newton1687. Uniform motion preserves proportional distance. s = vt",
    );
  }, 30_000);
});
