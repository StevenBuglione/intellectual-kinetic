export type ReviewState = "needs_review" | "approved" | "rejected";

export type CanonicalDocumentSettings = {
  documentClass: "book" | "article" | "report";
  language: string;
  encoding: "utf8";
  modules: string[];
  template: string;
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
};

export type ReferenceInline = {
  type: "reference";
  target: string;
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
  };
  provenance?: Provenance;
  reviewState: ReviewState;
};

export type FigureBlock = {
  id: string;
  type: "figure";
  altText: string;
  caption?: CanonicalInline[];
  label?: string;
  asset?: {
    assetId: string;
    kind: "placeholder";
    mimeType: "image/png" | "image/jpeg" | "image/svg+xml";
    widthRatio: number;
    heightPx: number;
  };
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
  | BibliographyBlock;

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
