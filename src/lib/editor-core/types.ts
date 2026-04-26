export type ReviewState = "needs_review" | "approved" | "rejected";

export type CanonicalDocumentSettings = {
  documentClass: "book" | "article" | "report";
  language: string;
  encoding: "utf8";
  modules: string[];
  template: string;
  templateFamily?: "Articles" | "Books" | "Letters" | "Presentations" | "Custom";
  enabledModules?: string[];
  bibliographyEngine?: "basic" | "natbib" | "biblatex";
  citationStyle?: "numeric" | "authoryear";
  latexEngine?: "pdflatex" | "xelatex" | "lualatex";
  languagePackage?: "babel" | "polyglossia";
  secondaryLanguages?: string[];
  textDirection?: "ltr" | "rtl";
  branches?: Array<{
    id: string;
    name: string;
    exportMode: "included" | "omitted" | "preview-only";
  }>;
  customPreamble?: Array<{
    id: string;
    kind: "package" | "macro";
    source: string;
    enabled: boolean;
  }>;
};

export type CanonicalMetadata = {
  projectId: string;
  sourceDocumentId: string;
  reviewState: ReviewState;
};

export type Provenance = {
  sourceRegionId: string;
  confidence: number;
};

export type TextInline = {
  type: "text";
  text: string;
  marks?: Array<"emphasis" | "strong" | "code">;
};

export type MathInline = {
  type: "math_inline";
  tex: string;
};

export type CitationInline = {
  type: "citation";
  key: string;
  variant?: "default" | "textual" | "parenthetical" | "year";
};

export type ReferenceInline = {
  type: "reference";
  target: string;
};

export type LabelInline = {
  type: "label";
  target: string;
};

export type IndexEntryInline = {
  type: "index_entry";
  term: string;
  sortKey?: string;
};

export type GlossaryEntryInline = {
  type: "glossary_entry";
  term: string;
  description: string;
};

export type NomenclatureEntryInline = {
  type: "nomenclature_entry";
  symbol: string;
  description: string;
};

export type FootnoteInline = {
  type: "footnote";
  placement?: "inline" | "page_footer";
  children: CanonicalInline[];
};

export type LanguageSpanInline = {
  type: "language_span";
  language: string;
  children: CanonicalInline[];
};

export type CommentInline = {
  type: "comment";
  id: string;
  author: string;
  status: "open" | "resolved";
  children: CanonicalInline[];
  comment: string;
};

export type CanonicalInline =
  | TextInline
  | MathInline
  | CitationInline
  | ReferenceInline
  | LabelInline
  | IndexEntryInline
  | GlossaryEntryInline
  | NomenclatureEntryInline
  | FootnoteInline
  | LanguageSpanInline
  | CommentInline;

export type ParagraphBlock = {
  id: string;
  type: "paragraph";
  children: CanonicalInline[];
  provenance?: Provenance;
  reviewState: ReviewState;
};

export type HeadingBlock = {
  id: string;
  type: "heading";
  level: 1 | 2 | 3;
  children: CanonicalInline[];
  provenance?: Provenance;
  reviewState: ReviewState;
};

export type TheoremBlock = {
  id: string;
  type: "theorem";
  theoremKind: "Theorem" | "Lemma" | "Proposition" | "Corollary";
  label?: string;
  children: CanonicalInline[];
  provenance?: Provenance;
  reviewState: ReviewState;
};

export type DisplayMathBlock = {
  id: string;
  type: "math_display";
  tex: string;
  numbered: boolean;
  label?: string;
  provenance?: Provenance;
  reviewState: ReviewState;
};

export type ListItem = {
  id: string;
  children: CanonicalInline[];
};

export type ListBlock = {
  id: string;
  type: "list";
  ordered: boolean;
  layout?: {
    indentLevel?: number;
    markerStyle?: "bullet" | "dash" | "decimal" | "lower-alpha";
  };
  items: ListItem[];
  provenance?: Provenance;
  reviewState: ReviewState;
};

export type TableCell = {
  id: string;
  children: CanonicalInline[];
  header?: boolean;
  align?: "left" | "center" | "right";
  colspan?: number;
  rowspan?: number;
};

export type TableRow = {
  id: string;
  cells: TableCell[];
};

export type TableBlock = {
  id: string;
  type: "table";
  rows: TableRow[];
  caption?: CanonicalInline[];
  label?: string;
  layout?: {
    columnWidths?: number[];
    repeatHeader?: boolean;
    tableKind?: "standard" | "longtable";
    booktabs?: boolean;
  };
  provenance?: Provenance;
  reviewState: ReviewState;
};

export type FigureAsset =
  | {
    assetId: string;
    kind: "placeholder";
    mimeType: "image/png" | "image/jpeg" | "image/svg+xml";
    widthRatio: number;
    heightPx: number;
  }
  | {
    assetId: string;
    kind: "embedded";
    mimeType: "image/png" | "image/jpeg";
    fileName: string;
    dataBase64: string;
    widthRatio: number;
    heightPx: number;
  };

export type FigureBlock = {
  id: string;
  type: "figure";
  altText: string;
  caption?: CanonicalInline[];
  label?: string;
  asset?: FigureAsset;
  provenance?: Provenance;
  reviewState: ReviewState;
};

export type PageBreakBlock = {
  id: string;
  type: "page_break";
  provenance?: Provenance;
  reviewState: ReviewState;
};

export type AbstractBlock = {
  id: string;
  type: "abstract";
  children: CanonicalInline[];
  provenance?: Provenance;
  reviewState: ReviewState;
};

export type QuoteBlock = {
  id: string;
  type: "quote";
  quoteKind: "quote" | "quotation" | "verse";
  children: CanonicalInline[];
  provenance?: Provenance;
  reviewState: ReviewState;
};

export type BibliographyEntry = {
  id: string;
  key: string;
  text: string;
};

export type BibliographyBlock = {
  id: string;
  type: "bibliography";
  entries: BibliographyEntry[];
  provenance?: Provenance;
  reviewState: ReviewState;
};

export type SemanticInsetBlock = {
  id: string;
  type: "semantic_inset";
  insetKind: "affiliation" | "keywords" | "email" | "custom";
  children: CanonicalInline[];
  provenance?: Provenance;
  reviewState: ReviewState;
};

export type IncludeBlock = {
  id: string;
  type: "include";
  includeKind: "child_document" | "input" | "include";
  targetDocumentId: string;
  title: string;
  exportMode?: "placeholder" | "expand";
  resolvedBlocks?: CanonicalBlock[];
  provenance?: Provenance;
  reviewState: ReviewState;
};

export type FrontMatterBlock = {
  id: string;
  type: "front_matter";
  frontMatterKind: "title" | "author" | "date" | "dedication" | "preface";
  children: CanonicalInline[];
  provenance?: Provenance;
  reviewState: ReviewState;
};

export type BranchBlock = {
  id: string;
  type: "branch";
  branchId: string;
  branchName: string;
  exportMode: "included" | "omitted" | "preview-only";
  blocks: CanonicalBlock[];
  provenance?: Provenance;
  reviewState: ReviewState;
};

export type GeneratedListEntry = {
  id: string;
  term: string;
  description?: string;
};

export type GeneratedListBlock = {
  id: string;
  type: "generated_list";
  listKind: "index" | "glossary" | "nomenclature";
  title: string;
  entries: GeneratedListEntry[];
  provenance?: Provenance;
  reviewState: ReviewState;
};

export type CanonicalBlock =
  | ParagraphBlock
  | HeadingBlock
  | TheoremBlock
  | DisplayMathBlock
  | ListBlock
  | TableBlock
  | FigureBlock
  | PageBreakBlock
  | AbstractBlock
  | QuoteBlock
  | BibliographyBlock
  | SemanticInsetBlock
  | IncludeBlock
  | FrontMatterBlock
  | BranchBlock
  | GeneratedListBlock;

export type CanonicalDocument = {
  schemaVersion: 1;
  id: string;
  title: string;
  updatedAt: string;
  settings: CanonicalDocumentSettings;
  metadata: CanonicalMetadata;
  blocks: CanonicalBlock[];
};

export type CanonicalPatch = {
  source: "tiptap-adapter";
  blocks: CanonicalBlock[];
};
