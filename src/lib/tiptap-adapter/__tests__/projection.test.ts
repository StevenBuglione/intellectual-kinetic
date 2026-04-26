import { describe, expect, it } from "vitest";
import { gateOneStructureFixture } from "@/fixtures/parity/gate-one-structure";
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
});
