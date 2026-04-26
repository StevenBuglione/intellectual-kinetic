import { describe, expect, it } from "vitest";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import type { CanonicalDocument } from "../types";
import { findSpellingIssues, lookupThesaurusSuggestions } from "../spellcheck";

describe("spellcheck", () => {
  it("finds known misspellings in canonical document text", () => {
    const misspelledDocument: CanonicalDocument = {
      ...restorationFoundationFixture,
      blocks: restorationFoundationFixture.blocks.map((block, index) => {
        if (index !== 1 || block.type !== "paragraph") {
          return block;
        }

        return {
          ...block,
          children: [{ type: "text" as const, text: "Teh langauge stays paralell to the source." }],
        };
      }),
    };

    expect(findSpellingIssues(misspelledDocument)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ word: "teh", suggestion: "the", occurrences: 1 }),
        expect.objectContaining({ word: "langauge", suggestion: "language", occurrences: 1 }),
        expect.objectContaining({ word: "paralell", suggestion: "parallel", occurrences: 1 }),
      ]),
    );
  });

  it("skips words accepted into the local dictionary", () => {
    const misspelledDocument: CanonicalDocument = {
      ...restorationFoundationFixture,
      blocks: restorationFoundationFixture.blocks.map((block, index) => {
        if (index !== 1 || block.type !== "paragraph") {
          return block;
        }

        return {
          ...block,
          children: [{ type: "text" as const, text: "Teh langauge stays paralell to the source." }],
        };
      }),
    };

    const issues = findSpellingIssues(misspelledDocument, { acceptedWords: ["teh", "langauge"] });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ word: "paralell", suggestion: "parallel", occurrences: 1 }),
      ]),
    );
    expect(issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ word: "teh" }),
        expect.objectContaining({ word: "langauge" }),
      ]),
    );
  });

  it("returns curated thesaurus suggestions for supported lookup words", () => {
    expect(lookupThesaurusSuggestions("motion")).toEqual(["movement", "locomotion", "travel"]);
    expect(lookupThesaurusSuggestions("unknown")).toEqual([]);
  });
});
