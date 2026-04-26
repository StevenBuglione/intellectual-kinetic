import type {
  CanonicalBlock,
  CanonicalDocument,
  CanonicalInline,
  CanonicalPatch,
} from "@/lib/editor-core/types";

export type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: Array<{ type: string }>;
  content?: TiptapNode[];
};

export function canonicalToTiptapDocument(document: CanonicalDocument): TiptapNode {
  return {
    type: "doc",
    content: document.blocks.map(blockToTiptapNode),
  };
}

export function tiptapDocumentToCanonicalPatch(document: TiptapNode): CanonicalPatch {
  const blocks = (document.content ?? [])
    .map(tiptapNodeToBlock)
    .filter((block): block is CanonicalBlock => Boolean(block));

  return {
    source: "tiptap-adapter",
    blocks,
  };
}

function blockToTiptapNode(block: CanonicalBlock): TiptapNode {
  const canonicalAttrs = {
    canonicalId: block.id,
    "data-canonical-id": block.id,
    reviewState: block.reviewState,
    sourceRegionId: block.provenance?.sourceRegionId,
  };

  if (block.type === "heading") {
    return {
      type: "heading",
      attrs: { ...canonicalAttrs, level: block.level },
      content: inlineToTiptap(block.children),
    };
  }

  if (block.type === "theorem") {
    return {
      type: "blockquote",
      attrs: { ...canonicalAttrs, theoremKind: block.theoremKind, label: block.label },
      content: [{ type: "paragraph", content: inlineToTiptap(block.children) }],
    };
  }

  if (block.type === "math_display") {
    return {
      type: "codeBlock",
      attrs: { ...canonicalAttrs, language: "latex", label: block.label, numbered: block.numbered },
      content: [{ type: "text", text: block.tex }],
    };
  }

  if (block.type === "list") {
    return {
      type: block.ordered ? "orderedList" : "bulletList",
      attrs: { ...canonicalAttrs, ordered: block.ordered },
      content: block.items.map((item) => ({
        type: "listItem",
        attrs: { canonicalItemId: item.id },
        content: [{ type: "paragraph", content: inlineToTiptap(item.children) }],
      })),
    };
  }

  if (block.type === "table") {
    return {
      type: "table",
      attrs: {
        ...canonicalAttrs,
        label: block.label,
        captionText: block.caption?.map(inlineToPlainText).join(""),
      },
      content: block.rows.map((row) => ({
        type: "tableRow",
        attrs: { canonicalRowId: row.id },
        content: row.cells.map((cell) => ({
          type: cell.header ? "tableHeader" : "tableCell",
          attrs: {
            canonicalCellId: cell.id,
            colspan: cell.colspan,
            rowspan: cell.rowspan,
          },
          content: [{ type: "paragraph", content: inlineToTiptap(cell.children) }],
        })),
      })),
    };
  }

  if (block.type === "figure") {
    return {
      type: "blockquote",
      attrs: {
        ...canonicalAttrs,
        canonicalBlockType: "figure",
        altText: block.altText,
        label: block.label,
      },
      content: [{ type: "paragraph", content: inlineToTiptap(block.caption ?? [{ type: "text", text: block.altText }]) }],
    };
  }

  if (block.type === "page_break") {
    return {
      type: "horizontalRule",
      attrs: { ...canonicalAttrs, canonicalBlockType: "page_break" },
    };
  }

  return {
    type: "paragraph",
    attrs: canonicalAttrs,
    content: inlineToTiptap(block.children),
  };
}

function inlineToPlainText(child: CanonicalInline): string {
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

function inlineToTiptap(children: CanonicalInline[]): TiptapNode[] {
  return children.map((child) => {
    if (child.type === "text") {
      return {
        type: "text",
        text: child.text,
        marks: child.marks?.map((mark) => ({ type: mark })),
      };
    }

    if (child.type === "math_inline") {
      return {
        type: "math_inline",
        attrs: { tex: child.tex, "data-canonical-kind": "math_inline" },
      };
    }

    if (child.type === "citation") {
      return {
        type: "text",
        text: `@${child.key}`,
        marks: [{ type: "code" }],
      };
    }

    return {
      type: "text",
      text: `[[${child.target}]]`,
      marks: [{ type: "code" }],
    };
  });
}

function tiptapNodeToBlock(node: TiptapNode): CanonicalBlock | null {
  const id = String(node.attrs?.canonicalId ?? node.attrs?.["data-canonical-id"] ?? crypto.randomUUID());
  const reviewState = node.attrs?.reviewState === "approved" ? "approved" : "needs_review";

  if (node.type === "heading") {
    return {
      id,
      type: "heading",
      level: node.attrs?.level === 2 || node.attrs?.level === 3 ? node.attrs.level : 1,
      children: tiptapInlineToCanonical(node.content ?? []),
      reviewState,
    };
  }

  if (node.type === "codeBlock") {
    return {
      id,
      type: "math_display",
      tex: node.content?.map((child) => child.text ?? "").join("") ?? "",
      numbered: Boolean(node.attrs?.numbered),
      label: typeof node.attrs?.label === "string" ? node.attrs.label : undefined,
      reviewState,
    };
  }

  if (node.type === "blockquote") {
    if (node.attrs?.canonicalBlockType === "figure") {
      return {
        id,
        type: "figure",
        altText: String(node.attrs?.altText ?? ""),
        label: typeof node.attrs?.label === "string" ? node.attrs.label : undefined,
        caption: tiptapInlineToCanonical(node.content?.flatMap((child) => child.content ?? []) ?? []),
        reviewState,
      };
    }

    return {
      id,
      type: "theorem",
      theoremKind: "Theorem",
      label: typeof node.attrs?.label === "string" ? node.attrs.label : undefined,
      children: tiptapInlineToCanonical(node.content?.flatMap((child) => child.content ?? []) ?? []),
      reviewState,
    };
  }

  if (node.type === "paragraph") {
    return {
      id,
      type: "paragraph",
      children: tiptapInlineToCanonical(node.content ?? []),
      reviewState,
    };
  }

  if (node.type === "bulletList" || node.type === "orderedList") {
    return {
      id,
      type: "list",
      ordered: node.type === "orderedList",
      items: (node.content ?? []).map((item, index) => ({
        id: String(item.attrs?.canonicalItemId ?? `${id}-item-${index + 1}`),
        children: tiptapInlineToCanonical(item.content?.flatMap((child) => child.content ?? []) ?? []),
      })),
      reviewState,
    };
  }

  if (node.type === "table") {
    return {
      id,
      type: "table",
      label: typeof node.attrs?.label === "string" ? node.attrs.label : undefined,
      caption: typeof node.attrs?.captionText === "string"
        ? [{ type: "text", text: node.attrs.captionText }]
        : undefined,
      rows: (node.content ?? []).map((row, rowIndex) => ({
        id: String(row.attrs?.canonicalRowId ?? `${id}-row-${rowIndex + 1}`),
        cells: (row.content ?? []).map((cell, cellIndex) => ({
          id: String(cell.attrs?.canonicalCellId ?? `${id}-cell-${rowIndex + 1}-${cellIndex + 1}`),
          header: cell.type === "tableHeader",
          colspan: typeof cell.attrs?.colspan === "number" ? cell.attrs.colspan : undefined,
          rowspan: typeof cell.attrs?.rowspan === "number" ? cell.attrs.rowspan : undefined,
          children: tiptapInlineToCanonical(cell.content?.flatMap((child) => child.content ?? []) ?? []),
        })),
      })),
      reviewState,
    };
  }

  if (node.type === "horizontalRule" && node.attrs?.canonicalBlockType === "page_break") {
    return {
      id,
      type: "page_break",
      reviewState,
    };
  }

  return null;
}

function tiptapInlineToCanonical(nodes: TiptapNode[]): CanonicalInline[] {
  return nodes.map((node): CanonicalInline => {
    if (node.type === "math_inline") {
      return { type: "math_inline", tex: String(node.attrs?.tex ?? "") };
    }

    return {
      type: "text",
      text: node.text ?? "",
    };
  });
}
