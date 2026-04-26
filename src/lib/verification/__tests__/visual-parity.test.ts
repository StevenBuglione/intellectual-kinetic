import { describe, expect, it } from "vitest";
import { gateFiveLyxBreadthFixture } from "@/fixtures/parity/gate-five-lyx-breadth";
import { gateFourLyxCoreFixture } from "@/fixtures/parity/gate-four-lyx-core";
import { gateOneStructureFixture } from "@/fixtures/parity/gate-one-structure";
import { gateThreeLayoutFixture } from "@/fixtures/parity/gate-three-layout";
import { gateTwoScholarlyFixture } from "@/fixtures/parity/gate-two-scholarly";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { runVisualParityVerification } from "../visual-parity";

describe("visual editor to PDF parity verification", () => {
  it("compares browser-rendered TextView pages with compiled PDF page images", async () => {
    const report = await runVisualParityVerification([
      restorationFoundationFixture,
      gateOneStructureFixture,
      gateTwoScholarlyFixture,
      gateThreeLayoutFixture,
      gateFourLyxCoreFixture,
      gateFiveLyxBreadthFixture,
    ]);

    expect(report.status).toBe("passed");
    expect(report.fixtures).toHaveLength(6);

    for (const fixture of report.fixtures) {
      expect(fixture.checks).toEqual(
        expect.arrayContaining([
          "editor-browser-render",
          "pdf-page-render",
          "editor-pdf-visual-diff",
          "editor-pdf-rmse-diff",
        ]),
      );
      expect(fixture.metrics.differentPixels).toBeLessThanOrEqual(
        fixture.thresholds.maxDifferentPixels,
      );
      expect(fixture.metrics.normalizedDifference).toBeLessThanOrEqual(
        fixture.thresholds.maxNormalizedDifference,
      );
      expect(fixture.metrics.rootMeanSquareDifference).toBeLessThanOrEqual(
        fixture.thresholds.maxRootMeanSquareDifference,
      );
      expect(fixture.thresholds.targetDifferentPixels).toBe(0);
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

    const layoutFixture = report.fixtures.find((fixture) => fixture.id === "fixture-gate-three-layout");
    expect(layoutFixture?.checks).toContain("editor-pdf-page-sequence");
    expect(layoutFixture?.metrics.pageCount).toBe(2);
    expect(layoutFixture?.thresholds.targetDifferentPixels).toBe(0);

    const lyxFixture = report.fixtures.find((fixture) => fixture.id === "fixture-gate-four-lyx-core");
    expect(lyxFixture?.checks).toContain("editor-pdf-page-sequence");
    expect(lyxFixture?.metrics.pageCount).toBe(1);
    expect(lyxFixture?.thresholds.targetDifferentPixels).toBe(0);

    const breadthFixture = report.fixtures.find((fixture) => fixture.id === "fixture-gate-five-lyx-breadth");
    expect(breadthFixture?.checks).toContain("editor-pdf-page-sequence");
    expect(breadthFixture?.metrics.pageCount).toBe(1);
    expect(breadthFixture?.thresholds.targetDifferentPixels).toBe(0);
  }, 90_000);
});
