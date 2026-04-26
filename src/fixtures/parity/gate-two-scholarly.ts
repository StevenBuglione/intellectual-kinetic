import type { CanonicalDocument } from "@/lib/editor-core/types";

export const gateTwoScholarlyFixture: CanonicalDocument = {
  schemaVersion: 1,
  id: "fixture-gate-two-scholarly",
  title: "Gate Two Scholarly Fixture",
  updatedAt: "2026-04-25T00:00:00.000Z",
  settings: {
    documentClass: "article",
    language: "en",
    encoding: "utf8",
    modules: ["amsmath", "graphicx"],
    template: "restoration-default",
  },
  metadata: {
    projectId: "fixture-project",
    sourceDocumentId: "fixture-source",
    reviewState: "needs_review",
  },
  blocks: [
    {
      id: "gate-two-heading",
      type: "heading",
      level: 1,
      children: [{ type: "text", text: "Scholarly Coverage" }],
      reviewState: "approved",
    },
    {
      id: "gate-two-abstract",
      type: "abstract",
      children: [
        { type: "text", text: "This abstract includes a restored note " },
        { type: "footnote", children: [{ type: "text", text: "marginal restoration note" }] },
        { type: "text", text: "." },
      ],
      reviewState: "needs_review",
    },
    {
      id: "gate-two-quote",
      type: "quote",
      quoteKind: "quotation",
      children: [
        { type: "text", text: "Ars longa, vita brevis, " },
        {
          type: "language_span",
          language: "la",
          children: [{ type: "text", text: "tempus fugit" }],
        },
        { type: "text", text: "." },
      ],
      reviewState: "approved",
    },
    {
      id: "gate-two-citation",
      type: "paragraph",
      children: [
        { type: "text", text: "The edited apparatus cites " },
        { type: "citation", key: "doe2026" },
        { type: "text", text: " for traceability." },
      ],
      reviewState: "needs_review",
    },
    {
      id: "gate-two-bibliography",
      type: "bibliography",
      entries: [
        {
          id: "bib-doe2026",
          key: "doe2026",
          text: "Doe, Jane. Restoration Methods. 2026.",
        },
      ],
      reviewState: "approved",
    },
  ],
};
