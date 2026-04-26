import type { CanonicalBlock, CanonicalDocument, CanonicalInline } from "@/lib/editor-core/types";

const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1056;

export function renderCanonicalDocumentToEditorHtml(document: CanonicalDocument): string {
  return `<!doctype html>
<html lang="${escapeHtmlAttribute(document.settings.language)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=${PAGE_WIDTH}, initial-scale=1" />
    <title>${escapeHtml(document.title)}</title>
    <style>
      * { box-sizing: border-box; }
      html, body {
        width: ${PAGE_WIDTH}px;
        min-width: ${PAGE_WIDTH}px;
        height: ${PAGE_HEIGHT}px;
        min-height: ${PAGE_HEIGHT}px;
        margin: 0;
        overflow: hidden;
        background: #ffffff;
      }
      body {
        color: #202124;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14.6667px;
        line-height: 1.5;
      }
      .ik-doc-editor-page {
        width: ${PAGE_WIDTH}px;
        min-height: ${PAGE_HEIGHT}px;
        margin: 0;
        padding: 96px 96px 110px;
        border: 0;
        background: #ffffff;
        color: #202124;
        outline: none;
        box-shadow: none;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14.6667px;
        line-height: 1.5;
      }
      .ik-doc-editor-page h1,
      .ik-doc-editor-page h2,
      .ik-doc-editor-page h3 {
        margin: 0 0 14px;
        color: #202124;
        line-height: 1.25;
        letter-spacing: 0;
      }
      .ik-doc-editor-page h1 { font-size: 28px; font-weight: 600; }
      .ik-doc-editor-page h2 { font-size: 22px; font-weight: 600; }
      .ik-doc-editor-page h3 { font-size: 18px; font-weight: 600; }
      .ik-doc-editor-page p { margin: 0 0 11px; }
      .ik-doc-editor-page blockquote {
        margin: 20px 0;
        padding: 0 0 0 36px;
        border-left: 0;
        background: transparent;
        color: #202124;
      }
      .ik-doc-editor-page pre {
        overflow: hidden;
        margin: 18px 0;
        padding: 0;
        border-radius: 0;
        background: transparent;
        color: #202124;
        text-align: center;
        white-space: pre-wrap;
      }
      .ik-doc-editor-page pre code {
        font-family: "Times New Roman", Times, serif;
        font-size: 16px;
      }
      .ik-doc-editor-page ul,
      .ik-doc-editor-page ol {
        margin: 0 0 14px 24px;
        padding: 0;
      }
      .ik-doc-editor-page li {
        margin: 0 0 6px;
        padding-left: 4px;
      }
      .ik-doc-editor-page table {
        width: 100%;
        margin: 12px 0 6px;
        border-collapse: collapse;
      }
      .ik-doc-editor-page th,
      .ik-doc-editor-page td {
        min-width: 96px;
        padding: 6px 8px;
        border: 1px solid #dadce0;
        text-align: left;
        vertical-align: top;
      }
      .ik-doc-editor-page th {
        font-weight: 600;
        background: #f8fafd;
      }
      .ik-doc-table-figure,
      .ik-doc-figure-placeholder { margin: 18px 0; }
      .ik-doc-table-figure figcaption,
      .ik-doc-figure-placeholder figcaption {
        margin-bottom: 6px;
        font-weight: 600;
      }
      .ik-doc-figure-placeholder div {
        display: grid;
        min-height: 96px;
        place-items: center;
        border: 1px solid #dadce0;
        color: #5f6368;
        background: #f8fafd;
      }
      .ik-doc-page-break {
        margin: 28px 0;
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
    </style>
  </head>
  <body>
    <article class="ik-doc-editor-page" aria-label="Google Docs-style document page">
      ${document.blocks.map(renderBlock).join("\n")}
    </article>
  </body>
</html>`;
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
    return `<${tag}>${block.items.map((item) => `<li>${renderInline(item.children)}</li>`).join("")}</${tag}>`;
  }

  if (block.type === "table") {
    return `<figure class="ik-doc-table-figure">${block.caption ? `<figcaption>${renderInline(block.caption)}</figcaption>` : ""}<table><tbody>${block.rows.map((row) => `<tr>${row.cells.map((cell) => {
      const tag = cell.header ? "th" : "td";
      return `<${tag}>${renderInline(cell.children)}</${tag}>`;
    }).join("")}</tr>`).join("")}</tbody></table></figure>`;
  }

  if (block.type === "figure") {
    return `<figure class="ik-doc-figure-placeholder"><div>${escapeHtml(block.altText)}</div>${block.caption ? `<figcaption>${renderInline(block.caption)}</figcaption>` : ""}</figure>`;
  }

  if (block.type === "bibliography") {
    return `<section><strong class="ik-doc-bibliography-label">References</strong>${block.entries.map((entry) => `<p>${escapeHtml(entry.key)} ${escapeHtml(entry.text)}</p>`).join("")}</section>`;
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

    if (child.type === "reference") {
      return `<code class="ik-code-inline">[[${escapeHtml(child.target)}]]</code>`;
    }

    if (child.type === "footnote") {
      return `<code class="ik-code-inline">(note: ${renderInline(child.children)})</code>`;
    }

    return `<span lang="${escapeHtmlAttribute(child.language)}">${renderInline(child.children)}</span>`;
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
