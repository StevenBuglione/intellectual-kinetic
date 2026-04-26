import { describe, expect, it } from "vitest";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { runLyxOracleVerification, type LyxOracleFixture } from "../lyx-oracle";

const fakeFixture: LyxOracleFixture = {
  id: "fake-lyx-restoration",
  kind: "canonical-comparison",
  lyxPath: "fake.lyx",
  canonicalDocument: restorationFoundationFixture,
  expectedText: [
    "A Treatise on Motion",
    "Let v denote velocity",
    "s = vt",
  ],
  lyxRequiredSource: [
    "\\section{A Treatise on Motion}",
    "\\[",
    "s = vt",
  ],
  canonicalRequiredSource: [
    "\\IkHeadingOne{A Treatise on Motion}",
    "s = vt",
  ],
  featureIds: ["sectioning-hierarchy", "inline-and-display-math", "latex-export"],
};

describe("LyX oracle verification", () => {
  it("compares canonical serializer output against LyX-exported LaTeX signatures", async () => {
    const report = await runLyxOracleVerification([fakeFixture], {
      exportLyxToLatex: async () => ({
        source: [
          "\\documentclass{article}",
          "\\begin{document}",
          "\\section{A Treatise on Motion}",
          "Let $v$ denote velocity.",
          "\\[",
          "s = vt",
          "\\]",
          "\\end{document}",
        ].join("\n"),
        log: "fake lyx export",
      }),
    });

    expect(report.status).toBe("passed");
    expect(report.fixtures).toEqual([
      expect.objectContaining({
        id: "fake-lyx-restoration",
        checks: expect.arrayContaining([
          "lyx-export",
          "canonical-latex-serialization",
          "lyx-source-signatures",
          "canonical-source-signatures",
          "shared-text-signatures",
          "lyx-feature-coverage",
        ]),
        featureIds: ["sectioning-hierarchy", "inline-and-display-math", "latex-export"],
        errors: [],
      }),
    ]);
  });
});
