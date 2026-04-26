import { describe, expect, it } from "vitest";
import { gateOneStructureFixture } from "@/fixtures/parity/gate-one-structure";
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
});
