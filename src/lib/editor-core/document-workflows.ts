import { canonicalDocumentToEditorText } from "./plaintext";
import type { CanonicalBlock, CanonicalDocument, CanonicalInline } from "./types";

export type ReplaceAllOptions = {
  find: string;
  replaceWith: string;
  matchCase?: boolean;
};

export type ReplaceAllResult = {
  document: CanonicalDocument;
  replacementCount: number;
};

export type DocumentStatistics = {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  totalBlocks: number;
  paragraphLikeBlocks: number;
  headings: number;
  mathBlocks: number;
  tables: number;
  figures: number;
};

export type PasteSpecialFormat = "latex" | "html" | "plain-text";

export type PasteSpecialInput = {
  format: PasteSpecialFormat;
  source: string;
};

export function replaceAllInCanonicalDocument(
  document: CanonicalDocument,
  options: ReplaceAllOptions,
): ReplaceAllResult {
  if (!options.find) {
    return { document, replacementCount: 0 };
  }

  let replacementCount = 0;
  const matcher = new RegExp(escapeRegExp(options.find), options.matchCase ? "g" : "gi");
  const replaceText = (value: string) => value.replace(matcher, () => {
    replacementCount += 1;
    return options.replaceWith;
  });

  const blocks = document.blocks.map((block) => replaceInBlock(block, replaceText));

  return {
    document: {
      ...document,
      blocks,
      updatedAt: replacementCount > 0 ? new Date().toISOString() : document.updatedAt,
    },
    replacementCount,
  };
}

export function calculateDocumentStatistics(document: CanonicalDocument): DocumentStatistics {
  const text = canonicalDocumentToEditorText(document);
  const words = text.match(/\b[\p{L}\p{N}@][\p{L}\p{N}@:_-]*\b/gu)?.length ?? 0;

  return {
    words,
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, "").length,
    totalBlocks: countBlocks(document.blocks),
    paragraphLikeBlocks: document.blocks.filter((block) => (
      block.type === "paragraph"
      || block.type === "abstract"
      || block.type === "quote"
      || block.type === "theorem"
      || block.type === "front_matter"
      || block.type === "semantic_inset"
    )).length,
    headings: document.blocks.filter((block) => block.type === "heading").length,
    mathBlocks: document.blocks.filter((block) => block.type === "math_display").length,
    tables: document.blocks.filter((block) => block.type === "table").length,
    figures: document.blocks.filter((block) => block.type === "figure").length,
  };
}

export function pasteSpecialToCanonicalBlocks(input: PasteSpecialInput): CanonicalBlock[] {
  if (input.format === "latex") {
    return parseLatexBlocks(input.source);
  }

  if (input.format === "html") {
    return parseHtmlBlocks(input.source);
  }

  return plainTextToParagraphs(input.source);
}

function replaceInBlock(block: CanonicalBlock, replaceText: (value: string) => string): CanonicalBlock {
  if ("children" in block) {
    return {
      ...block,
      children: replaceInInlines(block.children, replaceText),
    };
  }

  if (block.type === "math_display") {
    return {
      ...block,
      tex: replaceText(block.tex),
    };
  }

  if (block.type === "table") {
    return {
      ...block,
      caption: block.caption ? replaceInInlines(block.caption, replaceText) : undefined,
      rows: block.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => ({
          ...cell,
          children: replaceInInlines(cell.children, replaceText),
        })),
      })),
    };
  }

  if (block.type === "figure") {
    return {
      ...block,
      altText: replaceText(block.altText),
      caption: block.caption ? replaceInInlines(block.caption, replaceText) : undefined,
    };
  }

  if (block.type === "bibliography") {
    return {
      ...block,
      entries: block.entries.map((entry) => ({
        ...entry,
        text: replaceText(entry.text),
      })),
    };
  }

  if (block.type === "include") {
    return {
      ...block,
      title: replaceText(block.title),
      resolvedBlocks: block.resolvedBlocks?.map((resolvedBlock) => replaceInBlock(resolvedBlock, replaceText)),
    };
  }

  if (block.type === "branch") {
    return {
      ...block,
      branchName: replaceText(block.branchName),
      blocks: block.blocks.map((branchBlock) => replaceInBlock(branchBlock, replaceText)),
    };
  }

  if (block.type === "generated_list") {
    return {
      ...block,
      title: replaceText(block.title),
      entries: block.entries.map((entry) => ({
        ...entry,
        term: replaceText(entry.term),
        description: entry.description ? replaceText(entry.description) : undefined,
      })),
    };
  }

  return block;
}

function replaceInInlines(children: CanonicalInline[], replaceText: (value: string) => string): CanonicalInline[] {
  return children.map((child) => {
    if (child.type === "text") {
      return { ...child, text: replaceText(child.text) };
    }

    if (child.type === "math_inline") {
      return { ...child, tex: replaceText(child.tex) };
    }

    if (child.type === "footnote" || child.type === "language_span" || child.type === "comment") {
      return { ...child, children: replaceInInlines(child.children, replaceText) };
    }

    if (child.type === "glossary_entry") {
      return {
        ...child,
        term: replaceText(child.term),
        description: replaceText(child.description),
      };
    }

    if (child.type === "nomenclature_entry") {
      return {
        ...child,
        symbol: replaceText(child.symbol),
        description: replaceText(child.description),
      };
    }

    if (child.type === "index_entry") {
      return {
        ...child,
        term: replaceText(child.term),
        sortKey: child.sortKey ? replaceText(child.sortKey) : undefined,
      };
    }

    return child;
  });
}

function parseLatexBlocks(source: string): CanonicalBlock[] {
  const normalized = source.replace(/\r\n/g, "\n");
  const tokenPattern = /\\(section|subsection|subsubsection)\{([^}]*)\}|\\begin\{equation\}([\s\S]*?)\\end\{equation\}|\\\[([\s\S]*?)\\\]/g;
  const blocks: CanonicalBlock[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(normalized)) !== null) {
    blocks.push(...plainTextToParagraphs(stripLatexCommands(normalized.slice(cursor, match.index))));

    if (match[1]) {
      blocks.push({
        id: workflowId("latex-heading", blocks.length),
        type: "heading",
        level: match[1] === "section" ? 1 : match[1] === "subsection" ? 2 : 3,
        children: [{ type: "text", text: match[2].trim() }],
        reviewState: "needs_review",
      });
    } else {
      blocks.push({
        id: workflowId(match[3] ? "latex-equation" : "latex-display", blocks.length),
        type: "math_display",
        tex: String(match[3] ?? match[4] ?? "").trim(),
        numbered: Boolean(match[3]),
        reviewState: "needs_review",
      });
    }

    cursor = match.index + match[0].length;
  }

  blocks.push(...plainTextToParagraphs(stripLatexCommands(normalized.slice(cursor))));
  return blocks;
}

function parseHtmlBlocks(source: string): CanonicalBlock[] {
  const blocks: CanonicalBlock[] = [];
  let remaining = source;

  remaining = remaining.replace(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi, (_match, level: string, text: string) => {
    blocks.push({
      id: workflowId("html-heading", blocks.length),
      type: "heading",
      level: Number(level) as 1 | 2 | 3,
      children: [{ type: "text", text: htmlToText(text) }],
      reviewState: "needs_review",
    });
    return "\n";
  });

  remaining = remaining.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_match, text: string) => {
    blocks.push({
      id: workflowId("html-paragraph", blocks.length),
      type: "paragraph",
      children: [{ type: "text", text: htmlToText(text) }],
      reviewState: "needs_review",
    });
    return "\n";
  });

  const trailingText = htmlToText(remaining).trim();
  return trailingText ? [...blocks, ...plainTextToParagraphs(trailingText)] : blocks;
}

function plainTextToParagraphs(source: string): CanonicalBlock[] {
  return source
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => ({
      id: workflowId("paste-paragraph", index),
      type: "paragraph",
      children: [{ type: "text", text: paragraph }],
      reviewState: "needs_review",
    }));
}

function countBlocks(blocks: CanonicalBlock[]): number {
  return blocks.reduce((count, block) => {
    if (block.type === "branch") {
      return count + 1 + countBlocks(block.blocks);
    }

    if (block.type === "include" && block.resolvedBlocks) {
      return count + 1 + countBlocks(block.resolvedBlocks);
    }

    return count + 1;
  }, 0);
}

function stripLatexCommands(source: string): string {
  return source
    .replace(/\\begin\{[^}]+\}|\\end\{[^}]+\}/g, "\n")
    .replace(/\\item\s+/g, "\n")
    .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?/g, "")
    .replace(/[{}]/g, "")
    .trim();
}

function htmlToText(source: string): string {
  return source
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function workflowId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
