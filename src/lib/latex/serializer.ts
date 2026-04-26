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
    "\\usepackage[margin=1in]{geometry}",
    "\\usepackage[scaled]{helvet}",
    "\\usepackage{xcolor}",
    "\\renewcommand{\\familydefault}{\\sfdefault}",
    "\\setlength{\\parindent}{0pt}",
    "\\setlength{\\parskip}{0.75em}",
    "\\newcommand{\\IkHeadingOne}[1]{{\\fontsize{21pt}{26pt}\\selectfont\\bfseries #1}\\par\\vspace{0.35em}}",
    "\\newcommand{\\IkHeadingTwo}[1]{{\\fontsize{17pt}{22pt}\\selectfont\\bfseries #1}\\par\\vspace{0.3em}}",
    "\\newcommand{\\IkHeadingThree}[1]{{\\fontsize{14pt}{18pt}\\selectfont\\bfseries #1}\\par\\vspace{0.25em}}",
    "\\newcommand{\\IkTheoremBlock}[1]{\\par\\vspace{0.6em}\\noindent\\hspace{0.25in}\\begin{minipage}{0.86\\linewidth}#1\\end{minipage}\\par\\vspace{0.6em}}",
    "\\newcommand{\\IkFigurePlaceholder}[2]{\\par\\vspace{0.8em}\\begin{center}\\fbox{\\begin{minipage}{0.68\\linewidth}\\centering #1\\end{minipage}}\\\\[0.35em]#2\\end{center}\\vspace{0.4em}}",
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
    const command = block.level === 1 ? "IkHeadingOne" : block.level === 2 ? "IkHeadingTwo" : "IkHeadingThree";
    return [`\\${command}{${serializeInline(block.children, block, labels, diagnostics)}}`, ""];
  }

  if (block.type === "paragraph") {
    return [serializeInline(block.children, block, labels, diagnostics), ""];
  }

  if (block.type === "theorem") {
    const label = block.label ? `\\label{${escapeLatex(block.label)}}` : "";
    return [`\\IkTheoremBlock{${label}${serializeInline(block.children, block, labels, diagnostics)}}`, ""];
  }

  if (block.type === "math_display") {
    const label = block.label ? `\\label{${escapeLatex(block.label)}}` : "";
    return [label, `\\[${block.tex}\\]`, ""];
  }

  if (block.type === "list") {
    return [
      ...block.items.map((item, index) => {
        const marker = block.ordered ? `${index + 1}.` : "\\textbullet{}";
        return `${marker} ${serializeInline(item.children, block, labels, diagnostics)}\\\\`;
      }),
      "",
    ];
  }

  if (block.type === "table") {
    const caption = block.caption ? serializeInline(block.caption, block, labels, diagnostics) : "";
    const label = block.label ? `\\label{${escapeLatex(block.label)}}` : "";
    const rows = block.rows.map((row) => (
      `${row.cells.map((cell) => serializeInline(cell.children, block, labels, diagnostics)).join(" \\hspace{2em} ")}\\\\`
    ));

    return [
      caption ? `\\textbf{${caption}}${label}` : label,
      "\\begin{flushleft}",
      ...rows,
      "\\end{flushleft}",
      "",
    ];
  }

  if (block.type === "figure") {
    const caption = block.caption ? serializeInline(block.caption, block, labels, diagnostics) : "";
    const label = block.label ? `\\label{${escapeLatex(block.label)}}` : "";
    return [`\\IkFigurePlaceholder{${escapeLatex(block.altText)}}{${caption}${label}}`, ""];
  }

  return ["\\newpage", ""];
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
