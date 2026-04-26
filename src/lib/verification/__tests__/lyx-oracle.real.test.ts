import { describe, expect, it } from "vitest";
import { lyxOracleFixtures } from "@/fixtures/lyx-oracle";
import { runLyxOracleVerification } from "../lyx-oracle";

const describeRealLyx = process.env.IK_RUN_REAL_LYX_ORACLE === "1" ? describe : describe.skip;

describeRealLyx("real LyX oracle verification", () => {
  it("exports LyX fixtures and compares them with canonical serializer signatures", async () => {
    const report = await runLyxOracleVerification(lyxOracleFixtures);

    expect(report.status).toBe("passed");
    expect(report.coveredFeatureIds).toEqual(expect.arrayContaining([
      "bibliography-insert-manage",
      "branch-conditional-content",
      "caption-management",
      "cjk-and-rtl-support",
      "docclass-select",
      "doc-metadata-settings",
      "encoding-selection-validation",
      "figure-and-table-floats",
      "formal-booktabs-style",
      "graphics-insert-configure",
      "inline-and-display-math",
      "index-entry-insert",
      "latex-export",
      "longtable-mode",
      "master-document-linking",
      "multilingual-language-selection",
      "nomenclature-and-glossary",
      "sectioning-hierarchy",
      "table-cell-merge-and-span",
      "table-insert-edit",
      "titlepage-and-frontmatter",
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
