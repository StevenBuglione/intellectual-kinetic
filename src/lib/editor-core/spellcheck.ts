import { canonicalDocumentToEditorText } from "./plaintext";
import type { CanonicalDocument } from "./types";

export type SpellingIssue = {
  word: string;
  suggestion: string;
  occurrences: number;
  context: string;
};

export type FindSpellingIssuesOptions = {
  acceptedWords?: string[];
};

const spellingCorrections: Record<string, string> = {
  accomodate: "accommodate",
  acheive: "achieve",
  becuase: "because",
  definate: "definite",
  enviroment: "environment",
  goverment: "government",
  langauge: "language",
  ocured: "occurred",
  paralell: "parallel",
  recieve: "receive",
  seperated: "separated",
  teh: "the",
};

const thesaurusEntries: Record<string, string[]> = {
  document: ["manuscript", "text", "record"],
  motion: ["movement", "locomotion", "travel"],
  precise: ["exact", "accurate", "rigorous"],
  restore: ["repair", "recover", "reconstruct"],
  source: ["origin", "reference", "evidence"],
};

export function findSpellingIssues(
  document: CanonicalDocument,
  options?: FindSpellingIssuesOptions,
): SpellingIssue[] {
  const text = canonicalDocumentToEditorText(document);
  const issues = new Map<string, SpellingIssue>();
  const acceptedWords = new Set(options?.acceptedWords?.map((word) => word.toLocaleLowerCase()) ?? []);
  const tokens = [...text.matchAll(/\b[\p{L}']+\b/gu)];

  for (const token of tokens) {
    const word = token[0];
    const normalizedWord = word.toLocaleLowerCase();
    if (acceptedWords.has(normalizedWord)) {
      continue;
    }

    const suggestion = spellingCorrections[normalizedWord];
    if (!suggestion) {
      continue;
    }

    const start = token.index ?? 0;
    const end = start + word.length;
    const contextStart = Math.max(0, start - 18);
    const contextEnd = Math.min(text.length, end + 18);
    const context = text.slice(contextStart, contextEnd).trim();
    const existing = issues.get(normalizedWord);

    if (existing) {
      existing.occurrences += 1;
      continue;
    }

    issues.set(normalizedWord, {
      word: normalizedWord,
      suggestion,
      occurrences: 1,
      context,
    });
  }

  return [...issues.values()];
}

export function lookupThesaurusSuggestions(word: string): string[] {
  const normalizedWord = word.trim().toLocaleLowerCase();
  if (!normalizedWord) {
    return [];
  }

  return thesaurusEntries[normalizedWord] ?? [];
}
