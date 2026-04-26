import { describe, expect, it } from "vitest";
import { lyxOracleFixtures } from "@/fixtures/lyx-oracle";
import { runLyxOracleVerification } from "../lyx-oracle";

const describeRealLyx = process.env.IK_RUN_REAL_LYX_ORACLE === "1" ? describe : describe.skip;

describeRealLyx("real LyX oracle verification", () => {
  it("exports LyX fixtures and compares them with canonical serializer signatures", async () => {
    const report = await runLyxOracleVerification(lyxOracleFixtures);

    expect(report.status).toBe("passed");
    expect(report.coveredFeatureIds).toEqual(expect.arrayContaining([
      "docclass-select",
      "doc-metadata-settings",
      "inline-and-display-math",
      "latex-export",
      "sectioning-hierarchy",
    ]));
    expect(report.fixtures).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "lyx-restoration-foundation",
        checks: expect.arrayContaining([
          "lyx-export",
          "canonical-latex-serialization",
          "lyx-source-signatures",
          "canonical-source-signatures",
          "shared-text-signatures",
          "lyx-feature-coverage",
        ]),
        errors: [],
      }),
      expect.objectContaining({
        id: "lyx-upstream-vcs-info-export",
        checks: expect.arrayContaining([
          "lyx-export",
          "upstream-reference-tex-signatures",
          "shared-text-signatures",
          "lyx-feature-coverage",
        ]),
        errors: [],
      }),
    ]));
  }, 120_000);
});
