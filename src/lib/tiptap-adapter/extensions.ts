import { Extension, Node, mergeAttributes } from "@tiptap/core";

export const CanonicalDocumentAttributes = Extension.create({
  name: "canonicalDocumentAttributes",
  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "blockquote",
          "codeBlock",
          "bulletList",
          "orderedList",
          "listItem",
          "table",
          "tableRow",
          "tableCell",
          "tableHeader",
          "horizontalRule",
        ],
        attributes: Object.fromEntries(
          [
            "canonicalId",
            "data-canonical-id",
            "reviewState",
            "sourceRegionId",
            "canonicalBlockType",
            "theoremKind",
            "label",
            "language",
            "numbered",
            "ordered",
            "layout",
            "canonicalItemId",
            "canonicalRowId",
            "canonicalCellId",
            "align",
            "colspan",
            "rowspan",
            "captionText",
            "altText",
            "asset",
            "quoteKind",
            "bibliographyEntries",
            "insetKind",
            "includeKind",
            "targetDocumentId",
            "title",
            "exportMode",
            "resolvedBlocks",
            "frontMatterKind",
            "branchId",
            "branchName",
            "branchBlocks",
            "listKind",
            "entries",
          ].map((name) => [name, { default: null }]),
        ),
      },
    ];
  },
});

export const MathInline = Node.create({
  name: "math_inline",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      tex: { default: "" },
      "data-canonical-kind": { default: "math_inline" },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: "ik-math-inline" }),
      HTMLAttributes.tex,
    ];
  },
});
