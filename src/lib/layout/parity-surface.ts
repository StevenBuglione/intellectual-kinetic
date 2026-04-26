import type { CanonicalBlock, CanonicalDocument, CanonicalInline } from "@/lib/editor-core/types";

export type EditorParitySurface = "browser-editor" | "tex-derived";

export function resolveEditorParitySurface(document: CanonicalDocument): EditorParitySurface {
  if (document.blocks.some(blockRequiresTexDerivedSurface)) {
    return "tex-derived";
  }

  return "browser-editor";
}

export function documentUsesTexDerivedEditorSurface(document: CanonicalDocument): boolean {
  return resolveEditorParitySurface(document) === "tex-derived";
}

function blockRequiresTexDerivedSurface(block: CanonicalBlock): boolean {
  if (
    block.type === "front_matter"
    || block.type === "generated_list"
    || block.type === "branch"
    || block.type === "semantic_inset"
    || block.type === "include"
    || block.type === "list"
    || block.type === "table"
    || block.type === "figure"
    || block.type === "page_break"
    || block.type === "abstract"
    || block.type === "quote"
    || block.type === "bibliography"
  ) {
    return true;
  }

  if ("children" in block && block.children.some(inlineRequiresTexDerivedSurface)) {
    return true;
  }

  return false;
}

function inlineRequiresTexDerivedSurface(inline: CanonicalInline): boolean {
  if (
    inline.type === "comment"
    || inline.type === "footnote"
    || inline.type === "language_span"
  ) {
    return true;
  }

  return false;
}
