import { z } from "zod";
import type { CanonicalBlock, CanonicalDocument } from "./types";

export const canonicalDocumentSchemaVersion = 1;

const reviewStateSchema = z.enum(["needs_review", "approved", "rejected"]);

const provenanceSchema = z.object({
  sourceRegionId: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

const inlineSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    text: z.string(),
    marks: z.array(z.enum(["emphasis", "strong", "code"])).optional(),
  }),
  z.object({ type: z.literal("math_inline"), tex: z.string().min(1) }),
  z.object({ type: z.literal("citation"), key: z.string().min(1) }),
  z.object({ type: z.literal("reference"), target: z.string().min(1) }),
]);

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

  return block;
}
