import type { CanonicalBlock, CanonicalDocument } from "@/lib/editor-core/types";

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
  ) {
    return true;
  }

  if (block.type === "table" && (block.layout?.booktabs || block.layout?.tableKind === "longtable")) {
    return true;
  }

  if (block.type === "figure" && block.asset?.kind === "embedded") {
    return true;
  }

  return false;
}
