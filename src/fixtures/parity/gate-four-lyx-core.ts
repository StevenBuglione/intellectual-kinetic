import type { CanonicalDocument } from "@/lib/editor-core/types";

export const gateFourLyxCoreFixture: CanonicalDocument = {
  schemaVersion: 1,
  id: "fixture-gate-four-lyx-core",
  title: "Gate Four LyX Core Fixture",
  updatedAt: "2026-04-25T00:00:00.000Z",
  settings: {
    documentClass: "article",
    language: "en",
    encoding: "utf8",
    modules: ["amsmath", "graphicx"],
    template: "article-journal",
    templateFamily: "Articles",
    enabledModules: ["theorems-ams", "custom-insets"],
    bibliographyEngine: "biblatex",
    citationStyle: "authoryear",
    customPreamble: [
      {
        id: "preamble-microtype",
        kind: "package",
        source: "\\usepackage{microtype}",
        enabled: true,
      },
    ],
  },
  metadata: {
    projectId: "fixture-project",
    sourceDocumentId: "fixture-source",
    reviewState: "needs_review",
  },
  blocks: [
    {
      id: "gate-four-heading",
      type: "heading",
      level: 1,
      children: [
        { type: "text", text: "LyX Core Coverage" },
        { type: "label", target: "sec:lyx-core" },
      ],
      reviewState: "approved",
    },
    {
      id: "gate-four-affiliation",
      type: "semantic_inset",
      insetKind: "affiliation",
      children: [{ type: "text", text: "Institute for Deterministic Restoration" }],
      reviewState: "approved",
    },
    {
      id: "gate-four-citation",
      type: "paragraph",
      children: [
        { type: "text", text: "A textual citation " },
        { type: "citation", key: "lyx2026", variant: "textual" },
        { type: "text", text: " keeps engine intent while a year citation " },
        { type: "citation", key: "knuth1984", variant: "year" },
        { type: "text", text: " keeps command intent." },
      ],
      reviewState: "needs_review",
    },
    {
      id: "gate-four-include",
      type: "include",
      includeKind: "child_document",
      targetDocumentId: "appendix-a",
      title: "Appendix A",
      reviewState: "needs_review",
    },
    {
      id: "gate-four-keywords",
      type: "semantic_inset",
      insetKind: "keywords",
      children: [{ type: "text", text: "restoration; LyX parity; deterministic export" }],
      reviewState: "approved",
    },
  ],
};
