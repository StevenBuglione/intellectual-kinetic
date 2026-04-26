import { canonicalDocumentToEditorText } from "./plaintext";
import type {
  CanonicalBlock,
  CanonicalDocument,
  CanonicalInline,
  ChangeTrackingAuthor,
} from "./types";

export type ReplaceAllOptions = {
  find: string;
  replaceWith: string;
  matchCase?: boolean;
  transformReplacement?: (matchedText: string) => string;
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

export type TrackedChangeKind = "tracked_insert" | "tracked_delete";

export type TrackedChangeSummary = {
  id: string;
  kind: TrackedChangeKind;
  blockId: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  text: string;
};

export function replaceAllInCanonicalDocument(
  document: CanonicalDocument,
  options: ReplaceAllOptions,
): ReplaceAllResult {
  if (!options.find) {
    return { document, replacementCount: 0 };
  }

  const matcher = new RegExp(escapeRegExp(options.find), options.matchCase ? "g" : "gi");
  const counter = { value: 0 };
  const replacementForMatch = (matchedText: string) => options.transformReplacement?.(matchedText) ?? options.replaceWith;
  const replaceText = (value: string) => value.replace(matcher, (matchedText) => {
    counter.value += 1;
    return replacementForMatch(matchedText);
  });

  const blocks = document.blocks.map((block) => (
    replaceInBlock(block, replaceText, matcher, replacementForMatch, counter)
  ));

  return {
    document: {
      ...document,
      blocks,
      updatedAt: counter.value > 0 ? new Date().toISOString() : document.updatedAt,
    },
    replacementCount: counter.value,
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

export function ensureChangeTrackingAuthor(
  document: CanonicalDocument,
  authorName: string,
): { document: CanonicalDocument; author: ChangeTrackingAuthor } {
  const normalizedName = authorName.trim() || "Editor";
  const normalizedId = `author-${slugifyReviewAuthor(normalizedName)}`;
  const existingAuthors = document.metadata.changeTracking?.authors ?? [{ id: "author-editor", name: "Editor" }];
  const existingAuthor = existingAuthors.find((author) => author.id === normalizedId || author.name === normalizedName);
  const author = existingAuthor ?? { id: normalizedId, name: normalizedName };
  const authors = existingAuthor ? existingAuthors : [...existingAuthors, author];

  return {
    author,
    document: {
      ...document,
      metadata: {
        ...document.metadata,
        changeTracking: {
          currentAuthorId: author.id,
          authors,
        },
      },
    },
  };
}

export function listTrackedChanges(document: CanonicalDocument): TrackedChangeSummary[] {
  return document.blocks.flatMap((block) => listTrackedChangesInBlock(block));
}

export function trackBlockInsertion(
  document: CanonicalDocument,
  options: {
    blockId: string;
    insertAfterText: string;
    text: string;
    authorId: string;
    authorName: string;
    createdAt?: string;
  },
): CanonicalDocument {
  if (!options.text.trim()) {
    return document;
  }

  const createdAt = options.createdAt ?? new Date().toISOString();
  const nextBlocks = document.blocks.map((block) => (
    updateBlockChildren(block, options.blockId, (children) => insertTrackedChange(children, {
      kind: "tracked_insert",
      text: options.text,
      insertAfterText: options.insertAfterText,
      authorId: options.authorId,
      authorName: options.authorName,
      createdAt,
    }))
  ));

  if (JSON.stringify(nextBlocks) === JSON.stringify(document.blocks)) {
    return document;
  }

  return {
    ...document,
    blocks: nextBlocks,
    updatedAt: new Date().toISOString(),
  };
}

export function trackBlockDeletion(
  document: CanonicalDocument,
  options: {
    blockId: string;
    text: string;
    authorId: string;
    authorName: string;
    createdAt?: string;
  },
): CanonicalDocument {
  if (!options.text.trim()) {
    return document;
  }

  const createdAt = options.createdAt ?? new Date().toISOString();
  const nextBlocks = document.blocks.map((block) => (
    updateBlockChildren(block, options.blockId, (children) => replaceTextWithTrackedDeletion(children, {
      text: options.text,
      authorId: options.authorId,
      authorName: options.authorName,
      createdAt,
    }))
  ));

  if (JSON.stringify(nextBlocks) === JSON.stringify(document.blocks)) {
    return document;
  }

  return {
    ...document,
    blocks: nextBlocks,
    updatedAt: new Date().toISOString(),
  };
}

export function acceptTrackedChange(document: CanonicalDocument, changeId: string): CanonicalDocument {
  return resolveTrackedChange(document, changeId, "accept");
}

export function rejectTrackedChange(document: CanonicalDocument, changeId: string): CanonicalDocument {
  return resolveTrackedChange(document, changeId, "reject");
}

function replaceInBlock(
  block: CanonicalBlock,
  replaceText: (value: string) => string,
  matcher: RegExp,
  replacementForMatch: (matchedText: string) => string,
  counter: { value: number },
): CanonicalBlock {
  if ("children" in block) {
    return {
      ...block,
      children: replaceInInlines(block.children, replaceText, matcher, replacementForMatch, counter),
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
      caption: block.caption
        ? replaceInInlines(block.caption, replaceText, matcher, replacementForMatch, counter)
        : undefined,
      rows: block.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => ({
          ...cell,
          children: replaceInInlines(cell.children, replaceText, matcher, replacementForMatch, counter),
        })),
      })),
    };
  }

  if (block.type === "figure") {
    return {
      ...block,
      altText: replaceText(block.altText),
      caption: block.caption
        ? replaceInInlines(block.caption, replaceText, matcher, replacementForMatch, counter)
        : undefined,
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
      resolvedBlocks: block.resolvedBlocks?.map((resolvedBlock) => (
        replaceInBlock(resolvedBlock, replaceText, matcher, replacementForMatch, counter)
      )),
    };
  }

  if (block.type === "branch") {
    return {
      ...block,
      branchName: replaceText(block.branchName),
      blocks: block.blocks.map((branchBlock) => (
        replaceInBlock(branchBlock, replaceText, matcher, replacementForMatch, counter)
      )),
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

function replaceInInlines(
  children: CanonicalInline[],
  replaceText: (value: string) => string,
  matcher: RegExp,
  replacementForMatch: (matchedText: string) => string,
  counter: { value: number },
): CanonicalInline[] {
  const joined = children.map(inlineSearchText).join("");
  const matches = [...joined.matchAll(resetRegExp(matcher))].filter((match) => match[0].length > 0);

  if (matches.length > 0) {
    const ranges = inlineRanges(children);
    const nextChildren: CanonicalInline[] = [];
    let cursor = 0;

    for (const match of matches) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      nextChildren.push(...sliceInlineRanges(ranges, cursor, start));
      nextChildren.push({ type: "text", text: replacementForMatch(match[0]) });
      counter.value += 1;
      cursor = end;
    }

    nextChildren.push(...sliceInlineRanges(ranges, cursor, joined.length));
    return mergeAdjacentTextInlines(nextChildren);
  }

  return children.map((child) => {
    if (child.type === "text") {
      return { ...child, text: replaceText(child.text) };
    }

    if (child.type === "math_inline") {
      return { ...child, tex: replaceText(child.tex) };
    }

    if (child.type === "footnote" || child.type === "language_span" || child.type === "comment") {
      return {
        ...child,
        children: replaceInInlines(child.children, replaceText, matcher, replacementForMatch, counter),
      };
    }

    if (child.type === "tracked_insert" || child.type === "tracked_delete") {
      return {
        ...child,
        text: replaceText(child.text),
      };
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

type InlineRange = {
  child: CanonicalInline;
  start: number;
  end: number;
  text: string;
};

function inlineRanges(children: CanonicalInline[]): InlineRange[] {
  let cursor = 0;
  return children.map((child) => {
    const text = inlineSearchText(child);
    const range = {
      child,
      start: cursor,
      end: cursor + text.length,
      text,
    };
    cursor = range.end;
    return range;
  });
}

function sliceInlineRanges(ranges: InlineRange[], start: number, end: number): CanonicalInline[] {
  if (start >= end) {
    return [];
  }

  return ranges.flatMap((range) => {
    const sliceStart = Math.max(start, range.start);
    const sliceEnd = Math.min(end, range.end);
    if (sliceStart >= sliceEnd) {
      return [];
    }

    const relativeStart = sliceStart - range.start;
    const relativeEnd = sliceEnd - range.start;
    if (relativeStart === 0 && relativeEnd === range.text.length) {
      return [range.child];
    }

    return [{ type: "text", text: range.text.slice(relativeStart, relativeEnd) } satisfies CanonicalInline];
  });
}

function inlineSearchText(child: CanonicalInline): string {
  if (child.type === "text") {
    return child.text;
  }

  if (child.type === "math_inline") {
    return child.tex;
  }

  if (child.type === "citation") {
    return `@${child.key}`;
  }

  if (child.type === "reference") {
    return child.target;
  }

  if (child.type === "label" || child.type === "index_entry") {
    return "";
  }

  if (child.type === "glossary_entry") {
    return child.term;
  }

  if (child.type === "nomenclature_entry") {
    return child.symbol;
  }

  if (child.type === "footnote" || child.type === "language_span" || child.type === "comment") {
    return child.children.map(inlineSearchText).join("");
  }

  if (child.type === "tracked_insert" || child.type === "tracked_delete") {
    return child.text;
  }

  return "";
}

function mergeAdjacentTextInlines(children: CanonicalInline[]): CanonicalInline[] {
  return children.reduce<CanonicalInline[]>((merged, child) => {
    const previous = merged.at(-1);
    if (previous?.type === "text" && child.type === "text") {
      previous.text += child.text;
      return merged;
    }

    if (child.type === "text" && child.text.length === 0) {
      return merged;
    }

    merged.push(child);
    return merged;
  }, []);
}

function resetRegExp(regexp: RegExp): RegExp {
  return new RegExp(regexp.source, regexp.flags);
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

function updateBlockChildren(
  block: CanonicalBlock,
  blockId: string,
  updater: (children: CanonicalInline[]) => CanonicalInline[],
): CanonicalBlock {
  if ("children" in block) {
    if (block.id !== blockId) {
      return block;
    }

    return {
      ...block,
      children: mergeAdjacentTextInlines(updater(block.children)),
      reviewState: "needs_review",
    };
  }

  return block;
}

function insertTrackedChange(
  children: CanonicalInline[],
  options: {
    kind: TrackedChangeKind;
    text: string;
    insertAfterText: string;
    authorId: string;
    authorName: string;
    createdAt: string;
  },
): CanonicalInline[] {
  const joined = children.map(inlineSearchText).join("");
  const anchor = options.insertAfterText;
  const insertionIndex = anchor.length === 0 ? joined.length : joined.indexOf(anchor);
  if (insertionIndex < 0) {
    return children;
  }

  const insertAt = anchor.length === 0 ? joined.length : insertionIndex + anchor.length;
  const ranges = inlineRanges(children);
  const trackedInline = createTrackedChangeInline(options.kind, options.text, options.authorId, options.authorName, options.createdAt);
  return mergeAdjacentTextInlines([
    ...sliceInlineRanges(ranges, 0, insertAt),
    trackedInline,
    ...sliceInlineRanges(ranges, insertAt, joined.length),
  ]);
}

function replaceTextWithTrackedDeletion(
  children: CanonicalInline[],
  options: {
    text: string;
    authorId: string;
    authorName: string;
    createdAt: string;
  },
): CanonicalInline[] {
  const joined = children.map(inlineSearchText).join("");
  const start = joined.indexOf(options.text);
  if (start < 0) {
    return children;
  }

  const end = start + options.text.length;
  const ranges = inlineRanges(children);
  return mergeAdjacentTextInlines([
    ...sliceInlineRanges(ranges, 0, start),
    createTrackedChangeInline("tracked_delete", options.text, options.authorId, options.authorName, options.createdAt),
    ...sliceInlineRanges(ranges, end, joined.length),
  ]);
}

function createTrackedChangeInline(
  kind: TrackedChangeKind,
  text: string,
  authorId: string,
  authorName: string,
  createdAt: string,
): CanonicalInline {
  return {
    type: kind,
    id: crypto.randomUUID(),
    authorId,
    authorName,
    createdAt,
    text,
  };
}

function listTrackedChangesInBlock(block: CanonicalBlock): TrackedChangeSummary[] {
  if (!("children" in block)) {
    return [];
  }

  return block.children.flatMap((child) => {
    if (child.type === "tracked_insert" || child.type === "tracked_delete") {
      return [{
        id: child.id,
        kind: child.type,
        blockId: block.id,
        authorId: child.authorId,
        authorName: child.authorName,
        createdAt: child.createdAt,
        text: child.text,
      }];
    }

    if (child.type === "footnote" || child.type === "language_span" || child.type === "comment") {
      return listTrackedChangesInChildren(block.id, child.children);
    }

    return [];
  });
}

function listTrackedChangesInChildren(blockId: string, children: CanonicalInline[]): TrackedChangeSummary[] {
  return children.flatMap((child) => {
    if (child.type === "tracked_insert" || child.type === "tracked_delete") {
      return [{
        id: child.id,
        kind: child.type,
        blockId,
        authorId: child.authorId,
        authorName: child.authorName,
        createdAt: child.createdAt,
        text: child.text,
      }];
    }

    if (child.type === "footnote" || child.type === "language_span" || child.type === "comment") {
      return listTrackedChangesInChildren(blockId, child.children);
    }

    return [];
  });
}

function resolveTrackedChange(
  document: CanonicalDocument,
  changeId: string,
  resolution: "accept" | "reject",
): CanonicalDocument {
  const nextBlocks = document.blocks.map((block) => resolveTrackedChangeInBlock(block, changeId, resolution));
  if (JSON.stringify(nextBlocks) === JSON.stringify(document.blocks)) {
    return document;
  }
  return {
    ...document,
    blocks: nextBlocks,
    updatedAt: new Date().toISOString(),
  };
}

function resolveTrackedChangeInBlock(
  block: CanonicalBlock,
  changeId: string,
  resolution: "accept" | "reject",
): CanonicalBlock {
  if (!("children" in block)) {
    return block;
  }

  return {
    ...block,
    children: mergeAdjacentTextInlines(resolveTrackedChangeInChildren(block.children, changeId, resolution)),
    reviewState: "needs_review",
  };
}

function resolveTrackedChangeInChildren(
  children: CanonicalInline[],
  changeId: string,
  resolution: "accept" | "reject",
): CanonicalInline[] {
  return children.reduce<CanonicalInline[]>((nextChildren, child) => {
    if (child.type === "tracked_insert" && child.id === changeId) {
      if (resolution === "accept") {
        nextChildren.push({ type: "text", text: child.text });
      }
      return nextChildren;
    }

    if (child.type === "tracked_delete" && child.id === changeId) {
      if (resolution !== "accept") {
        nextChildren.push({ type: "text", text: child.text });
      }
      return nextChildren;
    }

    if (child.type === "footnote" || child.type === "language_span" || child.type === "comment") {
      nextChildren.push({
        ...child,
        children: mergeAdjacentTextInlines(resolveTrackedChangeInChildren(child.children, changeId, resolution)),
      });
      return nextChildren;
    }

    nextChildren.push(child);
    return nextChildren;
  }, []);
}

function slugifyReviewAuthor(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "editor";
}
