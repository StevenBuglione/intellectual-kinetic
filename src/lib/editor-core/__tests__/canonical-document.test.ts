import { describe, expect, it } from "vitest";
import { gateFiveLyxBreadthFixture } from "@/fixtures/parity/gate-five-lyx-breadth";
import { gateFourLyxCoreFixture } from "@/fixtures/parity/gate-four-lyx-core";
import { gateThreeLayoutFixture } from "@/fixtures/parity/gate-three-layout";
import { gateTwoScholarlyFixture } from "@/fixtures/parity/gate-two-scholarly";
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

  it("validates persisted document workspace tabs as canonical metadata", () => {
    const result = validateCanonicalDocument({
      ...restorationFoundationFixture,
      metadata: {
        ...restorationFoundationFixture.metadata,
        workspace: {
          activeDocumentTabId: "tab-2",
          documentTabs: [
            {
              id: "tab-1",
              label: "Tab 1",
              blocks: restorationFoundationFixture.blocks,
            },
            {
              id: "tab-2",
              label: "Tab 2",
              blocks: [
                {
                  id: "tab-2-title",
                  type: "heading",
                  level: 1,
                  children: [{ type: "text", text: "Persisted tab" }],
                  reviewState: "needs_review",
                },
              ],
            },
          ],
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }
    expect(result.document.metadata.workspace?.activeDocumentTabId).toBe("tab-2");
    expect(result.document.metadata.workspace?.documentTabs).toHaveLength(2);
  });

  it("validates Gate 1 list, table, figure, and page-break structures", () => {
    const result = validateCanonicalDocument({
      ...restorationFoundationFixture,
      blocks: [
        ...restorationFoundationFixture.blocks,
        {
          id: "block-list",
          type: "list",
          ordered: false,
          items: [
            { id: "item-1", children: [{ type: "text", text: "Recover tables" }] },
            { id: "item-2", children: [{ type: "text", text: "Verify rendered pages" }] },
          ],
          reviewState: "needs_review",
        },
        {
          id: "block-table",
          type: "table",
          caption: [{ type: "text", text: "Restoration checks" }],
          label: "tab:checks",
          rows: [
            {
              id: "row-1",
              cells: [
                { id: "cell-1", children: [{ type: "text", text: "Check" }], header: true },
                { id: "cell-2", children: [{ type: "text", text: "Status" }], header: true },
              ],
            },
            {
              id: "row-2",
              cells: [
                { id: "cell-3", children: [{ type: "text", text: "PDF image" }] },
                { id: "cell-4", children: [{ type: "text", text: "Verified" }] },
              ],
            },
          ],
          reviewState: "approved",
        },
        {
          id: "block-figure",
          type: "figure",
          altText: "Placeholder source scan",
          caption: [{ type: "text", text: "Source scan placeholder" }],
          label: "fig:scan",
          reviewState: "needs_review",
        },
        {
          id: "block-break",
          type: "page_break",
          reviewState: "approved",
        },
      ],
    });

    expect(result.ok).toBe(true);
  });

  it("validates Gate 2 scholarly blocks and inline structures", () => {
    const result = validateCanonicalDocument(gateTwoScholarlyFixture);

    expect(result.ok).toBe(true);
  });

  it("validates Gate 3 layout, asset, comment, and placement metadata", () => {
    const result = validateCanonicalDocument(gateThreeLayoutFixture);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }
    expect(JSON.stringify(result.document)).toContain("asset-plate-a");
    expect(JSON.stringify(result.document)).toContain("comment-reading");
    expect(JSON.stringify(result.document)).toContain("lower-alpha");
    expect(JSON.stringify(result.document)).toContain("page_footer");
  });

  it("validates Gate 4 LyX document settings, labels, citations, includes, and semantic insets", () => {
    const result = validateCanonicalDocument(gateFourLyxCoreFixture);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }
    expect(result.document.settings.templateFamily).toBe("Articles");
    expect(result.document.settings.bibliographyEngine).toBe("biblatex");
    expect(JSON.stringify(result.document)).toContain("semantic_inset");
    expect(JSON.stringify(result.document)).toContain("child_document");
    expect(JSON.stringify(result.document)).toContain("sec:lyx-core");
    expect(JSON.stringify(result.document)).toContain("textual");
  });

  it("validates Gate 5 LyX breadth features and recursive master-document expansion", () => {
    const result = validateCanonicalDocument(gateFiveLyxBreadthFixture);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }
    expect(result.document.settings.languagePackage).toBe("babel");
    expect(result.document.settings.secondaryLanguages).toEqual(["he", "ja"]);
    expect(JSON.stringify(result.document)).toContain("front_matter");
    expect(JSON.stringify(result.document)).toContain("generated_list");
    expect(JSON.stringify(result.document)).toContain("critical-apparatus");
    expect(JSON.stringify(result.document)).toContain("longtable");
    expect(JSON.stringify(result.document)).toContain("asset-embedded-evidence");
    expect(JSON.stringify(result.document)).toContain("Child document expanded into master export.");
  });
});
