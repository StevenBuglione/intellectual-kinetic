import { describe, expect, it } from "vitest";
import { gateThreeLayoutFixture } from "@/fixtures/parity/gate-three-layout";
import { mergeCanonicalPatchBlocks } from "../patch-merge";

describe("canonical patch merge", () => {
  it("updates patched blocks while preserving complex blocks omitted by the UI adapter", () => {
    const heading = gateThreeLayoutFixture.blocks[0];
    const afterBreak = gateThreeLayoutFixture.blocks.at(-1);

    if (heading?.type !== "heading" || afterBreak?.type !== "paragraph") {
      throw new Error("Unexpected fixture shape.");
    }

    const merged = mergeCanonicalPatchBlocks(gateThreeLayoutFixture.blocks, [
      {
        ...heading,
        children: [{ type: "text", text: "Layout Stress Coverage verified" }],
      },
      afterBreak,
    ]);

    expect(merged.map((block) => block.type)).toEqual(gateThreeLayoutFixture.blocks.map((block) => block.type));
    expect(merged[0]).toMatchObject({
      type: "heading",
      children: [{ type: "text", text: "Layout Stress Coverage verified" }],
    });
    expect(merged.some((block) => block.id === "gate-three-page-break" && block.type === "page_break")).toBe(true);
    expect(merged.some((block) => block.id === "gate-three-table" && block.type === "table")).toBe(true);
  });
});
