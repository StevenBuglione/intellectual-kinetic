import type { CanonicalDocument } from "@/lib/editor-core/types";

export const restorationFoundationFixture: CanonicalDocument = {
  schemaVersion: 1,
  id: "fixture-restoration-foundation",
  title: "Restoration Foundation Fixture",
  updatedAt: "2026-04-25T00:00:00.000Z",
  settings: {
    documentClass: "book",
    language: "en",
    encoding: "utf8",
    modules: ["amsmath", "amsthm", "graphicx"],
    template: "restoration-default",
  },
  metadata: {
    projectId: "fixture-project",
    sourceDocumentId: "fixture-source",
    reviewState: "needs_review",
  },
  blocks: [
    {
      id: "block-title",
      type: "heading",
      level: 1,
      children: [{ type: "text", text: "A Treatise on Motion" }],
      provenance: { sourceRegionId: "region-title", confidence: 0.98 },
      reviewState: "approved",
    },
    {
      id: "block-intro",
      type: "paragraph",
      children: [
        { type: "text", text: "Let " },
        { type: "math_inline", tex: "v" },
        { type: "text", text: " denote velocity and cite " },
        { type: "citation", key: "newton1687" },
        { type: "text", text: "." },
      ],
      provenance: { sourceRegionId: "region-intro", confidence: 0.91 },
      reviewState: "needs_review",
    },
    {
      id: "block-theorem",
      type: "theorem",
      theoremKind: "Theorem",
      label: "thm:motion",
      children: [{ type: "text", text: "Uniform motion preserves proportional distance." }],
      provenance: { sourceRegionId: "region-theorem", confidence: 0.87 },
      reviewState: "needs_review",
    },
    {
      id: "block-equation",
      type: "math_display",
      tex: "s = vt",
      numbered: true,
      label: "eq:distance",
      provenance: { sourceRegionId: "region-equation", confidence: 0.94 },
      reviewState: "approved",
    },
  ],
};
