import type { CanonicalBlock, CanonicalDocument, CanonicalInline } from "@/lib/editor-core/types";
import { documentUsesTexDerivedEditorSurface } from "@/lib/layout/parity-surface";
import { pageLayoutContract } from "@/lib/layout/page-layout-contract";

const { page, typography, fonts, spacing, table, figure } = pageLayoutContract;

export function renderCanonicalDocumentToEditorHtml(document: CanonicalDocument): string {
  return renderCanonicalDocumentPageToEditorHtml(document, document.blocks, 1);
}

export function renderCanonicalDocumentPagesToEditorHtml(document: CanonicalDocument): string[] {
  return splitCanonicalDocumentPages(document).map((blocks, pageIndex) => (
    renderCanonicalDocumentPageToEditorHtml(document, blocks, pageIndex + 1)
  ));
}

function renderCanonicalDocumentPageToEditorHtml(
  document: CanonicalDocument,
  blocks: CanonicalBlock[],
  pageNumber: number,
): string {
  const strictLyxLayout = documentUsesTexDerivedEditorSurface(document);

  return `<!doctype html>
<html lang="${escapeHtmlAttribute(document.settings.language)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=${page.widthPx}, initial-scale=1" />
    <title>${escapeHtml(document.title)} - page ${pageNumber}</title>
    <style>
      * { box-sizing: border-box; }
      html, body {
        width: ${page.widthPx}px;
        min-width: ${page.widthPx}px;
        height: ${page.heightPx}px;
        min-height: ${page.heightPx}px;
        margin: 0;
        overflow: hidden;
        background: #ffffff;
      }
      body {
        color: #202124;
        font-family: ${fonts.editorBodyFamily};
        font-size: ${typography.bodyFontSizePx}px;
        line-height: ${typography.bodyLineHeight};
      }
      .ik-doc-editor-page {
        width: ${page.widthPx}px;
        min-height: ${page.heightPx}px;
        margin: 0;
        padding: ${page.marginPx}px ${page.marginPx}px ${page.bottomPaddingPx}px;
        border: 0;
        background: #ffffff;
        color: #202124;
        outline: none;
        box-shadow: none;
        font-family: ${fonts.editorBodyFamily};
        font-size: ${typography.bodyFontSizePx}px;
        line-height: ${typography.bodyLineHeight};
      }
      .ik-doc-editor-page.ik-doc-lyx-strict {
        font-size: 13.25px;
        line-height: 1.45;
      }
      .ik-doc-editor-page.ik-doc-lyx-strict h1 {
        font-size: 29px;
        line-height: 1.2;
      }
      .ik-doc-editor-page.ik-doc-lyx-strict p,
      .ik-doc-editor-page.ik-doc-lyx-strict section {
        line-height: 1.45;
      }
      .ik-doc-editor-page h1,
      .ik-doc-editor-page h2,
      .ik-doc-editor-page h3 {
        margin: 0 0 ${spacing.headingBottomPx}px;
        color: #202124;
        line-height: 1.25;
        letter-spacing: 0;
      }
      .ik-doc-editor-page h1 { font-size: ${typography.headingOneFontSizePx}px; font-weight: 600; }
      .ik-doc-editor-page h2 { font-size: ${typography.headingTwoFontSizePx}px; font-weight: 600; }
      .ik-doc-editor-page h3 { font-size: ${typography.headingThreeFontSizePx}px; font-weight: 600; }
      .ik-doc-editor-page p { margin: 0 0 ${spacing.paragraphBottomPx}px; }
      .ik-doc-editor-page blockquote {
        margin: ${spacing.blockquoteMarginPx}px 0;
        padding: 0 0 0 ${spacing.blockquoteIndentPx}px;
        border-left: 0;
        background: transparent;
        color: #202124;
      }
      .ik-doc-editor-page pre {
        overflow: hidden;
        margin: ${spacing.mathDisplayMarginPx}px 0;
        padding: 0;
        border-radius: 0;
        background: transparent;
        color: #202124;
        text-align: center;
        white-space: pre-wrap;
      }
      .ik-doc-editor-page pre code {
        font-family: "Times New Roman", Times, serif;
        font-size: ${typography.mathDisplayFontSizePx}px;
      }
      .ik-doc-editor-page ul,
      .ik-doc-editor-page ol {
        margin: 0 0 ${spacing.listBottomMarginPx}px ${spacing.listLeftMarginPx}px;
        padding: 0;
      }
      .ik-doc-editor-page li {
        margin: 0 0 ${spacing.listItemBottomPx}px;
        padding-left: 4px;
      }
      .ik-doc-editor-page table {
        width: 100%;
        margin: 12px 0 6px;
        border-collapse: collapse;
      }
      .ik-doc-editor-page th,
      .ik-doc-editor-page td {
        min-width: ${table.cellMinWidthPx}px;
        padding: ${table.cellPaddingYPx}px ${table.cellPaddingXPx}px;
        border: 1px solid #dadce0;
        text-align: left;
        vertical-align: top;
      }
      .ik-doc-editor-page th {
        font-weight: 600;
        background: #f8fafd;
      }
      .ik-doc-table-strict table {
        width: ${table.contentWidthIn * 96}px;
      }
      .ik-doc-table-strict th,
      .ik-doc-table-strict td {
        height: ${Number(table.cellHeightIn) * 96}px;
        border-color: #000000;
      }
      .ik-doc-table-strict th {
        background: #ffffff;
      }
      .ik-doc-table-figure,
      .ik-doc-figure-placeholder { margin: ${spacing.figureMarginPx}px 0; }
      .ik-doc-table-figure figcaption,
      .ik-doc-figure-placeholder figcaption {
        margin-bottom: ${spacing.captionBottomPx}px;
        font-weight: 600;
      }
      .ik-doc-figure-placeholder div {
        display: grid;
        min-height: ${figure.placeholderMinHeightPx}px;
        place-items: center;
        border: 1px solid #dadce0;
        color: #5f6368;
        background: #f8fafd;
      }
      .ik-doc-page-break {
        margin: ${spacing.pageBreakMarginPx}px 0;
        border: 0;
        border-top: 2px dashed #c4c7c5;
      }
      .ik-math-inline,
      .ik-code-inline {
        font-family: "Courier New", Courier, monospace;
        font-size: 0.95em;
      }
      .ik-doc-abstract-label,
      .ik-doc-bibliography-label {
        display: block;
        margin: 0 0 11px;
        font-weight: 700;
      }
      .ik-doc-semantic-inset {
        margin: 0 0 ${spacing.paragraphBottomPx}px;
      }
      .ik-doc-semantic-inset strong {
        font-weight: 700;
      }
      .ik-doc-include-placeholder {
        margin: 0 0 ${spacing.paragraphBottomPx}px;
        font-family: "Courier New", Courier, monospace;
        font-size: 0.95em;
      }
      .ik-doc-front-matter,
      .ik-doc-generated-list {
        margin: 0 0 ${spacing.paragraphBottomPx}px;
      }
      .ik-doc-front-matter {
        line-height: 1.2;
        margin-bottom: 7px;
      }
      .ik-doc-front-matter strong,
      .ik-doc-branch strong,
      .ik-doc-generated-list strong {
        font-weight: 700;
      }
      .ik-doc-branch {
        margin: ${spacing.blockquoteMarginPx}px 0;
      }
      .ik-doc-embedded-asset {
        display: block;
        margin: 0 auto;
        object-fit: fill;
        border: 0;
      }
    </style>
  </head>
  <body>
    <article class="ik-doc-editor-page${strictLyxLayout ? " ik-doc-lyx-strict" : ""}" aria-label="Google Docs-style document page">
      ${blocks.map(renderBlock).join("\n")}
    </article>
  </body>
</html>`;
}

function splitCanonicalDocumentPages(document: CanonicalDocument): CanonicalBlock[][] {
  const pages: CanonicalBlock[][] = [[]];

  for (const block of document.blocks) {
    if (block.type === "page_break") {
      pages.push([]);
      continue;
    }

    pages.at(-1)?.push(block);
  }

  return pages.filter((blocks) => blocks.length > 0);
}

function renderBlock(block: CanonicalBlock): string {
  if (block.type === "heading") {
    return `<h${block.level}>${renderInline(block.children)}</h${block.level}>`;
  }

  if (block.type === "paragraph") {
    return `<p>${renderInline(block.children)}</p>`;
  }

  if (block.type === "abstract") {
    return `<section><strong class="ik-doc-abstract-label">Abstract</strong><p>${renderInline(block.children)}</p></section>`;
  }

  if (block.type === "math_display") {
    return `<pre><code class="language-latex">${escapeHtml(block.tex)}</code></pre>`;
  }

  if (block.type === "theorem") {
    return `<blockquote>${renderInline(block.children)}</blockquote>`;
  }

  if (block.type === "quote") {
    return `<blockquote>${renderInline(block.children)}</blockquote>`;
  }

  if (block.type === "list") {
    const tag = block.ordered ? "ol" : "ul";
    const style = [
      block.layout?.indentLevel ? `margin-left:${spacing.listLeftMarginPx + block.layout.indentLevel * 24}px` : "",
      block.layout?.markerStyle === "lower-alpha" ? "list-style-type:lower-alpha" : "",
      block.layout?.markerStyle === "dash" ? "list-style-type:'- '" : "",
    ].filter(Boolean).join(";");
    return `<${tag}${style ? ` style="${style}"` : ""}>${block.items.map((item) => `<li>${renderInline(item.children)}</li>`).join("")}</${tag}>`;
  }

  if (block.type === "table") {
    const strictTable = block.layout?.booktabs || block.layout?.tableKind === "longtable";
    return `<figure class="ik-doc-table-figure${strictTable ? " ik-doc-table-strict" : ""}">${block.caption ? `<figcaption>${renderInline(block.caption)}</figcaption>` : ""}<table><tbody>${block.rows.map((row) => `<tr>${row.cells.map((cell) => {
      const tag = cell.header ? "th" : "td";
      const width = block.layout?.columnWidths?.[row.cells.indexOf(cell)];
      const style = [
        cell.align ? `text-align:${cell.align}` : "",
        width ? `width:${width * 100}%` : "",
      ].filter(Boolean).join(";");
      const spanAttrs = [
        cell.colspan ? `colspan="${cell.colspan}"` : "",
        cell.rowspan ? `rowspan="${cell.rowspan}"` : "",
      ].filter(Boolean).join(" ");
      return `<${tag}${spanAttrs ? ` ${spanAttrs}` : ""}${style ? ` style="${style}"` : ""}>${renderInline(cell.children)}</${tag}>`;
    }).join("")}</tr>`).join("")}</tbody></table></figure>`;
  }

  if (block.type === "figure") {
    if (block.asset?.kind === "embedded") {
      const assetStyle = `style="width:${block.asset.widthRatio * 100}%;height:${block.asset.heightPx}px"`;
      return `<figure class="ik-doc-figure-placeholder"><img class="ik-doc-embedded-asset" ${assetStyle} alt="${escapeHtmlAttribute(block.altText)}" src="data:${escapeHtmlAttribute(block.asset.mimeType)};base64,${escapeHtmlAttribute(block.asset.dataBase64)}" />${block.caption ? `<figcaption style="text-align:center;font-weight:400">${renderInline(block.caption)}</figcaption>` : ""}</figure>`;
    }

    const assetStyle = block.asset
      ? ` style="width:${block.asset.widthRatio * 100}%;min-height:${block.asset.heightPx}px"`
      : "";
    return `<figure class="ik-doc-figure-placeholder"><div${assetStyle}>${escapeHtml(block.altText)}</div>${block.caption ? `<figcaption>${renderInline(block.caption)}</figcaption>` : ""}</figure>`;
  }

  if (block.type === "bibliography") {
    return `<section><strong class="ik-doc-bibliography-label">References</strong>${block.entries.map((entry) => `<p>${escapeHtml(entry.key)} ${escapeHtml(entry.text)}</p>`).join("")}</section>`;
  }

  if (block.type === "semantic_inset") {
    return `<p class="ik-doc-semantic-inset"><strong>${escapeHtml(block.insetKind)}:</strong> ${renderInline(block.children)}</p>`;
  }

  if (block.type === "include") {
    if (block.exportMode === "expand" && block.resolvedBlocks?.length) {
      return `<section class="ik-doc-include-placeholder">Included ${escapeHtml(block.includeKind)} ${escapeHtml(block.title)}</section>${block.resolvedBlocks.map(renderBlock).join("\n")}`;
    }

    return `<p class="ik-doc-include-placeholder">Included ${escapeHtml(block.includeKind)} ${escapeHtml(block.title)}</p>`;
  }

  if (block.type === "front_matter") {
    return `<p class="ik-doc-front-matter"><strong>${escapeHtml(block.frontMatterKind)}:</strong> ${renderInline(block.children)}</p>`;
  }

  if (block.type === "branch") {
    if (block.exportMode !== "included") {
      return "";
    }

    return `<section class="ik-doc-branch"><strong>Branch ${escapeHtml(block.branchName)}</strong>${block.blocks.map(renderBlock).join("\n")}</section>`;
  }

  if (block.type === "generated_list") {
    return `<section class="ik-doc-generated-list"><strong>${escapeHtml(block.title)}</strong>${block.entries.map((entry) => `<p>${escapeHtml(entry.term)}${entry.description ? ` ${escapeHtml(entry.description)}` : ""}</p>`).join("")}</section>`;
  }

  return `<hr class="ik-doc-page-break" />`;
}

function renderInline(children: CanonicalInline[]): string {
  return children.map((child) => {
    if (child.type === "text") {
      return escapeHtml(child.text);
    }

    if (child.type === "math_inline") {
      return `<code class="ik-math-inline">${escapeHtml(child.tex)}</code>`;
    }

    if (child.type === "citation") {
      return `<code class="ik-code-inline">@${escapeHtml(child.key)}</code>`;
    }

    if (child.type === "label") {
      return `<span data-label-target="${escapeHtmlAttribute(child.target)}"></span>`;
    }

    if (child.type === "index_entry") {
      return `<span data-index-term="${escapeHtmlAttribute(child.term)}"></span>`;
    }

    if (child.type === "glossary_entry") {
      return `<span data-glossary-term="${escapeHtmlAttribute(child.term)}">${escapeHtml(child.term)}</span>`;
    }

    if (child.type === "nomenclature_entry") {
      return `<span data-nomenclature-symbol="${escapeHtmlAttribute(child.symbol)}">${escapeHtml(child.symbol)}</span>`;
    }

    if (child.type === "reference") {
      return `<code class="ik-code-inline">[[${escapeHtml(child.target)}]]</code>`;
    }

    if (child.type === "footnote") {
      if (child.placement === "page_footer") {
        return `<code class="ik-code-inline ik-footnote-placement">(note: ${renderInline(child.children)})</code>`;
      }

      return `<code class="ik-code-inline">(note: ${renderInline(child.children)})</code>`;
    }

    if (child.type === "language_span") {
      return `<span lang="${escapeHtmlAttribute(child.language)}">${renderInline(child.children)}</span>`;
    }

    return `<code class="ik-code-inline ik-comment-inline">[comment: ${renderInline(child.children)} - ${escapeHtml(child.comment)}]</code>`;
  }).join("");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
