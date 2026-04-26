import type { CanonicalDocument } from "@/lib/editor-core/types";

export const gateOneStructureFixture: CanonicalDocument = {
  schemaVersion: 1,
  id: "fixture-gate-one-structure",
  title: "Gate One Structure Fixture",
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
      id: "gate-heading",
      type: "heading",
      level: 1,
      children: [{ type: "text", text: "Gate One Coverage" }],
      reviewState: "approved",
    },
    {
      id: "gate-intro",
      type: "paragraph",
      children: [
        { type: "text", text: "This page references " },
        { type: "reference", target: "fig:source-scan" },
        { type: "text", text: " and " },
        { type: "reference", target: "tab:checks" },
        { type: "text", text: "." },
      ],
      reviewState: "needs_review",
    },
    {
      id: "gate-list",
      type: "list",
      ordered: false,
      items: [
        { id: "gate-list-item-1", children: [{ type: "text", text: "Recover list semantics" }] },
        { id: "gate-list-item-2", children: [{ type: "text", text: "Verify rendered PDF pages" }] },
      ],
      reviewState: "needs_review",
    },
    {
      id: "gate-table",
      type: "table",
      caption: [{ type: "text", text: "Restoration checks" }],
      label: "tab:checks",
      rows: [
        {
          id: "gate-table-row-1",
          cells: [
            { id: "gate-table-cell-1", header: true, children: [{ type: "text", text: "Check" }] },
            { id: "gate-table-cell-2", header: true, children: [{ type: "text", text: "Status" }] },
          ],
        },
        {
          id: "gate-table-row-2",
          cells: [
            { id: "gate-table-cell-3", children: [{ type: "text", text: "PDF image" }] },
            { id: "gate-table-cell-4", children: [{ type: "text", text: "Verified" }] },
          ],
        },
      ],
      reviewState: "approved",
    },
    {
      id: "gate-figure",
      type: "figure",
      altText: "Source scan placeholder",
      caption: [{ type: "text", text: "Source scan placeholder" }],
      label: "fig:source-scan",
      reviewState: "needs_review",
    },
    {
      id: "gate-page-break",
      type: "page_break",
      reviewState: "approved",
    },
    {
      id: "gate-after-break",
      type: "paragraph",
      children: [{ type: "text", text: "Second page content remains in the canonical AST." }],
      reviewState: "approved",
    },
  ],
};
