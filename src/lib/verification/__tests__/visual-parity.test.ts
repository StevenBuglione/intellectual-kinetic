import { describe, expect, it } from "vitest";
import { gateOneStructureFixture } from "@/fixtures/parity/gate-one-structure";
import { gateTwoScholarlyFixture } from "@/fixtures/parity/gate-two-scholarly";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { runVisualParityVerification } from "../visual-parity";

describe("visual editor to PDF parity verification", () => {
  it("compares browser-rendered TextView pages with compiled PDF page images", async () => {
    const report = await runVisualParityVerification([
      restorationFoundationFixture,
      gateOneStructureFixture,
      gateTwoScholarlyFixture,
    ]);

    expect(report.status).toBe("passed");
    expect(report.fixtures).toHaveLength(3);

    for (const fixture of report.fixtures) {
      expect(fixture.checks).toEqual(
        expect.arrayContaining([
          "editor-browser-render",
          "pdf-page-render",
          "editor-pdf-visual-diff",
        ]),
      );
      expect(fixture.metrics.differentPixels).toBeLessThanOrEqual(
        fixture.thresholds.maxDifferentPixels,
      );
      expect(fixture.metrics.normalizedDifference).toBeLessThanOrEqual(
        fixture.thresholds.maxNormalizedDifference,
      );
      expect(fixture.thresholds.targetDifferentPixels).toBe(0);
      expect(fixture.thresholds.maxDifferentPixels).toBeLessThanOrEqual(107_381);
      expect(fixture.metrics.editorWidth).toBe(816);
      expect(fixture.metrics.editorHeight).toBe(1056);
      expect(fixture.metrics.pdfWidth).toBe(816);
      expect(fixture.metrics.pdfHeight).toBe(1056);
    }

    const structureFixture = report.fixtures.find((fixture) => fixture.id === "fixture-gate-one-structure");
    expect(structureFixture?.checks).toContain("editor-pdf-page-sequence");
    expect(structureFixture?.metrics.pageCount).toBe(2);
    expect(structureFixture?.metrics.pages).toEqual([
      expect.objectContaining({
        pageNumber: 1,
        editorWidth: 816,
        editorHeight: 1056,
        pdfWidth: 816,
        pdfHeight: 1056,
      }),
      expect.objectContaining({
        pageNumber: 2,
        editorWidth: 816,
        editorHeight: 1056,
        pdfWidth: 816,
        pdfHeight: 1056,
      }),
    ]);
  }, 90_000);
});
