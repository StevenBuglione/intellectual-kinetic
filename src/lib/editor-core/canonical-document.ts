import { z } from "zod";
import type { CanonicalBlock, CanonicalDocument } from "./types";

export const canonicalDocumentSchemaVersion = 1;

const reviewStateSchema = z.enum(["needs_review", "approved", "rejected"]);

const provenanceSchema = z.object({
  sourceRegionId: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

type InlineSchema = z.ZodType<import("./types").CanonicalInline>;

const inlineSchema: InlineSchema = z.lazy(() => z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    text: z.string(),
    marks: z.array(z.enum(["emphasis", "strong", "code"])).optional(),
  }),
  z.object({ type: z.literal("math_inline"), tex: z.string().min(1) }),
  z.object({
    type: z.literal("citation"),
    key: z.string().min(1),
    variant: z.enum(["default", "textual", "parenthetical", "year"]).optional(),
  }),
  z.object({ type: z.literal("reference"), target: z.string().min(1) }),
  z.object({ type: z.literal("label"), target: z.string().min(1) }),
  z.object({
    type: z.literal("footnote"),
    placement: z.enum(["inline", "page_footer"]).optional(),
    children: z.array(inlineSchema),
  }),
  z.object({
    type: z.literal("language_span"),
    language: z.string().min(1),
    children: z.array(inlineSchema),
  }),
  z.object({
    type: z.literal("comment"),
    id: z.string().min(1),
    author: z.string().min(1),
    status: z.enum(["open", "resolved"]),
    children: z.array(inlineSchema),
    comment: z.string().min(1),
  }),
]));

const contentBlockBase = {
  id: z.string().min(1),
  children: z.array(inlineSchema),
  provenance: provenanceSchema.optional(),
  reviewState: reviewStateSchema,
};

const blockSchema = z.discriminatedUnion("type", [
  z.object({
    ...contentBlockBase,
    type: z.literal("paragraph"),
  }),
  z.object({
    ...contentBlockBase,
    type: z.literal("heading"),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
  z.object({
    ...contentBlockBase,
    type: z.literal("theorem"),
    theoremKind: z.enum(["Theorem", "Lemma", "Proposition", "Corollary"]),
    label: z.string().min(1).optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("math_display"),
    tex: z.string().min(1),
    numbered: z.boolean(),
    label: z.string().min(1).optional(),
    provenance: provenanceSchema.optional(),
    reviewState: reviewStateSchema,
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("list"),
    ordered: z.boolean(),
    layout: z.object({
      indentLevel: z.number().int().min(0).max(8).optional(),
      markerStyle: z.enum(["bullet", "dash", "decimal", "lower-alpha"]).optional(),
    }).optional(),
    items: z.array(z.object({
      id: z.string().min(1),
      children: z.array(inlineSchema),
    })).min(1),
    provenance: provenanceSchema.optional(),
    reviewState: reviewStateSchema,
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("table"),
    rows: z.array(z.object({
      id: z.string().min(1),
      cells: z.array(z.object({
        id: z.string().min(1),
        children: z.array(inlineSchema),
        header: z.boolean().optional(),
        align: z.enum(["left", "center", "right"]).optional(),
        colspan: z.number().int().min(1).optional(),
        rowspan: z.number().int().min(1).optional(),
      })).min(1),
    })).min(1),
    caption: z.array(inlineSchema).optional(),
    label: z.string().min(1).optional(),
    layout: z.object({
      columnWidths: z.array(z.number().min(0.05).max(1)).optional(),
      repeatHeader: z.boolean().optional(),
    }).optional(),
    provenance: provenanceSchema.optional(),
    reviewState: reviewStateSchema,
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("figure"),
    altText: z.string(),
    caption: z.array(inlineSchema).optional(),
    label: z.string().min(1).optional(),
    asset: z.object({
      assetId: z.string().min(1),
      kind: z.literal("placeholder"),
      mimeType: z.enum(["image/png", "image/jpeg", "image/svg+xml"]),
      widthRatio: z.number().min(0.1).max(1),
      heightPx: z.number().int().min(24).max(720),
    }).optional(),
    provenance: provenanceSchema.optional(),
    reviewState: reviewStateSchema,
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("page_break"),
    provenance: provenanceSchema.optional(),
    reviewState: reviewStateSchema,
  }),
  z.object({
    ...contentBlockBase,
    type: z.literal("abstract"),
  }),
  z.object({
    ...contentBlockBase,
    type: z.literal("quote"),
    quoteKind: z.enum(["quote", "quotation", "verse"]),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("bibliography"),
    entries: z.array(z.object({
      id: z.string().min(1),
      key: z.string().min(1),
      text: z.string().min(1),
    })).min(1),
    provenance: provenanceSchema.optional(),
    reviewState: reviewStateSchema,
  }),
  z.object({
    ...contentBlockBase,
    type: z.literal("semantic_inset"),
    insetKind: z.enum(["affiliation", "keywords", "email", "custom"]),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("include"),
    includeKind: z.enum(["child_document", "input", "include"]),
    targetDocumentId: z.string().min(1),
    title: z.string().min(1),
    provenance: provenanceSchema.optional(),
    reviewState: reviewStateSchema,
  }),
]);

const canonicalDocumentSchema = z.object({
  schemaVersion: z.literal(canonicalDocumentSchemaVersion),
  id: z.string().min(1),
  title: z.string().min(1),
  updatedAt: z.string().min(1),
  settings: z.object({
    documentClass: z.enum(["book", "article", "report"]),
    language: z.string().min(1),
    encoding: z.literal("utf8"),
    modules: z.array(z.string().min(1)),
    template: z.string().min(1),
    templateFamily: z.enum(["Articles", "Books", "Letters", "Presentations", "Custom"]).optional(),
    enabledModules: z.array(z.string().min(1)).optional(),
    bibliographyEngine: z.enum(["basic", "natbib", "biblatex"]).optional(),
    citationStyle: z.enum(["numeric", "authoryear"]).optional(),
    customPreamble: z.array(z.object({
      id: z.string().min(1),
      kind: z.enum(["package", "macro"]),
      source: z.string().min(1),
      enabled: z.boolean(),
    })).optional(),
  }),
  metadata: z.object({
    projectId: z.string().min(1),
    sourceDocumentId: z.string().min(1),
    reviewState: reviewStateSchema,
  }),
  blocks: z.array(blockSchema).min(1),
});

export function normalizeCanonicalDocument(
  document: CanonicalDocument,
): CanonicalDocument {
  return {
    ...document,
    schemaVersion: canonicalDocumentSchemaVersion,
    title: document.title.trim(),
    updatedAt: document.updatedAt || new Date().toISOString(),
    settings: {
      ...document.settings,
      modules: [...new Set(document.settings.modules)].sort(),
    },
    blocks: document.blocks.map(normalizeBlock),
  };
}

export function validateCanonicalDocument(document: unknown):
  | { ok: true; document: CanonicalDocument }
  | { ok: false; errors: string[] } {
  const parsed = canonicalDocumentSchema.safeParse(document);

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }

  return { ok: true, document: normalizeCanonicalDocument(parsed.data) };
}

function normalizeBlock(block: CanonicalBlock): CanonicalBlock {
  if ("children" in block) {
    return {
      ...block,
      children: block.children.filter((child) => {
        if (child.type === "text") {
          return child.text.length > 0;
        }

        return true;
      }),
    };
  }

  if (block.type === "list") {
    return {
      ...block,
      items: block.items.map((item) => ({
        ...item,
        children: item.children.filter((child) => child.type !== "text" || child.text.length > 0),
      })),
    };
  }

  if (block.type === "table") {
    return {
      ...block,
      rows: block.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => ({
          ...cell,
          children: cell.children.filter((child) => child.type !== "text" || child.text.length > 0),
        })),
      })),
    };
  }

  return block;
}
