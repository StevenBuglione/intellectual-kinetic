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

  return {
    type: "paragraph",
    attrs: canonicalAttrs,
    content: inlineToTiptap(block.children),
  };
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
