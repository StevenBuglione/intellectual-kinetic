import "server-only";

import { Pool } from "pg";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import {
  normalizeCanonicalDocument,
  validateCanonicalDocument,
} from "@/lib/editor-core/canonical-document";
import type { CanonicalDocument } from "@/lib/editor-core/types";
import { serializeCanonicalDocumentToLatex } from "@/lib/latex/serializer";
import { canonicalToTiptapDocument } from "@/lib/tiptap-adapter/projection";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function getPool() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  return pool;
}

export async function getDefaultCanonicalDocument(): Promise<CanonicalDocument> {
  const database = getPool();

  if (!database) {
    return normalizeCanonicalDocument(restorationFoundationFixture);
  }

  await ensureSchema(database);

  const existing = await database.query<{
    canonical_ast: CanonicalDocument;
  }>("select canonical_ast from documents where id = $1", [restorationFoundationFixture.id]);

  if (existing.rowCount) {
    const validation = validateCanonicalDocument(existing.rows[0].canonical_ast);
    if (validation.ok) {
      return validation.document;
    }
  }

  await saveCanonicalDocument(restorationFoundationFixture);
  return normalizeCanonicalDocument(restorationFoundationFixture);
}

export async function saveCanonicalDocument(
  document: CanonicalDocument,
): Promise<CanonicalDocument> {
  const normalized = normalizeCanonicalDocument({
    ...document,
    updatedAt: new Date().toISOString(),
  });

  const validation = validateCanonicalDocument(normalized);
  if (!validation.ok) {
    throw new Error(`Invalid canonical document: ${validation.errors.join(", ")}`);
  }

  const database = getPool();
  if (!database) {
    return validation.document;
  }

  await ensureSchema(database);
  const latex = serializeCanonicalDocumentToLatex(validation.document);
  const tiptapSnapshot = canonicalToTiptapDocument(validation.document);

  await database.query(
    `
      insert into documents (
        id,
        title,
        schema_version,
        canonical_ast,
        tiptap_snapshot,
        latex_source,
        diagnostics,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, now())
      on conflict (id) do update set
        title = excluded.title,
        schema_version = excluded.schema_version,
        canonical_ast = excluded.canonical_ast,
        tiptap_snapshot = excluded.tiptap_snapshot,
        latex_source = excluded.latex_source,
        diagnostics = excluded.diagnostics,
        updated_at = now()
    `,
    [
      validation.document.id,
      validation.document.title,
      validation.document.schemaVersion,
      JSON.stringify(validation.document),
      JSON.stringify(tiptapSnapshot),
      latex.source,
      JSON.stringify(latex.diagnostics),
    ],
  );

  return validation.document;
}

async function ensureSchema(database: Pool) {
  schemaReady ??= database
    .query(`
      create table if not exists documents (
        id text primary key,
        title text not null,
        schema_version integer not null,
        canonical_ast jsonb not null,
        tiptap_snapshot jsonb,
        latex_source text,
        diagnostics jsonb not null default '[]'::jsonb,
        updated_at timestamptz not null default now()
      )
    `)
    .then(() => undefined);

  await schemaReady;
}
