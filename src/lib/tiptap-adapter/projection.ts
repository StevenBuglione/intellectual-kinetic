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
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
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

  if (block.type === "abstract") {
    return {
      type: "paragraph",
      attrs: { ...canonicalAttrs, canonicalBlockType: "abstract" },
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
      attrs: { ...canonicalAttrs, ordered: block.ordered, layout: block.layout },
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
            align: cell.align,
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
        asset: block.asset,
      },
      content: [{ type: "paragraph", content: inlineToTiptap(block.caption ?? [{ type: "text", text: block.altText }]) }],
    };
  }

  if (block.type === "quote") {
    return {
      type: "blockquote",
      attrs: { ...canonicalAttrs, canonicalBlockType: "quote", quoteKind: block.quoteKind },
      content: [{ type: "paragraph", content: inlineToTiptap(block.children) }],
    };
  }

  if (block.type === "page_break") {
    return {
      type: "horizontalRule",
      attrs: { ...canonicalAttrs, canonicalBlockType: "page_break" },
    };
  }

  if (block.type === "bibliography") {
    return {
      type: "blockquote",
      attrs: {
        ...canonicalAttrs,
        canonicalBlockType: "bibliography",
        bibliographyEntries: block.entries,
      },
      content: [
        { type: "paragraph", content: [{ type: "text", text: "References" }] },
        ...block.entries.map((entry) => ({
          type: "paragraph",
          content: [{ type: "text", text: `${entry.key} ${entry.text}` }],
        })),
      ],
    };
  }

  if (block.type === "semantic_inset") {
    return {
      type: "blockquote",
      attrs: { ...canonicalAttrs, canonicalBlockType: "semantic_inset", insetKind: block.insetKind },
      content: [{ type: "paragraph", content: inlineToTiptap(block.children) }],
    };
  }

  if (block.type === "include") {
    return {
      type: "blockquote",
      attrs: {
        ...canonicalAttrs,
        canonicalBlockType: "include",
        includeKind: block.includeKind,
        targetDocumentId: block.targetDocumentId,
        title: block.title,
      },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: `Included ${block.includeKind} ${block.title}` }],
        },
      ],
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

  if (child.type === "label") {
    return "";
  }

  if (child.type === "footnote") {
    return `(note: ${child.children.map(inlineToPlainText).join("")})`;
  }

  if (child.type === "language_span") {
    return child.children.map(inlineToPlainText).join("");
  }

  if (child.type === "comment") {
    return `[comment: ${child.children.map(inlineToPlainText).join("")} - ${child.comment}]`;
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
        attrs: {
          citationKey: child.key,
          citationVariant: child.variant ?? "default",
        },
      };
    }

    if (child.type === "label") {
      return {
        type: "text",
        text: "",
        attrs: {
          labelTarget: child.target,
          "data-canonical-kind": "label",
        },
      };
    }

    if (child.type === "footnote") {
      return {
        type: "text",
        text: `(note: ${child.children.map(inlineToPlainText).join("")})`,
        marks: [{ type: "code" }],
        attrs: { placement: child.placement },
      };
    }

    if (child.type === "language_span") {
      return {
        type: "text",
        text: child.children.map(inlineToPlainText).join(""),
      };
    }

    if (child.type === "comment") {
      return {
        type: "text",
        text: `[comment: ${child.children.map(inlineToPlainText).join("")} - ${child.comment}]`,
        marks: [{ type: "code" }],
        attrs: {
          commentId: child.id,
          commentAuthor: child.author,
          commentStatus: child.status,
          commentText: child.comment,
        },
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
        asset: isFigureAsset(node.attrs?.asset) ? node.attrs.asset : undefined,
        caption: tiptapInlineToCanonical(node.content?.flatMap((child) => child.content ?? []) ?? []),
        reviewState,
      };
    }

    if (node.attrs?.canonicalBlockType === "quote") {
      return {
        id,
        type: "quote",
        quoteKind: node.attrs?.quoteKind === "quote" || node.attrs?.quoteKind === "verse" ? node.attrs.quoteKind : "quotation",
        children: tiptapInlineToCanonical(node.content?.flatMap((child) => child.content ?? []) ?? []),
        reviewState,
      };
    }

    if (node.attrs?.canonicalBlockType === "semantic_inset") {
      return {
        id,
        type: "semantic_inset",
        insetKind: isSemanticInsetKind(node.attrs?.insetKind) ? node.attrs.insetKind : "custom",
        children: tiptapInlineToCanonical(node.content?.flatMap((child) => child.content ?? []) ?? []),
        reviewState,
      };
    }

    if (node.attrs?.canonicalBlockType === "include") {
      return {
        id,
        type: "include",
        includeKind: isIncludeKind(node.attrs?.includeKind) ? node.attrs.includeKind : "child_document",
        targetDocumentId: String(node.attrs?.targetDocumentId ?? ""),
        title: String(node.attrs?.title ?? ""),
        reviewState,
      };
    }

    if (node.attrs?.canonicalBlockType === "bibliography") {
      const entries = Array.isArray(node.attrs?.bibliographyEntries) ? node.attrs.bibliographyEntries : [];
      return {
        id,
        type: "bibliography",
        entries: entries.map((entry, index) => ({
          id: String((entry as { id?: unknown }).id ?? `${id}-entry-${index + 1}`),
          key: String((entry as { key?: unknown }).key ?? `entry-${index + 1}`),
          text: String((entry as { text?: unknown }).text ?? ""),
        })),
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
    if (node.attrs?.canonicalBlockType === "abstract") {
      return {
        id,
        type: "abstract",
        children: tiptapInlineToCanonical(node.content ?? []),
        reviewState,
      };
    }

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
      layout: isListLayout(node.attrs?.layout) ? node.attrs.layout : undefined,
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
          align: cell.attrs?.align === "center" || cell.attrs?.align === "right" ? cell.attrs.align : "left",
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

    if (typeof node.attrs?.labelTarget === "string") {
      return {
        type: "label",
        target: node.attrs.labelTarget,
      };
    }

    if (typeof node.attrs?.citationKey === "string") {
      return {
        type: "citation",
        key: node.attrs.citationKey,
        variant: isCitationVariant(node.attrs?.citationVariant) ? node.attrs.citationVariant : "default",
      };
    }

    if (typeof node.attrs?.commentId === "string") {
      return {
        type: "comment",
        id: node.attrs.commentId,
        author: String(node.attrs.commentAuthor ?? "Editor"),
        status: node.attrs.commentStatus === "resolved" ? "resolved" : "open",
        children: [{ type: "text", text: stripCommentWrapper(node.text ?? "") }],
        comment: String(node.attrs.commentText ?? ""),
      };
    }

    if (node.attrs?.placement === "page_footer" && node.text?.startsWith("(note: ")) {
      return {
        type: "footnote",
        placement: "page_footer",
        children: [{ type: "text", text: node.text.replace(/^\(note: /, "").replace(/\)$/, "") }],
      };
    }

    return {
      type: "text",
      text: node.text ?? "",
    };
  });
}

function stripCommentWrapper(value: string): string {
  return value.replace(/^\[comment: /, "").replace(/ - .+\]$/, "");
}

function isListLayout(value: unknown): value is NonNullable<Extract<CanonicalBlock, { type: "list" }>["layout"]> {
  return typeof value === "object" && value !== null;
}

function isFigureAsset(value: unknown): value is NonNullable<Extract<CanonicalBlock, { type: "figure" }>["asset"]> {
  return typeof value === "object" && value !== null && "assetId" in value;
}

function isCitationVariant(value: unknown): value is NonNullable<Extract<CanonicalInline, { type: "citation" }>["variant"]> {
  return value === "default" || value === "textual" || value === "parenthetical" || value === "year";
}

function isSemanticInsetKind(value: unknown): value is Extract<CanonicalBlock, { type: "semantic_inset" }>["insetKind"] {
  return value === "affiliation" || value === "keywords" || value === "email" || value === "custom";
}

function isIncludeKind(value: unknown): value is Extract<CanonicalBlock, { type: "include" }>["includeKind"] {
  return value === "child_document" || value === "input" || value === "include";
}
