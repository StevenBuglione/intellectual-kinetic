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
  {
    id: "lyx-upstream-formal-booktabs-table",
    kind: "lyx-export-regression",
    lyxPath: path.join(repoRoot, ".ref/lyx/lib/tabletemplates/Formal_with_Footline.lyx"),
    expectedText: [],
    lyxRequiredSource: [
      "\\begin{tabular}{c}",
      "\\toprule",
      "\\midrule",
      "\\bottomrule",
    ],
    featureIds: [
      "table-insert-edit",
      "formal-booktabs-style",
      "latex-export",
    ],
  },
  {
    id: "lyx-upstream-figure-caption-cprotect",
    kind: "lyx-export-regression",
    lyxPath: path.join(repoRoot, ".ref/lyx/autotests/export/latex/lyxbugs-resolved/cprotect/9313-comment-in-figure-float-caption.lyx"),
    expectedText: [
      "This is a comment within a figure float caption",
    ],
    lyxRequiredSource: [
      "\\begin{figure}",
      "\\caption{%",
      "This is a comment within a figure float caption",
    ],
    featureIds: [
      "figure-and-table-floats",
      "caption-management",
      "latex-export",
    ],
  },
  {
    id: "lyx-upstream-language-index",
    kind: "lyx-export-regression",
    lyxPath: path.join(repoRoot, ".ref/lyx/autotests/export/WrongDfnTagHandling.lyx"),
    expectedText: [
      "Wrong handling of",
    ],
    lyxRequiredSource: [
      "\\selectlanguage{british}",
      "\\selectlanguage{spanish}",
      "\\index{",
      "\\printindex",
    ],
    featureIds: [
      "multilingual-language-selection",
      "encoding-selection-validation",
      "index-entry-insert",
      "titlepage-and-frontmatter",
      "latex-export",
    ],
  },
  {
    id: "lyx-upstream-multilingual-encoding",
    kind: "lyx-export-regression",
    lyxPath: path.join(repoRoot, ".ref/lyx/autotests/export/latex/textcyr-textgreek-test.lyx"),
    expectedText: [
      "Language change",
    ],
    lyxRequiredSource: [
      "\\usepackage[iso-8859-7,koi8-r,latin9]{inputenc}",
      "\\textgreek",
      "\\textcyr",
      "\\foreignlanguage{greek}",
    ],
    featureIds: [
      "multilingual-language-selection",
      "encoding-selection-validation",
      "latex-export",
    ],
  },
  {
    id: "lyx-oracle-export-breadth",
    kind: "lyx-export-regression",
    lyxPath: path.join(repoRoot, "src/fixtures/lyx-oracle/export-breadth-ert.lyx"),
    expectedText: [
      "Oracle figure caption",
      "Oracle bibliography item",
      "RTL oracle text",
    ],
    lyxRequiredSource: [
      "\\begin{longtable}{ll}",
      "\\includegraphics[width=0.25\\linewidth]{oracle-image.png}",
      "\\caption{Oracle figure caption}",
      "\\begin{thebibliography}{1}",
      "\\bibitem{oracle-key}",
      "\\nomenclature{$v$}{velocity}",
      "\\printnomenclature",
      "\\begin{CJK}{UTF8}{min}",
      "\\beginR RTL oracle text\\endR",
    ],
    featureIds: [
      "longtable-mode",
      "table-cell-merge-and-span",
      "graphics-insert-configure",
      "figure-and-table-floats",
      "caption-management",
      "bibliography-insert-manage",
      "citation-insert-style-variants",
      "bibliography-output-control",
      "nomenclature-and-glossary",
      "cjk-and-rtl-support",
      "latex-export",
    ],
  },
  {
    id: "lyx-oracle-master-child-branch",
    kind: "lyx-export-regression",
    lyxPath: path.join(repoRoot, "src/fixtures/lyx-oracle/master-child.lyx"),
    expectedText: [
      "Oracle Master Book",
      "Critical branch included",
    ],
    lyxRequiredSource: [
      "\\title{Oracle Master Book}",
      "\\author{Restoration Team}",
      "\\chapter{Oracle Front Matter}",
      "Critical branch included.",
      "\\input{master-child-child.tex}",
    ],
    featureIds: [
      "titlepage-and-frontmatter",
      "branch-conditional-content",
      "master-document-linking",
      "doc-metadata-settings",
      "latex-export",
    ],
  },
];
