import { describe, expect, it } from "vitest";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { serializeCanonicalDocumentToLatex } from "../serializer";

describe("deterministic LaTeX serializer", () => {
  it("serializes the canonical AST fixture into stable LaTeX", () => {
    const result = serializeCanonicalDocumentToLatex(restorationFoundationFixture);

    expect(result.diagnostics).toEqual([]);
    expect(result.source).toContain("\\documentclass{book}");
    expect(result.source).toContain("\\usepackage{amsmath}");
    expect(result.source).toContain("\\chapter*{A Treatise on Motion}");
    expect(result.source).toContain("Let \\(v\\) denote velocity and cite \\texttt{@newton1687}.");
    expect(result.source).toContain("\\begin{quote}\\label{thm:motion}");
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
});
