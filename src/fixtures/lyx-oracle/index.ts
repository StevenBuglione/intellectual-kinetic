import path from "node:path";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import type { LyxOracleFixture } from "@/lib/verification/lyx-oracle";

const repoRoot = process.cwd();

export const lyxOracleFixtures: LyxOracleFixture[] = [
  {
    id: "lyx-restoration-foundation",
    kind: "canonical-comparison",
    lyxPath: path.join(repoRoot, "src/fixtures/lyx-oracle/restoration-foundation.lyx"),
    canonicalDocument: restorationFoundationFixture,
    expectedText: [
      "A Treatise on Motion",
      "Let v denote velocity",
      "Uniform motion preserves proportional distance",
      "s = vt",
    ],
    lyxRequiredSource: [
      "\\section{A Treatise on Motion}",
      "$v$",
      "\\[",
      "s=vt",
    ],
    canonicalRequiredSource: [
      "\\IkHeadingOne{A Treatise on Motion}",
      "\\(v\\)",
      "Uniform motion preserves proportional distance",
      "s = vt",
    ],
    featureIds: [
      "docclass-select",
      "sectioning-hierarchy",
      "inline-and-display-math",
      "theorem-like-environments",
      "latex-export",
    ],
  },
  {
    id: "lyx-upstream-vcs-info-export",
    kind: "lyx-export-regression",
    lyxPath: path.join(repoRoot, ".ref/lyx/autotests/checklatexexports/vcs_info_export.lyx"),
    referenceTexPath: path.join(repoRoot, ".ref/lyx/autotests/checklatexexports/vcs_info_export.tex"),
    expectedText: [
      "file: vcs\\_info\\_export.lyx",
      "class: article",
      "No version control",
    ],
    lyxRequiredSource: [
      "\\documentclass[english]{article}",
      "\\usepackage{babel}",
      "file: vcs\\_info\\_export.lyx",
    ],
    featureIds: [
      "doc-metadata-settings",
      "latex-export",
      "templates-layouts",
    ],
  },
];
