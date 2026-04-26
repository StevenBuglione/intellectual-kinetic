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

  return block.children.map(canonicalInlineToEditorText).join("");
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

  return `[[${child.target}]]`;
}
