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
  const labels = collectLabels(document.blocks);

  const lines = [
    `% Generated deterministically from canonical AST ${document.id}`,
    `\\documentclass{${document.settings.documentClass}}`,
    ...document.settings.modules.map((moduleName) => `\\usepackage{${moduleName}}`),
    `\\usepackage[margin=${page.marginIn}in]{geometry}`,
    `\\usepackage[scaled]{${fonts.latexBodyPackage}}`,
    "\\usepackage{xcolor}",
    "\\usepackage{array}",
    "\\usepackage{enumitem}",
    ...(document.settings.customPreamble ?? []).filter((entry) => entry.enabled).flatMap((entry) => [
      `% IK custom preamble: ${entry.id}`,
      entry.source,
    ]),
    ...(document.settings.bibliographyEngine ? [`% IK bibliography engine: ${document.settings.bibliographyEngine}`] : []),
    ...(document.settings.citationStyle ? [`% IK citation style: ${document.settings.citationStyle}`] : []),
    ...(document.settings.latexEngine ? [`% IK latex engine: ${document.settings.latexEngine}`] : []),
    ...(document.settings.languagePackage ? [`% IK language package: ${document.settings.languagePackage}`] : []),
    ...(document.settings.secondaryLanguages?.length ? [`% IK secondary languages: ${document.settings.secondaryLanguages.join(", ")}`] : []),
    ...(document.settings.textDirection ? [`% IK text direction: ${document.settings.textDirection}`] : []),
    ...(document.settings.branches ?? []).map((branch) => `% IK branch: ${branch.id} ${branch.name} ${branch.exportMode}`),
    "\\renewcommand{\\familydefault}{\\sfdefault}",
    "\\setlength{\\parindent}{0pt}",
    "\\setlength{\\parskip}{0.75em}",
    `\\newcommand{\\IkHeadingOne}[1]{{\\fontsize{${typography.headingOneFontSizePt}pt}{${typography.headingOneLineHeightPt}pt}\\selectfont\\bfseries #1}\\par\\vspace{0.35em}}`,
    `\\newcommand{\\IkHeadingTwo}[1]{{\\fontsize{${typography.headingTwoFontSizePt}pt}{${typography.headingTwoLineHeightPt}pt}\\selectfont\\bfseries #1}\\par\\vspace{0.3em}}`,
    `\\newcommand{\\IkHeadingThree}[1]{{\\fontsize{${typography.headingThreeFontSizePt}pt}{${typography.headingThreeLineHeightPt}pt}\\selectfont\\bfseries #1}\\par\\vspace{0.25em}}`,
    "\\newcommand{\\IkTheoremBlock}[1]{\\par\\vspace{0.6em}\\noindent\\hspace{0.25in}\\begin{minipage}{0.86\\linewidth}#1\\end{minipage}\\par\\vspace{0.6em}}",
    "\\newcommand{\\IkComment}[4]{\\texttt{[comment: #3 - #4]}}",
    "\\newcommand{\\IkPlacedFootnote}[1]{\\texttt{(note: #1)}}",
    "\\newcommand{\\IkLabel}[1]{\\label{#1}}",
    "\\newcommand{\\IkCitationVariant}[2]{\\texttt{@#2}}",
    "\\newcommand{\\IkSemanticInset}[2]{\\textbf{#1:} #2}",
    "\\newcommand{\\IkIncludePlaceholder}[3]{\\texttt{Included \\detokenize{#1} \\detokenize{#3}}}",
    "\\newcommand{\\IkIncludedChildBegin}[1]{\\texttt{Included \\detokenize{child_document} #1}\\par}",
    "\\newcommand{\\IkIncludedChildEnd}{\\par}",
    "\\newcommand{\\IkFrontMatter}[2]{\\textbf{#1:} #2\\par}",
    "\\newcommand{\\IkBranchBegin}[1]{\\textbf{Branch #1}\\par}",
    "\\newcommand{\\IkBranchEnd}{\\par}",
    "\\newcommand{\\IkGeneratedList}[2]{\\textbf{#1}\\par #2\\par}",
    "\\newcommand{\\IkIndexEntry}[2]{}",
    "\\newcommand{\\IkGlossaryEntry}[2]{#1}",
    "\\newcommand{\\IkNomenclatureEntry}[2]{#1}",
    "\\newcommand{\\IkAssetImage}[4]{\\par\\vspace{0.8em}\\begin{center}\\includegraphics[width=#1,height=#2]{#3}\\\\[0.35em]#4\\end{center}\\vspace{0.4em}}",
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
    const columnCount = block.layout?.columnWidths?.length
      ?? Math.max(1, ...block.rows.map((row) => row.cells.reduce((count, cell) => count + (cell.colspan ?? 1), 0)));
    const columnWidths = block.layout?.columnWidths?.length === columnCount
      ? block.layout.columnWidths
      : Array.from({ length: columnCount }, () => 1 / columnCount);
    const rows = block.rows.map((row, index) => {
      const rowBreak = index === block.rows.length - 1 ? "" : "\\\\[-\\fboxrule]";
      let columnCursor = 0;
      return `\\noindent${row.cells.map((cell) => {
        const contents = serializeInline(cell.children, block, labels, diagnostics);
        const colspan = cell.colspan ?? 1;
        const widthRatio = columnWidths
          .slice(columnCursor, columnCursor + colspan)
          .reduce((sum, width) => sum + width, 0) || (colspan / columnCount);
        columnCursor += colspan;
        const cellWidth = `${(table.contentWidthIn * widthRatio).toFixed(2)}in`;
        const alignedContents = `${serializeAlignment(cell.align)}${cell.header ? `\\textbf{${contents}}` : contents}`;
        return `\\IkTableCell{${cellWidth}}{${alignedContents}}`;
      }).join("")}${rowBreak}`;
    });

    return [
      `% IK table mode: ${block.layout?.tableKind ?? "standard"}`,
      `% IK table booktabs: ${Boolean(block.layout?.booktabs)}`,
      `% IK table repeat header: ${Boolean(block.layout?.repeatHeader)}`,
      caption ? `\\textbf{${caption}}${label}` : label,
      "\\par\\vspace{0.35em}",
      ...rows,
      "",
    ];
  }

  if (block.type === "figure") {
    const caption = block.caption ? serializeInline(block.caption, block, labels, diagnostics) : "";
    const label = block.label ? `\\label{${escapeLatex(block.label)}}` : "";
    if (block.asset?.kind === "embedded") {
      const width = `${block.asset.widthRatio.toFixed(2)}\\linewidth`;
      const height = `${(block.asset.heightPx / 96).toFixed(2)}in`;
      return [`\\IkAssetImage{${width}}{${height}}{${escapeLatex(block.asset.fileName)}}{${caption}${label}}`, ""];
    }

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

  if (block.type === "semantic_inset") {
    return [`\\IkSemanticInset{${escapeLatex(block.insetKind)}}{${serializeInline(block.children, block, labels, diagnostics)}}`, ""];
  }

  if (block.type === "include") {
    if (block.exportMode === "expand" && block.resolvedBlocks?.length) {
      return [
        `\\IkIncludedChildBegin{${escapeLatex(block.title)}}`,
        ...block.resolvedBlocks.flatMap((resolvedBlock) => serializeBlock(resolvedBlock, labels, diagnostics)),
        "\\IkIncludedChildEnd",
        "",
      ];
    }

    return [`\\IkIncludePlaceholder{${block.includeKind}}{${block.targetDocumentId}}{${block.title}}`, ""];
  }

  if (block.type === "front_matter") {
    return [`\\IkFrontMatter{${escapeLatex(block.frontMatterKind)}}{${serializeInline(block.children, block, labels, diagnostics)}}`, ""];
  }

  if (block.type === "branch") {
    if (block.exportMode !== "included") {
      return [`% IK omitted branch: ${escapeLatex(block.branchId)}`, ""];
    }

    return [
      `\\IkBranchBegin{${escapeLatex(block.branchName)}}`,
      ...block.blocks.flatMap((branchBlock) => serializeBlock(branchBlock, labels, diagnostics)),
      "\\IkBranchEnd",
      "",
    ];
  }

  if (block.type === "generated_list") {
    const contents = block.entries
      .map((entry) => `${escapeLatex(entry.term)}${entry.description ? ` ${escapeLatex(entry.description)}` : ""}`)
      .join("\\\\ ");
    return [`\\IkGeneratedList{${escapeLatex(block.title)}}{${contents}}`, ""];
  }

  return ["\\newpage", ""];
}

function collectLabels(blocks: CanonicalBlock[]): Set<string> {
  const blockLabels = blocks.flatMap((block) => ("label" in block && block.label ? [block.label] : []));
  const nestedBlockLabels = blocks.flatMap((block) => {
    if (block.type === "branch") {
      return [...collectLabels(block.blocks)];
    }

    if (block.type === "include" && block.resolvedBlocks) {
      return [...collectLabels(block.resolvedBlocks)];
    }

    return [];
  });
  const inlineLabels = blocks.flatMap((block) => ("children" in block ? collectInlineLabels(block.children) : []));

  return new Set([...blockLabels, ...nestedBlockLabels, ...inlineLabels]);
}

function collectInlineLabels(children: CanonicalInline[]): string[] {
  return children.flatMap((child): string[] => {
    if (child.type === "label") {
      return [child.target];
    }

    if ("children" in child) {
      return collectInlineLabels(child.children);
    }

    return [];
  });
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
        if (child.variant && child.variant !== "default") {
          return `\\IkCitationVariant{${escapeLatex(child.variant)}}{${escapeLatex(child.key)}}`;
        }

        return `\\texttt{@${escapeLatex(child.key)}}`;
      }

      if (child.type === "label") {
        return `\\IkLabel{${escapeLatex(child.target)}}`;
      }

      if (child.type === "index_entry") {
        return `\\IkIndexEntry{${escapeLatex(child.term)}}{${escapeLatex(child.sortKey ?? "")}}`;
      }

      if (child.type === "glossary_entry") {
        return `\\IkGlossaryEntry{${escapeLatex(child.term)}}{${escapeLatex(child.description)}}`;
      }

      if (child.type === "nomenclature_entry") {
        return `\\IkNomenclatureEntry{${escapeLatex(child.symbol)}}{${escapeLatex(child.description)}}`;
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
