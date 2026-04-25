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

export type CanonicalInline =
  | TextInline
  | MathInline
  | CitationInline
  | ReferenceInline;

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

export type CanonicalBlock =
  | ParagraphBlock
  | HeadingBlock
  | TheoremBlock
  | DisplayMathBlock;

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
