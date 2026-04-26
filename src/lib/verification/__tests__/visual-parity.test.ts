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
      expect(fixture.metrics.editorWidth).toBe(816);
      expect(fixture.metrics.editorHeight).toBe(1056);
      expect(fixture.metrics.pdfWidth).toBe(816);
      expect(fixture.metrics.pdfHeight).toBe(1056);
    }
  }, 90_000);
});
