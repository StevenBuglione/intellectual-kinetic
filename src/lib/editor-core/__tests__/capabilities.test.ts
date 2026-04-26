import { describe, expect, it } from "vitest";
import {
  getCapability,
  parityCapabilityRegistry,
  verifiedParityCapabilityIds,
} from "../capabilities";

describe("parity capability registry", () => {
  it("tracks Gate 1 verified document families separately from future work", () => {
    expect(verifiedParityCapabilityIds()).toEqual(expect.arrayContaining([
      "sectioning-hierarchy",
      "inline-and-display-math",
      "theorem-like-environments",
      "list-structures",
      "table-insert-edit",
      "figure-caption-placeholders",
      "cross-reference-insert",
      "page-breaks-and-flow-breaks",
    ]));

    expect(getCapability("bibliography-insert-manage")).toMatchObject({
      status: "partial",
      gate: "future",
    });
    expect(getCapability("cjk-and-rtl-support")).toMatchObject({
      status: "unsupported",
      gate: "future",
    });
  });

  it("requires every verified capability to name a release-blocking fixture family", () => {
    const verified = parityCapabilityRegistry.filter((capability) => capability.status === "verified");

    expect(verified.length).toBeGreaterThan(0);
    expect(verified.every((capability) => capability.fixtureFamilies.length > 0)).toBe(true);
  });
});
