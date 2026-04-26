import { describe, expect, it } from "vitest";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { serializeCanonicalDocumentToLatex } from "@/lib/latex/serializer";
import {
  acceptTrackedChange,
  calculateDocumentStatistics,
  ensureChangeTrackingAuthor,
  listTrackedChanges,
  pasteSpecialToCanonicalBlocks,
  rejectTrackedChange,
  replaceAllInCanonicalDocument,
  trackBlockDeletion,
  trackBlockInsertion,
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

  it("replaces matches that span adjacent inline semantic nodes exactly once", () => {
    const result = replaceAllInCanonicalDocument(restorationFoundationFixture, {
      find: "Let v",
      replaceWith: "go",
      matchCase: true,
    });

    expect(result.replacementCount).toBe(1);
    expect(result.document.blocks[1]).toMatchObject({
      id: "block-intro",
      type: "paragraph",
      children: [
        { type: "text", text: "go denote velocity and cite " },
        { type: "citation", key: "newton1687" },
        { type: "text", text: "." },
      ],
    });
    expect(JSON.stringify(result.document).match(/s = vt/g)).toHaveLength(1);
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

  it("can preserve matched casing when a workflow replacement needs Docs-style corrections", () => {
    const result = replaceAllInCanonicalDocument(restorationFoundationFixture, {
      find: "motion",
      replaceWith: "movement",
      transformReplacement: (matchedText) => matchedText[0] === matchedText[0]?.toUpperCase()
        ? "Movement"
        : "movement",
    });

    expect(JSON.stringify(result.document)).toContain("A Treatise on Movement");
    expect(JSON.stringify(result.document)).toContain("Uniform movement preserves proportional distance");
  });

  it("tracks author-attributed insertions and deletions and resolves them", () => {
    const authorResult = ensureChangeTrackingAuthor(restorationFoundationFixture, "Alex Reviewer");
    const withDeletion = trackBlockDeletion(authorResult.document, {
      blockId: "block-intro",
      text: "velocity",
      authorId: authorResult.author.id,
      authorName: authorResult.author.name,
      createdAt: "2026-04-26T00:00:00.000Z",
    });
    const withInsertion = trackBlockInsertion(withDeletion, {
      blockId: "block-intro",
      insertAfterText: "Let ",
      text: "carefully ",
      authorId: authorResult.author.id,
      authorName: authorResult.author.name,
      createdAt: "2026-04-26T00:00:00.000Z",
    });

    const trackedChanges = listTrackedChanges(withInsertion);
    expect(withInsertion.metadata.changeTracking?.currentAuthorId).toBe(authorResult.author.id);
    expect(withInsertion.metadata.changeTracking?.authors).toContainEqual(authorResult.author);
    expect(trackedChanges).toEqual([
      expect.objectContaining({
        kind: "tracked_insert",
        authorName: "Alex Reviewer",
        text: "carefully ",
      }),
      expect.objectContaining({
        kind: "tracked_delete",
        authorName: "Alex Reviewer",
        text: "velocity",
      }),
    ]);

    const acceptedInsertion = acceptTrackedChange(withInsertion, trackedChanges[0].id);
    expect(JSON.stringify(acceptedInsertion)).toContain("carefully ");
    expect(listTrackedChanges(acceptedInsertion)).toHaveLength(1);

    const rejectedDeletion = rejectTrackedChange(acceptedInsertion, listTrackedChanges(acceptedInsertion)[0].id);
    expect(JSON.stringify(rejectedDeletion)).toContain("velocity");
    expect(listTrackedChanges(rejectedDeletion)).toHaveLength(0);
  });
});
