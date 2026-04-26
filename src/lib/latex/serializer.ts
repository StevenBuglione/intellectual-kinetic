import type { CanonicalBlock, CanonicalDocument, CanonicalInline } from "@/lib/editor-core/types";
import { pageLayoutContract } from "@/lib/layout/page-layout-contract";

const { page, typography, fonts, table, figure } = pageLayoutContract;

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
    `\\usepackage[margin=${page.marginIn}in]{geometry}`,
    `\\usepackage[scaled]{${fonts.latexBodyPackage}}`,
    "\\usepackage{xcolor}",
    "\\usepackage{array}",
    "\\usepackage{enumitem}",
    "\\renewcommand{\\familydefault}{\\sfdefault}",
    "\\setlength{\\parindent}{0pt}",
    "\\setlength{\\parskip}{0.75em}",
    `\\newcommand{\\IkHeadingOne}[1]{{\\fontsize{${typography.headingOneFontSizePt}pt}{${typography.headingOneLineHeightPt}pt}\\selectfont\\bfseries #1}\\par\\vspace{0.35em}}`,
    `\\newcommand{\\IkHeadingTwo}[1]{{\\fontsize{${typography.headingTwoFontSizePt}pt}{${typography.headingTwoLineHeightPt}pt}\\selectfont\\bfseries #1}\\par\\vspace{0.3em}}`,
    `\\newcommand{\\IkHeadingThree}[1]{{\\fontsize{${typography.headingThreeFontSizePt}pt}{${typography.headingThreeLineHeightPt}pt}\\selectfont\\bfseries #1}\\par\\vspace{0.25em}}`,
    "\\newcommand{\\IkTheoremBlock}[1]{\\par\\vspace{0.6em}\\noindent\\hspace{0.25in}\\begin{minipage}{0.86\\linewidth}#1\\end{minipage}\\par\\vspace{0.6em}}",
    "\\newcommand{\\IkComment}[4]{\\texttt{[comment: #3 - #4]}}",
    "\\newcommand{\\IkPlacedFootnote}[1]{\\texttt{(note: #1)}}",
    `\\newcommand{\\IkTableCell}[2]{\\fbox{\\begin{minipage}[t][${table.cellHeightIn}in][c]{#1}#2\\end{minipage}}}`,
    `\\newcommand{\\IkFigurePlaceholder}[2]{\\par\\vspace{0.8em}\\begin{center}\\fbox{\\begin{minipage}[c][${figure.placeholderHeightIn}in][c]{${figure.placeholderWidthRatio}\\linewidth}\\centering #1\\end{minipage}}\\\\[0.35em]#2\\end{center}\\vspace{0.4em}}`,
    "\\newcommand{\\IkAssetFigurePlaceholder}[4]{\\par\\vspace{0.8em}\\begin{center}\\fbox{\\begin{minipage}[c][#2][c]{#1}\\centering #3\\end{minipage}}\\\\[0.35em]#4\\end{center}\\vspace{0.4em}}",
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

  if (block.type === "abstract") {
    return [
      "\\textbf{Abstract}",
      serializeInline(block.children, block, labels, diagnostics),
      "",
    ];
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
    const environment = block.ordered ? "enumerate" : "itemize";
    const enumOptions = block.layout?.markerStyle === "lower-alpha"
      ? "[label=\\alph*.]"
      : "";
    const leftSkip = block.layout?.indentLevel ? `${(block.layout.indentLevel * 0.25).toFixed(2)}in` : undefined;
    return [
      ...(leftSkip ? [`\\begingroup`, `\\setlength{\\leftskip}{${leftSkip}}`] : []),
      `\\begin{${environment}}${enumOptions}`,
      ...block.items.map((item) => `\\item ${serializeInline(item.children, block, labels, diagnostics)}`),
      `\\end{${environment}}`,
      ...(leftSkip ? ["\\endgroup"] : []),
      "",
    ];
  }

  if (block.type === "table") {
    const caption = block.caption ? serializeInline(block.caption, block, labels, diagnostics) : "";
    const label = block.label ? `\\label{${escapeLatex(block.label)}}` : "";
    const columnCount = Math.max(1, ...block.rows.map((row) => row.cells.length));
    const columnWidths = block.layout?.columnWidths?.length === columnCount
      ? block.layout.columnWidths
      : Array.from({ length: columnCount }, () => 1 / columnCount);
    const rows = block.rows.map((row, index) => {
      const rowBreak = index === block.rows.length - 1 ? "" : "\\\\[-\\fboxrule]";
      return `\\noindent${row.cells.map((cell, cellIndex) => {
        const contents = serializeInline(cell.children, block, labels, diagnostics);
        const cellWidth = `${(table.contentWidthIn * (columnWidths[cellIndex] ?? (1 / columnCount))).toFixed(2)}in`;
        const alignedContents = `${serializeAlignment(cell.align)}${cell.header ? `\\textbf{${contents}}` : contents}`;
        return `\\IkTableCell{${cellWidth}}{${alignedContents}}`;
      }).join("")}${rowBreak}`;
    });

    return [
      caption ? `\\textbf{${caption}}${label}` : label,
      "\\par\\vspace{0.35em}",
      ...rows,
      "",
    ];
  }

  if (block.type === "figure") {
    const caption = block.caption ? serializeInline(block.caption, block, labels, diagnostics) : "";
    const label = block.label ? `\\label{${escapeLatex(block.label)}}` : "";
    if (block.asset) {
      const width = `${block.asset.widthRatio.toFixed(2)}\\linewidth`;
      const height = `${(block.asset.heightPx / 96).toFixed(2)}in`;
      return [`\\IkAssetFigurePlaceholder{${width}}{${height}}{${escapeLatex(block.altText)}}{${caption}${label}}`, ""];
    }

    return [`\\IkFigurePlaceholder{${escapeLatex(block.altText)}}{${caption}${label}}`, ""];
  }

  if (block.type === "quote") {
    return [`\\IkTheoremBlock{${serializeInline(block.children, block, labels, diagnostics)}}`, ""];
  }

  if (block.type === "bibliography") {
    return [
      "\\textbf{References}",
      ...block.entries.map((entry) => `${escapeLatex(entry.key)} ${escapeLatex(entry.text)}\\\\`),
      "",
    ];
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

      if (child.type === "footnote") {
        if (child.placement === "page_footer") {
          return `\\IkPlacedFootnote{${serializeInline(child.children, block, labels, diagnostics)}}`;
        }

        return `\\texttt{(note: ${serializeInline(child.children, block, labels, diagnostics)})}`;
      }

      if (child.type === "language_span") {
        return serializeInline(child.children, block, labels, diagnostics);
      }

      if (child.type === "comment") {
        return `\\IkComment{${escapeLatex(child.author)}}{${escapeLatex(child.status)}}{${serializeInline(child.children, block, labels, diagnostics)}}{${escapeLatex(child.comment)}}`;
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

function serializeAlignment(align: "left" | "center" | "right" | undefined): string {
  if (align === "center") {
    return "\\centering ";
  }

  if (align === "right") {
    return "\\raggedleft ";
  }

  if (align === "left") {
    return "\\raggedright ";
  }

  return "";
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
