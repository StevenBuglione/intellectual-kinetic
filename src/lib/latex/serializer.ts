import type { CanonicalBlock, CanonicalDocument, CanonicalInline } from "@/lib/editor-core/types";

export type LatexDiagnostic = {
  severity: "warning" | "error";
  code: string;
  message: string;
  blockId?: string;
  sourceRegionId?: string;
};

export type LatexSerializationResult = {
  source: string;
  diagnostics: LatexDiagnostic[];
};

export function serializeCanonicalDocumentToLatex(
  document: CanonicalDocument,
): LatexSerializationResult {
  const diagnostics: LatexDiagnostic[] = [];
  const labels = new Set(
    document.blocks.flatMap((block) => ("label" in block && block.label ? [block.label] : [])),
  );

  const lines = [
    `% Generated deterministically from canonical AST ${document.id}`,
    `\\documentclass{${document.settings.documentClass}}`,
    ...document.settings.modules.map((moduleName) => `\\usepackage{${moduleName}}`),
    "\\makeatletter\\let\\ps@plain\\ps@empty\\makeatother",
    "\\pagestyle{empty}",
    "\\begin{document}",
    "\\thispagestyle{empty}",
    "",
    ...document.blocks.flatMap((block) => serializeBlock(block, labels, diagnostics)),
    "\\end{document}",
    "",
  ];

  return {
    source: lines.join("\n"),
    diagnostics,
  };
}

function serializeBlock(
  block: CanonicalBlock,
  labels: Set<string>,
  diagnostics: LatexDiagnostic[],
): string[] {
  if (block.type === "heading") {
    const command = block.level === 1 ? "chapter*" : block.level === 2 ? "section*" : "subsection*";
    return [`\\${command}{${serializeInline(block.children, block, labels, diagnostics)}}`, ""];
  }

  if (block.type === "paragraph") {
    return [serializeInline(block.children, block, labels, diagnostics), ""];
  }

  if (block.type === "theorem") {
    const label = block.label ? `\\label{${escapeLatex(block.label)}}` : "";
    return [
      `\\begin{quote}${label}`,
      serializeInline(block.children, block, labels, diagnostics),
      "\\end{quote}",
      "",
    ];
  }

  const label = block.label ? `\\label{${escapeLatex(block.label)}}` : "";
  return [label, `\\[${block.tex}\\]`, ""];
}

function serializeInline(
  children: CanonicalInline[],
  block: CanonicalBlock,
  labels: Set<string>,
  diagnostics: LatexDiagnostic[],
): string {
  return children
    .map((child) => {
      if (child.type === "text") {
        return escapeLatex(child.text);
      }

      if (child.type === "math_inline") {
        return `\\(${child.tex}\\)`;
      }

      if (child.type === "citation") {
        return `\\texttt{@${escapeLatex(child.key)}}`;
      }

      if (!labels.has(child.target)) {
        diagnostics.push({
          severity: "warning",
          code: "unresolved-reference",
          message: `Reference target ${child.target} is not defined in the canonical AST.`,
          blockId: block.id,
          sourceRegionId: block.provenance?.sourceRegionId,
        });
      }

      return `\\texttt{[[${escapeLatex(child.target)}]]}`;
    })
    .join("");
}

function escapeLatex(value: string): string {
  return value
    .replaceAll("\\", "\\textbackslash{}")
    .replaceAll("&", "\\&")
    .replaceAll("%", "\\%")
    .replaceAll("$", "\\$")
    .replaceAll("#", "\\#")
    .replaceAll("_", "\\_")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}");
}
