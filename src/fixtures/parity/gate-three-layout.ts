import type { CanonicalDocument } from "@/lib/editor-core/types";

export const gateThreeLayoutFixture: CanonicalDocument = {
  schemaVersion: 1,
  id: "fixture-gate-three-layout",
  title: "Gate Three Layout Fixture",
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
      id: "gate-three-heading",
      type: "heading",
      level: 1,
      children: [{ type: "text", text: "Layout Stress Coverage" }],
      reviewState: "approved",
    },
    {
      id: "gate-three-annotated-paragraph",
      type: "paragraph",
      children: [
        { type: "text", text: "The restored reading keeps " },
        {
          type: "comment",
          id: "comment-reading",
          author: "Editor",
          status: "open",
          children: [{ type: "text", text: "variant alpha" }],
          comment: "Confirm against source page margin.",
        },
        { type: "text", text: " with a placed note " },
        {
          type: "footnote",
          placement: "page_footer",
          children: [{ type: "text", text: "Placed footnote evidence." }],
        },
        { type: "text", text: "." },
      ],
      reviewState: "needs_review",
    },
    {
      id: "gate-three-list",
      type: "list",
      ordered: true,
      layout: {
        indentLevel: 2,
        markerStyle: "lower-alpha",
      },
      items: [
        { id: "gate-three-list-a", children: [{ type: "text", text: "Preserve nested list intent" }] },
        { id: "gate-three-list-b", children: [{ type: "text", text: "Preserve marker style" }] },
      ],
      reviewState: "needs_review",
    },
    {
      id: "gate-three-table",
      type: "table",
      caption: [{ type: "text", text: "Layout measurements" }],
      label: "tab:layout-measurements",
      layout: {
        columnWidths: [0.25, 0.45, 0.3],
        repeatHeader: true,
      },
      rows: [
        {
          id: "gate-three-table-row-1",
          cells: [
            { id: "gate-three-table-cell-1", header: true, align: "left", children: [{ type: "text", text: "Region" }] },
            { id: "gate-three-table-cell-2", header: true, align: "center", children: [{ type: "text", text: "Observation" }] },
            { id: "gate-three-table-cell-3", header: true, align: "right", children: [{ type: "text", text: "Score" }] },
          ],
        },
        {
          id: "gate-three-table-row-2",
          cells: [
            { id: "gate-three-table-cell-4", align: "left", children: [{ type: "text", text: "Page 1" }] },
            { id: "gate-three-table-cell-5", align: "center", children: [{ type: "text", text: "Aligned table cell" }] },
            { id: "gate-three-table-cell-6", align: "right", children: [{ type: "text", text: "0.99" }] },
          ],
        },
      ],
      reviewState: "approved",
    },
    {
      id: "gate-three-figure",
      type: "figure",
      altText: "Plate A restored source crop",
      caption: [{ type: "text", text: "Asset-backed plate placeholder" }],
      label: "fig:plate-a",
      asset: {
        assetId: "asset-plate-a",
        kind: "placeholder",
        mimeType: "image/png",
        widthRatio: 0.62,
        heightPx: 132,
      },
      reviewState: "needs_review",
    },
    {
      id: "gate-three-page-break",
      type: "page_break",
      reviewState: "approved",
    },
    {
      id: "gate-three-after-break",
      type: "paragraph",
      children: [{ type: "text", text: "Second page layout continuation remains verified." }],
      reviewState: "approved",
    },
  ],
};
