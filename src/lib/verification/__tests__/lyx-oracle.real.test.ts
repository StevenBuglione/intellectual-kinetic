import { describe, expect, it } from "vitest";
import { lyxOracleFixtures } from "@/fixtures/lyx-oracle";
import { runLyxOracleVerification } from "../lyx-oracle";

const describeRealLyx = process.env.IK_RUN_REAL_LYX_ORACLE === "1" ? describe : describe.skip;

describeRealLyx("real LyX oracle verification", () => {
  it("exports LyX fixtures and compares them with canonical serializer signatures", async () => {
    const report = await runLyxOracleVerification(lyxOracleFixtures);
    const failedFixtures = report.fixtures.filter((fixture) => fixture.errors.length > 0);

    expect(failedFixtures, JSON.stringify(failedFixtures, null, 2)).toEqual([]);
    expect(report.status).toBe("passed");
    expect(report.coveredFeatureIds).toEqual(expect.arrayContaining([
      "bibliography-insert-manage",
      "branch-conditional-content",
      "caption-management",
      "change-tracking",
      "cjk-and-rtl-support",
      "cross-reference-insert",
      "custom-preamble-edit",
      "custom-semantic-insets",
      "docclass-select",
      "doc-metadata-settings",
      "encoding-selection-validation",
      "equation-numbering-and-labels",
      "export-robustness-and-recovery",
      "figure-and-table-floats",
      "font-family-size-selection",
      "formal-booktabs-style",
      "graphics-insert-configure",
      "headers-footers-page-style",
      "inline-and-display-math",
      "inline-emphasis-styles",
      "index-entry-insert",
      "label-insert",
      "latex-export",
      "longtable-mode",
      "master-document-linking",
      "math-macros-and-decorations",
      "math-structures-matrices-alignment",
      "module-enable-disable",
      "multicolumn-and-landscape-modes",
      "multilingual-captions-and-local-overrides",
      "multilingual-language-selection",
      "nomenclature-and-glossary",
      "page-breaks-and-flow-breaks",
      "quotation-verse-blocks",
      "sectioning-hierarchy",
      "spacing-margins-layout-options",
      "table-cell-merge-and-span",
      "table-insert-edit",
      "table-of-contents-and-lists",
      "template-selection",
      "text-color-and-highlighting",
      "titlepage-and-frontmatter",
      "wrap-margin-floats",
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
      expect.objectContaining({
        id: "lyx-current-upstream-complicated-table",
        checks: expect.arrayContaining([
          "lyx-export",
          "lyx-source-signatures",
          "shared-text-signatures",
          "lyx-feature-coverage",
        ]),
        errors: [],
      }),
      expect.objectContaining({
        id: "lyx-oracle-parity-coverage-breadth",
        checks: expect.arrayContaining([
          "lyx-export",
          "lyx-source-signatures",
          "shared-text-signatures",
          "lyx-feature-coverage",
        ]),
        errors: [],
      }),
    ]));
  }, 120_000);
});
