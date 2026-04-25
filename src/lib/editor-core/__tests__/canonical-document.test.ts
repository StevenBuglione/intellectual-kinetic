import { describe, expect, it } from "vitest";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import {
  canonicalDocumentSchemaVersion,
  normalizeCanonicalDocument,
  validateCanonicalDocument,
} from "../canonical-document";

describe("canonical document foundation", () => {
  it("validates the restoration fixture as canonical AST with explicit schema version", () => {
    const result = validateCanonicalDocument(restorationFoundationFixture);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Fixture should validate as canonical AST.");
    }
    expect(result.document.schemaVersion).toBe(canonicalDocumentSchemaVersion);
    expect(result.document.blocks.map((block) => block.id)).toEqual([
      "block-title",
      "block-intro",
      "block-theorem",
      "block-equation",
    ]);
  });

  it("normalizes durable metadata without depending on Tiptap JSON", () => {
    const normalized = normalizeCanonicalDocument({
      ...restorationFoundationFixture,
      title: "  Restoration Foundation Fixture  ",
      updatedAt: "",
    });

    expect(normalized.title).toBe("Restoration Foundation Fixture");
    expect(normalized.updatedAt).toMatch(/T/);
    expect("tiptap" in normalized).toBe(false);
  });
});
