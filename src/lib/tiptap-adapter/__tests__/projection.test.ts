import { describe, expect, it } from "vitest";
import { gateFiveLyxBreadthFixture } from "@/fixtures/parity/gate-five-lyx-breadth";
import { gateFourLyxCoreFixture } from "@/fixtures/parity/gate-four-lyx-core";
import { gateOneStructureFixture } from "@/fixtures/parity/gate-one-structure";
import { gateThreeLayoutFixture } from "@/fixtures/parity/gate-three-layout";
import { gateTwoScholarlyFixture } from "@/fixtures/parity/gate-two-scholarly";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import {
  canonicalToTiptapDocument,
  tiptapDocumentToCanonicalPatch,
} from "../projection";

describe("Tiptap projection boundary", () => {
  it("projects canonical blocks into Tiptap JSON for editor hydration", () => {
    const projected = canonicalToTiptapDocument(restorationFoundationFixture);

    expect(projected.type).toBe("doc");
    expect(projected.content?.[0]).toMatchObject({
      type: "heading",
      attrs: { level: 1, canonicalId: "block-title" },
    });
    expect(JSON.stringify(projected)).toContain("math_inline");
    expect(JSON.stringify(projected)).toContain("data-canonical-id");
  });

  it("turns edited Tiptap JSON into a canonical patch instead of persistence state", () => {
    const projected = canonicalToTiptapDocument(restorationFoundationFixture);
    projected.content![1].content![0].text = "Let velocity ";

    const patch = tiptapDocumentToCanonicalPatch(projected);

    expect(patch.source).toBe("tiptap-adapter");
    expect(patch.blocks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "block-intro",
        children: expect.arrayContaining([expect.objectContaining({ text: "Let velocity " })]),
      }),
    ]));
  });

  it("preserves citation semantics after ProseMirror normalizes text-node attrs away", () => {
    const patch = tiptapDocumentToCanonicalPatch({
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { canonicalId: "citation-paragraph", reviewState: "needs_review" },
          content: [
            { type: "text", text: "cite " },
            { type: "text", text: "@newton1687", marks: [{ type: "code" }] },
          ],
        },
      ],
    });

    expect(patch.blocks[0]).toMatchObject({
      id: "citation-paragraph",
      type: "paragraph",
      children: [
        { type: "text", text: "cite " },
        { type: "citation", key: "newton1687" },
      ],
    });
  });

  it("round trips tracked insertions and deletions through the adapter boundary", () => {
    const projected = canonicalToTiptapDocument({
      ...restorationFoundationFixture,
      metadata: {
        ...restorationFoundationFixture.metadata,
        changeTracking: {
          currentAuthorId: "author-alex-reviewer",
          authors: [{ id: "author-alex-reviewer", name: "Alex Reviewer" }],
        },
      },
      blocks: restorationFoundationFixture.blocks.map((block) => (
        block.id === "block-intro" && block.type === "paragraph"
          ? {
              ...block,
              children: [
                { type: "text", text: "Let " },
                {
                  type: "tracked_insert",
                  id: "change-insert",
                  authorId: "author-alex-reviewer",
                  authorName: "Alex Reviewer",
                  createdAt: "2026-04-26T00:00:00.000Z",
                  text: "carefully ",
                },
                { type: "text", text: "v denote " },
                {
                  type: "tracked_delete",
                  id: "change-delete",
                  authorId: "author-alex-reviewer",
                  authorName: "Alex Reviewer",
                  createdAt: "2026-04-26T00:00:00.000Z",
                  text: "velocity",
                },
                { type: "text", text: "." },
              ],
            }
          : block
      )),
    });
    const patch = tiptapDocumentToCanonicalPatch(projected);

    expect(JSON.stringify(projected)).toContain("\"type\":\"tracked_insert\"");
    expect(JSON.stringify(projected)).toContain("\"type\":\"tracked_delete\"");
    expect(JSON.stringify(patch.blocks)).toContain("\"type\":\"tracked_insert\"");
    expect(JSON.stringify(patch.blocks)).toContain("\"type\":\"tracked_delete\"");
  });

  it("round trips Gate 1 list, table, figure, and page-break structures", () => {
    const projected = canonicalToTiptapDocument(gateOneStructureFixture);
    const patch = tiptapDocumentToCanonicalPatch(projected);

    expect(projected.content?.map((node) => node.type)).toEqual([
      "heading",
      "paragraph",
      "bulletList",
      "table",
      "blockquote",
      "horizontalRule",
      "paragraph",
    ]);
    expect(patch.blocks.map((block) => block.type)).toEqual(gateOneStructureFixture.blocks.map((block) => block.type));
    expect(JSON.stringify(patch.blocks)).toContain("Restoration checks");
    expect(JSON.stringify(patch.blocks)).toContain("fig:source-scan");
  });

  it("projects Gate 2 scholarly structures through the adapter boundary", () => {
    const projected = canonicalToTiptapDocument(gateTwoScholarlyFixture);
    const patch = tiptapDocumentToCanonicalPatch(projected);

    expect(projected.content?.map((node) => node.attrs?.canonicalBlockType ?? node.type)).toEqual([
      "heading",
      "abstract",
      "quote",
      "paragraph",
      "bibliography",
    ]);
    expect(patch.blocks.map((block) => block.type)).toEqual(gateTwoScholarlyFixture.blocks.map((block) => block.type));
    expect(JSON.stringify(projected)).toContain("(note: marginal restoration note)");
    expect(JSON.stringify(projected)).toContain("doe2026");
  });

  it("round trips Gate 3 layout metadata through the adapter boundary", () => {
    const projected = canonicalToTiptapDocument(gateThreeLayoutFixture);
    const patch = tiptapDocumentToCanonicalPatch(projected);

    expect(JSON.stringify(projected)).toContain("comment-reading");
    expect(JSON.stringify(projected)).toContain("asset-plate-a");
    expect(JSON.stringify(projected)).toContain("lower-alpha");
    expect(JSON.stringify(projected)).toContain("page_footer");
    expect(patch.blocks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "gate-three-list",
        type: "list",
        layout: expect.objectContaining({ markerStyle: "lower-alpha", indentLevel: 2 }),
      }),
      expect.objectContaining({
        id: "gate-three-figure",
        type: "figure",
        asset: expect.objectContaining({ assetId: "asset-plate-a" }),
      }),
    ]));
  });

  it("round trips Gate 4 LyX semantic insets and include placeholders through the adapter boundary", () => {
    const projected = canonicalToTiptapDocument(gateFourLyxCoreFixture);
    const patch = tiptapDocumentToCanonicalPatch(projected);

    expect(JSON.stringify(projected)).toContain("sec:lyx-core");
    expect(JSON.stringify(projected)).toContain("affiliation");
    expect(JSON.stringify(projected)).toContain("appendix-a");
    expect(JSON.stringify(projected)).toContain("textual");
    expect(patch.blocks.map((block) => block.type)).toEqual(gateFourLyxCoreFixture.blocks.map((block) => block.type));
    expect(JSON.stringify(patch.blocks)).toContain("semantic_inset");
    expect(JSON.stringify(patch.blocks)).toContain("include");
  });

  it("round trips Gate 5 LyX breadth metadata through the adapter boundary", () => {
    const projected = canonicalToTiptapDocument(gateFiveLyxBreadthFixture);
    const patch = tiptapDocumentToCanonicalPatch(projected);

    expect(JSON.stringify(projected)).toContain("front_matter");
    expect(JSON.stringify(projected)).toContain("critical-apparatus");
    expect(JSON.stringify(projected)).toContain("generated_list");
    expect(JSON.stringify(projected)).toContain("asset-embedded-evidence");
    expect(JSON.stringify(projected)).toContain("longtable");
    expect(JSON.stringify(projected)).toContain("conditional branches");
    expect(patch.blocks.map((block) => block.type)).toEqual(gateFiveLyxBreadthFixture.blocks.map((block) => block.type));
    expect(JSON.stringify(patch.blocks)).toContain("Child document expanded into master export.");
    expect(JSON.stringify(patch.blocks)).toContain("restoration");
  });
});
