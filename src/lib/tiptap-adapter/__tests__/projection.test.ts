import { describe, expect, it } from "vitest";
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
});
