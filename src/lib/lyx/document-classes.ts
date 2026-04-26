import documentClassesJson from "./document-classes.json";

export const LYX_DOCUMENT_CLASS_CATEGORIES = [
  "Articles",
  "Books",
  "Curricula Vitae",
  "Handouts",
  "Letters",
  "Obsolete",
  "Posters",
  "Presentations",
  "Reports",
  "Scripts",
] as const;

export const LYX_TEMPLATE_FAMILY_VALUES = [
  ...LYX_DOCUMENT_CLASS_CATEGORIES,
  "Custom",
] as const;

export type LyxDocumentClassCategory = typeof LYX_DOCUMENT_CLASS_CATEGORIES[number];
export type LyxTemplateFamily = typeof LYX_TEMPLATE_FAMILY_VALUES[number];
export type LyxDocumentClassBehavior =
  | "article"
  | "book"
  | "report"
  | "letter"
  | "beamer"
  | "poster"
  | "curriculum-vitae"
  | "script"
  | "docbook";
export type LyxDocumentClassPreviewSupport = "supported" | "source-only" | "unsupported";

type LyxDocumentClassJsonEntry = {
  id: string;
  latexClass: string;
  dependencies: string[];
  label: string;
  category: LyxDocumentClassCategory;
};

export type LyxDocumentClassEntry = {
  value: string;
  latexClass: string;
  dependencies: string[];
  label: string;
  template: string;
  templateFamily: LyxDocumentClassCategory;
  behavior: LyxDocumentClassBehavior;
  previewSupport: LyxDocumentClassPreviewSupport;
  previewSupportLabel: string;
  previewSupportMessage: string;
};

const BEAMER_BEHAVIOR_CLASSES = new Set([
  "beamer",
  "beamerposter",
]);

const DOCBOOK_BEHAVIOR_CLASSES = new Set([
  "docbook",
  "docbook-book",
  "docbook-chapter",
  "docbook-section",
]);

const PDF_PREVIEW_SUPPORTED_CLASSES = new Set([
  "a0poster",
  "amsart",
  "amsbook",
  "article",
  "article-beamer",
  "beamer",
  "beamerposter",
  "book",
  "europecv",
  "extarticle",
  "extbook",
  "extletter",
  "extreport",
  "heb-letter",
  "letter",
  "memoir",
  "paper",
  "recipebook",
  "report",
  "scrartcl",
  "scrarticle-beamer",
  "scrbook",
  "scrlttr2",
  "scrreprt",
  "simplecv",
  "slides",
]);

const DOCUMENT_CLASS_LABEL_OVERRIDES: Record<string, string> = {
  article: "Article",
  book: "Book",
  report: "Report",
  letter: "Letter",
  beamer: "Presentation (Beamer)",
};

const lyxDocumentClassJsonEntries = documentClassesJson as LyxDocumentClassJsonEntry[];

export const lyxDocumentClasses: LyxDocumentClassEntry[] = lyxDocumentClassJsonEntries.map((entry) => ({
  value: entry.id,
  latexClass: entry.latexClass,
  dependencies: entry.dependencies,
  label: DOCUMENT_CLASS_LABEL_OVERRIDES[entry.id] ?? entry.label,
  template: `lyx-${entry.id}`,
  templateFamily: entry.category,
  behavior: resolveDocumentClassBehavior(entry),
  ...resolveDocumentClassPreviewSupport(entry),
}));

export const lyxDocumentClassesByCategory = LYX_DOCUMENT_CLASS_CATEGORIES.map((category) => ({
  category,
  options: lyxDocumentClasses.filter((entry) => entry.templateFamily === category),
})).filter((group) => group.options.length > 0);

export const pdfPreviewableLyxDocumentClasses = lyxDocumentClasses
  .filter((entry) => entry.previewSupport === "supported");

export const pdfPreviewableLyxDocumentClassesByCategory = LYX_DOCUMENT_CLASS_CATEGORIES.map((category) => ({
  category,
  options: pdfPreviewableLyxDocumentClasses.filter((entry) => entry.templateFamily === category),
})).filter((group) => group.options.length > 0);

const lyxDocumentClassMap = new Map(lyxDocumentClasses.map((entry) => [entry.value, entry]));
const pdfPreviewableLyxDocumentClassMap = new Map(pdfPreviewableLyxDocumentClasses.map((entry) => [entry.value, entry]));
const DEFAULT_PDF_PREVIEWABLE_CLASS_BY_CATEGORY: Record<LyxDocumentClassCategory, string> = {
  Articles: "article",
  Books: "book",
  "Curricula Vitae": "simplecv",
  Handouts: "article",
  Letters: "letter",
  Obsolete: "article",
  Posters: "a0poster",
  Presentations: "beamer",
  Reports: "report",
  Scripts: "article",
};

export function getLyxDocumentClassEntry(documentClass: string): LyxDocumentClassEntry | undefined {
  return lyxDocumentClassMap.get(documentClass);
}

export function isBuiltInLyxDocumentClass(documentClass: string): boolean {
  return lyxDocumentClassMap.has(documentClass);
}

export function getLyxDocumentClassOptionList(): LyxDocumentClassEntry[] {
  return lyxDocumentClasses;
}

export function getPdfPreviewableLyxDocumentClassEntry(documentClass: string): LyxDocumentClassEntry | undefined {
  return pdfPreviewableLyxDocumentClassMap.get(documentClass);
}

export function isPdfPreviewableLyxDocumentClass(documentClass: string): boolean {
  return pdfPreviewableLyxDocumentClassMap.has(documentClass);
}

export function coerceLyxDocumentClassToPdfPreviewable(documentClass: string): LyxDocumentClassEntry {
  const supported = getPdfPreviewableLyxDocumentClassEntry(documentClass);
  if (supported) {
    return supported;
  }

  const fallbackCategory = getLyxDocumentClassEntry(documentClass)?.templateFamily ?? "Books";
  return getPdfPreviewableLyxDocumentClassEntry(DEFAULT_PDF_PREVIEWABLE_CLASS_BY_CATEGORY[fallbackCategory])
    ?? pdfPreviewableLyxDocumentClasses[0];
}

function resolveDocumentClassBehavior(entry: LyxDocumentClassJsonEntry): LyxDocumentClassBehavior {
  if (DOCBOOK_BEHAVIOR_CLASSES.has(entry.id)) {
    return "docbook";
  }

  if (BEAMER_BEHAVIOR_CLASSES.has(entry.id) || entry.category === "Presentations") {
    return "beamer";
  }

  if (entry.category === "Posters") {
    return "poster";
  }

  if (entry.category === "Curricula Vitae") {
    return "curriculum-vitae";
  }

  if (entry.category === "Letters") {
    return "letter";
  }

  if (entry.category === "Reports") {
    return "report";
  }

  if (entry.category === "Books") {
    return "book";
  }

  if (entry.category === "Scripts") {
    return "script";
  }

  return "article";
}

function resolveDocumentClassPreviewSupport(entry: LyxDocumentClassJsonEntry) {
  if (DOCBOOK_BEHAVIOR_CLASSES.has(entry.id)) {
    return {
      previewSupport: "unsupported" as const,
      previewSupportLabel: "No PDF preview",
      previewSupportMessage: `The LyX class "${DOCUMENT_CLASS_LABEL_OVERRIDES[entry.id] ?? entry.label}" is DocBook/XML-first and is outside this product's PDF preview pipeline.`,
    };
  }

  if (PDF_PREVIEW_SUPPORTED_CLASSES.has(entry.id)) {
    return {
      previewSupport: "supported" as const,
      previewSupportLabel: "PDF preview",
      previewSupportMessage: `The LyX class "${DOCUMENT_CLASS_LABEL_OVERRIDES[entry.id] ?? entry.label}" supports live PDF preview in the bundled preview environment.`,
    };
  }

  return {
    previewSupport: "source-only" as const,
    previewSupportLabel: "Source only",
    previewSupportMessage: `The LyX class "${DOCUMENT_CLASS_LABEL_OVERRIDES[entry.id] ?? entry.label}" is preserved for document settings and LaTeX source parity, but the bundled PDF preview environment cannot render its required class/package stack.`,
  };
}
