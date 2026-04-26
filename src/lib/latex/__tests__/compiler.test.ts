import { describe, expect, it } from "vitest";
import { gateOneStructureFixture } from "@/fixtures/parity/gate-one-structure";
import { gateTwoScholarlyFixture } from "@/fixtures/parity/gate-two-scholarly";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { canonicalDocumentToEditorText } from "@/lib/editor-core/plaintext";
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
    expect(result.previewImageBase64?.startsWith("iVBOR")).toBe(true);
    expect(result.artifactName).toBe("fixture-restoration-foundation-preview.pdf");
    expect(result.pdfFonts).toEqual(expect.arrayContaining(["NimbusSanL-Regu", "NimbusSanL-Bold"]));
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

  it("compiles presentation-oriented document classes into a PDF preview artifact", async () => {
    const result = await compileCanonicalDocumentToPdf({
      ...restorationFoundationFixture,
      id: "fixture-beamer-preview",
      settings: {
        ...restorationFoundationFixture.settings,
        documentClass: "beamer",
        template: "presentation-default",
        templateFamily: "Presentations",
      },
    });

    expect(result.status).toBe("compiled");
    expect(result.previewImageBase64?.startsWith("iVBOR")).toBe(true);
    expect(normalizePdfParityText(result.extractedText)).toContain("A Treatise on Motion");
  }, 30_000);

  it("fails fast for DocBook/XML classes that are outside the PDF preview pipeline", async () => {
    const result = await compileCanonicalDocumentToPdf({
      ...restorationFoundationFixture,
      id: "fixture-docbook-preview",
      settings: {
        ...restorationFoundationFixture.settings,
        documentClass: "docbook",
        template: "lyx-docbook",
        templateFamily: "Articles",
      },
    });

    expect(result.status).toBe("failed");
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "docbook-preview-unsupported",
        severity: "error",
      }),
    ]));
  });

  it("fails fast for LyX classes that are source-only in the bundled PDF preview environment", async () => {
    const result = await compileCanonicalDocumentToPdf({
      ...restorationFoundationFixture,
      id: "fixture-acmart-preview",
      settings: {
        ...restorationFoundationFixture.settings,
        documentClass: "acmart",
        template: "lyx-acmart",
        templateFamily: "Articles",
      },
    });

    expect(result.status).toBe("failed");
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "document-class-preview-unavailable",
        severity: "error",
      }),
    ]));
    expect(result.log).toContain("source parity");
  });

  it("compiles Gate 1 structures into a text-verified rendered preview image", async () => {
    const result = await compileCanonicalDocumentToPdf(gateOneStructureFixture);

    expect(result.status).toBe("compiled");
    expect(result.previewImageBase64?.startsWith("iVBOR")).toBe(true);
    expect(result.previewPageImageBase64).toHaveLength(2);
    expect(result.previewPageImageBase64?.every((page) => page.startsWith("iVBOR"))).toBe(true);
    expect(normalizePdfParityText(result.extractedText)).toBe(
      normalizePdfParityText(canonicalDocumentToEditorText(gateOneStructureFixture)),
    );
  }, 30_000);

  it("compiles Gate 2 scholarly structures into a text-verified rendered preview image", async () => {
    const result = await compileCanonicalDocumentToPdf(gateTwoScholarlyFixture);

    expect(result.status).toBe("compiled");
    expect(result.previewImageBase64?.startsWith("iVBOR")).toBe(true);
    expect(normalizePdfParityText(result.extractedText)).toBe(
      normalizePdfParityText(canonicalDocumentToEditorText(gateTwoScholarlyFixture)),
    );
  }, 30_000);
});
