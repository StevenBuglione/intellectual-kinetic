import { describe, expect, it } from "vitest";
import { gateFiveLyxBreadthFixture } from "@/fixtures/parity/gate-five-lyx-breadth";
import { gateFourLyxCoreFixture } from "@/fixtures/parity/gate-four-lyx-core";
import { gateOneStructureFixture } from "@/fixtures/parity/gate-one-structure";
import { gateThreeLayoutFixture } from "@/fixtures/parity/gate-three-layout";
import { gateTwoScholarlyFixture } from "@/fixtures/parity/gate-two-scholarly";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { serializeCanonicalDocumentToLatex } from "../serializer";

describe("deterministic LaTeX serializer", () => {
  it("serializes the canonical AST fixture into stable LaTeX", () => {
    const result = serializeCanonicalDocumentToLatex(restorationFoundationFixture);

    expect(result.diagnostics).toEqual([]);
    expect(result.source).toContain("\\documentclass{book}");
    expect(result.source).toContain("\\usepackage{amsmath}");
    expect(result.source).toContain("\\usepackage[margin=1in]{geometry}");
    expect(result.source).toContain("\\usepackage{array}");
    expect(result.source).toContain("\\renewcommand{\\familydefault}{\\sfdefault}");
    expect(result.source).toContain("\\IkHeadingOne{A Treatise on Motion}");
    expect(result.source).toContain("Let \\(v\\) denote velocity and cite \\texttt{@newton1687}.");
    expect(result.source).toContain("\\IkTheoremBlock{\\label{thm:motion}Uniform motion preserves proportional distance.}");
    expect(result.source).toContain("\\label{eq:distance}\n\\[s = vt\\]");
    expect(result.source).toContain("s = vt");
  });

  it("reports diagnostics with block/source linkage for unresolved references", () => {
    const result = serializeCanonicalDocumentToLatex({
      ...restorationFoundationFixture,
      blocks: [
        ...restorationFoundationFixture.blocks,
        {
          id: "block-ref",
          type: "paragraph",
          children: [{ type: "reference", target: "missing:label" }],
          reviewState: "needs_review",
        },
      ],
    });

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: "warning",
        blockId: "block-ref",
        code: "unresolved-reference",
      }),
    ]);
  });

  it("serializes author-attributed tracked changes into review-aware LaTeX", () => {
    const result = serializeCanonicalDocumentToLatex({
      ...restorationFoundationFixture,
      metadata: {
        ...restorationFoundationFixture.metadata,
        changeTracking: {
          currentAuthorId: "author-alex-reviewer",
          authors: [{ id: "author-alex-reviewer", name: "Alex Reviewer" }],
        },
      },
      blocks: restorationFoundationFixture.blocks.map((block) => (
        block.id === "block-intro" && block.type === "paragraph"
          ? {
              ...block,
              children: [
                { type: "text", text: "Let " },
                {
                  type: "tracked_insert",
                  id: "change-insert",
                  authorId: "author-alex-reviewer",
                  authorName: "Alex Reviewer",
                  createdAt: "2026-04-26T00:00:00.000Z",
                  text: "carefully ",
                },
                { type: "math_inline", tex: "v" },
                { type: "text", text: " denote " },
                {
                  type: "tracked_delete",
                  id: "change-delete",
                  authorId: "author-alex-reviewer",
                  authorName: "Alex Reviewer",
                  createdAt: "2026-04-26T00:00:00.000Z",
                  text: "velocity",
                },
                { type: "text", text: " and cite " },
                { type: "citation", key: "newton1687" },
                { type: "text", text: "." },
              ],
            }
          : block
      )),
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.source).toContain("\\usepackage[normalem]{ulem}");
    expect(result.source).toContain("\\IkTrackedInsert{Alex Reviewer}{carefully }");
    expect(result.source).toContain("\\IkTrackedDelete{Alex Reviewer}{velocity}");
  });

  it("serializes presentation-oriented document classes through the LaTeX documentclass surface", () => {
    const result = serializeCanonicalDocumentToLatex({
      ...restorationFoundationFixture,
      settings: {
        ...restorationFoundationFixture.settings,
        documentClass: "beamer",
        template: "presentation-default",
        templateFamily: "Presentations",
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.source).toContain("\\documentclass{beamer}");
    expect(result.source).toContain("\\setbeamertemplate{navigation symbols}{}");
    expect(result.source).toContain("\\usetheme{Madrid}");
    expect(result.source).toContain("\\title{Restoration Foundation Fixture}");
    expect(result.source).toContain("\\titlepage");
    expect(result.source).toContain("\\begin{frame}[fragile,allowframebreaks]{Restoration Foundation Fixture}");
    expect(result.source).toContain("\\centering");
    expect(result.source).not.toContain("\\usepackage[margin=1in]{geometry}");
  });

  it("serializes extended LyX classes with their declared LaTeX class and required packages", () => {
    const result = serializeCanonicalDocumentToLatex({
      ...restorationFoundationFixture,
      settings: {
        ...restorationFoundationFixture.settings,
        documentClass: "article-beamer",
        template: "lyx-article-beamer",
        templateFamily: "Articles",
      },
    });

    expect(result.source).toContain("\\documentclass{article}");
    expect(result.source).toContain("\\usepackage{beamerarticle}");
    expect(result.source).toContain("\\usepackage{pgf}");
  });

  it("emits supported LyX modules as package-driven preamble and body changes", () => {
    const result = serializeCanonicalDocumentToLatex({
      ...restorationFoundationFixture,
      settings: {
        ...restorationFoundationFixture.settings,
        enabledModules: ["customHeadersFooters", "multicol"],
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.source).toContain("\\usepackage{fancyhdr}");
    expect(result.source).toContain("\\usepackage{multicol}");
    expect(result.source).toContain("% IK enabled module: Custom Header/Footer Text");
    expect(result.source).toContain("% IK enabled module: Multiple Columns");
    expect(result.source).toContain("\\pagestyle{fancy}");
    expect(result.source).toContain("\\fancyhead[L]{Restoration Foundation Fixture}");
    expect(result.source).toContain("\\begin{multicols}{2}");
    expect(result.source).toContain("\\end{multicols}");
    expect(result.source).not.toContain("\\pagestyle{empty}");
    expect(result.source).not.toContain("\\thispagestyle{empty}");
  });

  it("emits a diagnostic for DocBook/XML-oriented LyX classes", () => {
    const result = serializeCanonicalDocumentToLatex({
      ...restorationFoundationFixture,
      settings: {
        ...restorationFoundationFixture.settings,
        documentClass: "docbook",
        template: "lyx-docbook",
        templateFamily: "Articles",
      },
    });

    expect(result.source).toContain("\\documentclass{docbook}");
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "docbook-preview-latex-compatibility",
        severity: "warning",
      }),
    ]));
  });

  it("serializes Gate 1 structures into deterministic LaTeX", () => {
    const result = serializeCanonicalDocumentToLatex(gateOneStructureFixture);

    expect(result.diagnostics).toEqual([]);
    expect(result.source).toContain("\\begin{itemize}");
    expect(result.source).toContain("\\item Recover list semantics");
    expect(result.source).toContain("\\textbf{Restoration checks}\\label{tab:checks}");
    expect(result.source).toContain("\\IkTableCell{3.00in}{\\textbf{Check}}\\IkTableCell{3.00in}{\\textbf{Status}}");
    expect(result.source).toContain("\\IkTableCell{3.00in}{PDF image}\\IkTableCell{3.00in}{Verified}");
    expect(result.source).toContain("\\IkFigurePlaceholder{Source scan placeholder}{Source scan placeholder\\label{fig:source-scan}}");
    expect(result.source).toContain("\\newpage");
  });

  it("serializes Gate 2 scholarly structures into deterministic LaTeX", () => {
    const result = serializeCanonicalDocumentToLatex(gateTwoScholarlyFixture);

    expect(result.diagnostics).toEqual([]);
    expect(result.source).toContain("\\textbf{Abstract}");
    expect(result.source).toContain("\\texttt{(note: marginal restoration note)}");
    expect(result.source).toContain("Ars longa, vita brevis, tempus fugit.");
    expect(result.source).toContain("The edited apparatus cites \\texttt{@doe2026} for traceability.");
    expect(result.source).toContain("\\textbf{References}");
    expect(result.source).toContain("doe2026 Doe, Jane. Restoration Methods. 2026.");
  });

  it("serializes Gate 3 layout, comments, placed notes, and asset figures", () => {
    const result = serializeCanonicalDocumentToLatex(gateThreeLayoutFixture);

    expect(result.diagnostics).toEqual([]);
    expect(result.source).toContain("\\IkComment{Editor}{open}{variant alpha}{Confirm against source page margin.}");
    expect(result.source).toContain("\\IkPlacedFootnote{Placed footnote evidence.}");
    expect(result.source).toContain("\\begin{enumerate}[label=\\alph*.]");
    expect(result.source).toContain("\\setlength{\\leftskip}{0.50in}");
    expect(result.source).toContain("\\IkTableCell{1.50in}{\\raggedright \\textbf{Region}}");
    expect(result.source).toContain("\\IkTableCell{2.70in}{\\centering \\textbf{Observation}}");
    expect(result.source).toContain("\\IkAssetFigurePlaceholder{0.62\\linewidth}{1.38in}{Plate A restored source crop}{Asset-backed plate placeholder\\label{fig:plate-a}}");
  });

  it("serializes Gate 4 LyX settings, labels, citation variants, includes, and semantic insets", () => {
    const result = serializeCanonicalDocumentToLatex(gateFourLyxCoreFixture);

    expect(result.diagnostics).toEqual([]);
    expect(result.source).toContain("% IK custom preamble: preamble-microtype");
    expect(result.source).toContain("\\usepackage{microtype}");
    expect(result.source).toContain("% IK bibliography engine: biblatex");
    expect(result.source).toContain("\\IkLabel{sec:lyx-core}");
    expect(result.source).toContain("\\IkSemanticInset{affiliation}{Institute for Deterministic Restoration}");
    expect(result.source).toContain("\\IkCitationVariant{textual}{lyx2026}");
    expect(result.source).toContain("\\IkCitationVariant{year}{knuth1984}");
    expect(result.source).toContain("\\IkIncludePlaceholder{child_document}{appendix-a}{Appendix A}");
  });

  it("serializes Gate 5 LyX breadth features into deterministic LaTeX", () => {
    const result = serializeCanonicalDocumentToLatex(gateFiveLyxBreadthFixture);

    expect(result.diagnostics).toEqual([]);
    expect(result.source).toContain("% IK language package: babel");
    expect(result.source).toContain("% IK secondary languages: he, ja");
    expect(result.source).toContain("\\IkFrontMatter{title}{Restored Universal Fixture}");
    expect(result.source).toContain("\\IkBranchBegin{Critical apparatus}");
    expect(result.source).toContain("Branch content exports into PDF.");
    expect(result.source).toContain("\\IkIndexEntry{conditional branches}{branches}");
    expect(result.source).toContain("\\IkGlossaryEntry{restoration}{semantic reconstruction from source evidence}");
    expect(result.source).toContain("\\IkNomenclatureEntry{k}{kinetic invariant}");
    expect(result.source).toContain("% IK table mode: longtable");
    expect(result.source).toContain("% IK table booktabs: true");
    expect(result.source).toContain("\\IkAssetImage{0.36\\linewidth}{0.75in}{asset-embedded-evidence.png}{Embedded asset crop\\label{fig:embedded-evidence}}");
    expect(result.source).toContain("\\IkIncludedChildBegin{Appendix B}");
    expect(result.source).toContain("Child document expanded into master export.");
    expect(result.source).toContain("\\IkGeneratedList{Index}{conditional branches Breadth Coverage}");
    expect(result.source).toContain("\\IkGeneratedList{Glossary}{restoration semantic reconstruction from source evidence}");
    expect(result.source).toContain("\\IkGeneratedList{Nomenclature}{k kinetic invariant}");
  });
});
