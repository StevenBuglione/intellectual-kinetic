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

function createTrackedChangeNode(name: "tracked_insert" | "tracked_delete", className: string) {
  return Node.create({
    name,
    group: "inline",
    inline: true,
    atom: true,
    selectable: true,
    addAttributes() {
      return {
        changeId: { default: "" },
        authorId: { default: "" },
        authorName: { default: "Editor" },
        createdAt: { default: "" },
        text: { default: "" },
      };
    },
    renderHTML({ HTMLAttributes }) {
      return [
        "span",
        mergeAttributes(HTMLAttributes, {
          class: className,
          "data-change-id": HTMLAttributes.changeId,
          "data-change-author": HTMLAttributes.authorName,
          "data-change-kind": name === "tracked_insert" ? "insert" : "delete",
        }),
        HTMLAttributes.text,
      ];
    },
    renderText({ node }) {
      return String(node.attrs.text ?? "");
    },
  });
}

export const TrackedInsert = createTrackedChangeNode("tracked_insert", "ik-tracked-insert");
export const TrackedDelete = createTrackedChangeNode("tracked_delete", "ik-tracked-delete");
