import { describe, expect, it } from "vitest";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { serializeCanonicalDocumentToLatex } from "@/lib/latex/serializer";
import {
  calculateDocumentStatistics,
  pasteSpecialToCanonicalBlocks,
  replaceAllInCanonicalDocument,
} from "../document-workflows";

describe("document workflow commands", () => {
  it("replaces matching text across canonical AST without losing metadata", () => {
    const result = replaceAllInCanonicalDocument(restorationFoundationFixture, {
      find: "motion",
      replaceWith: "movement",
      matchCase: false,
    });

    expect(result.replacementCount).toBe(2);
    expect(result.document.id).toBe(restorationFoundationFixture.id);
    expect(result.document.blocks[0]).toMatchObject({
      id: restorationFoundationFixture.blocks[0].id,
      reviewState: restorationFoundationFixture.blocks[0].reviewState,
    });
    expect(JSON.stringify(result.document)).toContain("A Treatise on movement");
    expect(JSON.stringify(result.document)).toContain("Uniform movement preserves proportional distance");
    expect(JSON.stringify(result.document)).not.toContain("A Treatise on Motion");
  });

  it("calculates document statistics from the same canonical text used for PDF parity", () => {
    const stats = calculateDocumentStatistics(restorationFoundationFixture);

    expect(stats.words).toBe(18);
    expect(stats.charactersNoSpaces).toBe(101);
    expect(stats.paragraphLikeBlocks).toBe(2);
    expect(stats.totalBlocks).toBe(4);
    expect(stats.mathBlocks).toBe(1);
  });

  it("normalizes LaTeX, HTML, and plain text paste-special payloads into canonical blocks", () => {
    expect(pasteSpecialToCanonicalBlocks({
      format: "latex",
      source: "\\section{Imported Section}\nImported body.\n\\begin{equation}E=mc^2\\end{equation}",
    })).toEqual([
      expect.objectContaining({ type: "heading", level: 1 }),
      expect.objectContaining({ type: "paragraph" }),
      expect.objectContaining({ type: "math_display", tex: "E=mc^2" }),
    ]);

    expect(pasteSpecialToCanonicalBlocks({
      format: "html",
      source: "<h1>HTML Heading</h1><p>HTML <strong>body</strong>.</p>",
    })).toEqual([
      expect.objectContaining({ type: "heading", level: 1 }),
      expect.objectContaining({ type: "paragraph" }),
    ]);

    expect(pasteSpecialToCanonicalBlocks({
      format: "plain-text",
      source: "First paragraph.\n\nSecond paragraph.",
    })).toEqual([
      expect.objectContaining({ type: "paragraph" }),
      expect.objectContaining({ type: "paragraph" }),
    ]);
  });

  it("feeds workflow command output through deterministic LaTeX serialization", () => {
    const replaced = replaceAllInCanonicalDocument(restorationFoundationFixture, {
      find: "Motion",
      replaceWith: "Movement",
      matchCase: true,
    }).document;
    const pastedBlocks = pasteSpecialToCanonicalBlocks({
      format: "latex",
      source: "\\section{Imported Section}\nImported body.",
    });
    const serialized = serializeCanonicalDocumentToLatex({
      ...replaced,
      blocks: [...replaced.blocks, ...pastedBlocks],
    });

    expect(serialized.source).toContain("\\IkHeadingOne{A Treatise on Movement}");
    expect(serialized.source).toContain("\\IkHeadingOne{Imported Section}");
    expect(serialized.source).toContain("Imported body.");
    expect(serialized.diagnostics).toEqual([]);
  });
});
