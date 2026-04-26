import type { CanonicalBlock, CanonicalDocument, CanonicalInline } from "./types";

export type TextParityComparison = {
  verified: boolean;
  expectedText: string;
  actualText: string;
};

export function canonicalDocumentToEditorText(document: CanonicalDocument): string {
  return document.blocks.map(canonicalBlockToEditorText).filter(Boolean).join(" ");
}

export function compareCanonicalDocumentToPdfText(
  document: CanonicalDocument,
  extractedText: string | undefined,
): TextParityComparison {
  const expectedText = normalizeComparableDocumentText(canonicalDocumentToEditorText(document));
  const actualText = normalizeComparableDocumentText(extractedText ?? "");

  return {
    verified: expectedText.length > 0 && actualText === expectedText,
    expectedText,
    actualText,
  };
}

export function normalizeComparableDocumentText(value: string): string {
  return value.replace(/\f/g, " ").replace(/\s+/g, " ").trim();
}

function canonicalBlockToEditorText(block: CanonicalBlock): string {
  if (block.type === "math_display") {
    return block.tex;
  }

  if (block.type === "list") {
    return block.items.map((item, index) => {
      const marker = listMarker(block, index);
      return `${marker}${item.children.map(canonicalInlineToEditorText).join("")}`;
    }).join(" ");
  }

  if (block.type === "table") {
    return [
      block.caption?.map(canonicalInlineToEditorText).join("") ?? "",
      ...block.rows.flatMap((row) => row.cells.map((cell) => cell.children.map(canonicalInlineToEditorText).join(""))),
    ].filter(Boolean).join(" ");
  }

  if (block.type === "figure") {
    return [block.altText, block.caption?.map(canonicalInlineToEditorText).join("") ?? ""].filter(Boolean).join(" ");
  }

  if (block.type === "page_break") {
    return "";
  }

  if (block.type === "bibliography") {
    return ["References", ...block.entries.map((entry) => `${entry.key} ${entry.text}`)].join(" ");
  }

  if (block.type === "abstract") {
    return `Abstract ${block.children.map(canonicalInlineToEditorText).join("")}`;
  }

  return block.children.map(canonicalInlineToEditorText).join("");
}

function listMarker(block: Extract<CanonicalBlock, { type: "list" }>, index: number): string {
  if (!block.ordered) {
    return block.layout?.markerStyle === "dash" ? "- " : "• ";
  }

  if (block.layout?.markerStyle === "lower-alpha") {
    return `${String.fromCharCode(97 + index)}. `;
  }

  return `${index + 1}. `;
}

function canonicalInlineToEditorText(child: CanonicalInline): string {
  if (child.type === "text") {
    return child.text;
  }

  if (child.type === "math_inline") {
    return child.tex;
  }

  if (child.type === "citation") {
    return `@${child.key}`;
  }

  if (child.type === "footnote") {
    return `(note: ${child.children.map(canonicalInlineToEditorText).join("")})`;
  }

  if (child.type === "language_span") {
    return child.children.map(canonicalInlineToEditorText).join("");
  }

  if (child.type === "comment") {
    return `[comment: ${child.children.map(canonicalInlineToEditorText).join("")} - ${child.comment}]`;
  }

  return `[[${child.target}]]`;
}
