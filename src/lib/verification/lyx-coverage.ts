import type { LyxOracleFixture } from "@/lib/verification/lyx-oracle";

export type LyxCapabilityClassification = "core parity" | "adapted parity" | "deferred parity";
export type LyxCapabilitySequence = "foundational" | "early" | "mid" | "late";
export type LyxCoverageStatus = "supported" | "partial" | "oracle-only" | "unsupported";
export type LyxImplementationStatus = "supported" | "partial" | "unsupported" | "not-applicable";

export type LyxCapabilityMatrixEntry = {
  featureId: string;
  capability: string;
  family: string;
  classification: LyxCapabilityClassification;
  sequence: LyxCapabilitySequence;
  tiptapImpact: string;
  astImpact: string;
  latexRenderImpact: string;
};

export type LyxCoverageImplementation = {
  canonicalAst: LyxImplementationStatus;
  tiptapEditor: LyxImplementationStatus;
  latexSerializer: LyxImplementationStatus;
  previewRenderer: LyxImplementationStatus;
};

export type LyxParityCoverageEntry = {
  capabilityId: string;
  status: LyxCoverageStatus;
  implementation: LyxCoverageImplementation;
  canonicalAstMapping: string[];
  tiptapEditorMapping: string[];
  latexSerializerMapping: string[];
  previewRendererMapping: string[];
  canonicalFixtureIds: string[];
  lyxOracleFixtureIds: string[];
  verificationFixtureIds: string[];
  gaps: string[];
  oracleExemption?: string;
};

export type LyxCoverageVerificationReport = {
  status: "passed" | "failed";
  matrixCapabilityCount: number;
  checkedCapabilityCount: number;
  coverageById: Record<string, LyxParityCoverageEntry>;
  errors: string[];
  missingMappings: string[];
  missingFixtureMappings: string[];
  oracleOnlyBlockingCapabilities: string[];
  staleRegistryMappings: string[];
  unknownCanonicalFixtureIds: string[];
  unknownOracleFixtureIds: string[];
  unknownOracleFeatureIds: string[];
  missingRequiredOracleFixtureMappings: string[];
  missingOracleExemptions: string[];
  mismatchedOracleFixtureFeatureMappings: string[];
};

const CANONICAL_FIXTURE_IDS = new Set([
  "fixture-restoration-foundation",
  "fixture-gate-one-structure",
  "fixture-gate-two-scholarly",
  "fixture-gate-three-layout",
  "fixture-gate-four-lyx-core",
  "fixture-gate-five-lyx-breadth",
]);

const VERIFICATION_FIXTURE_IDS = new Set([
  "src/components/workspace/__tests__/EditorWorkspace.test.tsx",
  "src/lib/editor-core/__tests__/canonical-document.test.ts",
  "src/lib/editor-core/__tests__/patch-merge.test.ts",
  "src/lib/layout/__tests__/page-layout-contract.test.ts",
  "src/lib/layout/__tests__/parity-surface.test.ts",
  "src/lib/latex/__tests__/compiler.test.ts",
  "src/lib/latex/__tests__/serializer.test.ts",
  "src/lib/tiptap-adapter/__tests__/canonical-attributes.test.ts",
  "src/lib/tiptap-adapter/__tests__/projection.test.ts",
  "src/lib/verification/__tests__/fixture-runner.test.ts",
  "src/lib/verification/__tests__/lyx-coverage.test.ts",
  "src/lib/verification/__tests__/lyx-oracle.real.test.ts",
  "src/lib/verification/__tests__/lyx-oracle.test.ts",
  "src/lib/verification/__tests__/visual-parity.test.ts",
  "src/lib/verification/editor-html-renderer.ts",
]);

const coreDocumentFixtures = [
  "fixture-restoration-foundation",
  "fixture-gate-one-structure",
  "fixture-gate-two-scholarly",
  "fixture-gate-four-lyx-core",
];
const projectionTests = ["src/lib/tiptap-adapter/__tests__/projection.test.ts"];
const serializerTests = ["src/lib/latex/__tests__/serializer.test.ts"];
const compilerTests = ["src/lib/latex/__tests__/compiler.test.ts"];
const workspaceTests = ["src/components/workspace/__tests__/EditorWorkspace.test.tsx"];
const visualTests = ["src/lib/verification/__tests__/visual-parity.test.ts"];

const supportedAll: LyxCoverageImplementation = {
  canonicalAst: "supported",
  tiptapEditor: "supported",
  latexSerializer: "supported",
  previewRenderer: "supported",
};

const partialAll: LyxCoverageImplementation = {
  canonicalAst: "partial",
  tiptapEditor: "partial",
  latexSerializer: "partial",
  previewRenderer: "partial",
};

function coverage(
  capabilityId: string,
  options: {
    status: LyxCoverageStatus;
    implementation?: LyxCoverageImplementation;
    canonicalAstMapping?: string[];
    tiptapEditorMapping?: string[];
    latexSerializerMapping?: string[];
    previewRendererMapping?: string[];
    canonicalFixtureIds?: string[];
    lyxOracleFixtureIds?: string[];
    verificationFixtureIds?: string[];
    gaps?: string[];
    oracleExemption?: string;
  },
): LyxParityCoverageEntry {
  return {
    capabilityId,
    status: options.status,
    implementation: options.implementation ?? partialAll,
    canonicalAstMapping: options.canonicalAstMapping ?? [],
    tiptapEditorMapping: options.tiptapEditorMapping ?? [],
    latexSerializerMapping: options.latexSerializerMapping ?? [],
    previewRendererMapping: options.previewRendererMapping ?? [],
    canonicalFixtureIds: options.canonicalFixtureIds ?? [],
    lyxOracleFixtureIds: options.lyxOracleFixtureIds ?? [],
    verificationFixtureIds: options.verificationFixtureIds ?? [],
    gaps: options.gaps ?? [],
    oracleExemption: options.oracleExemption,
  };
}

function productFixtureCoverage(capabilityId: string, fixtures: string[], oracleFixtures: string[] = []) {
  return coverage(capabilityId, {
    status: "partial",
    canonicalAstMapping: ["CanonicalDocument", "CanonicalDocumentSettings", "CanonicalBlock"],
    tiptapEditorMapping: ["canonicalToTiptapDocument", "tiptapDocumentToCanonicalPatch"],
    latexSerializerMapping: ["serializeCanonicalDocumentToLatex"],
    previewRendererMapping: ["compileLatexToPdf", "renderCanonicalDocumentToEditorHtml"],
    canonicalFixtureIds: fixtures,
    lyxOracleFixtureIds: oracleFixtures,
    verificationFixtureIds: [
      "src/lib/editor-core/__tests__/canonical-document.test.ts",
      ...projectionTests,
      ...serializerTests,
      ...visualTests,
    ],
    gaps: ["Coverage exists but does not yet prove every LyX class/module variant or edge-case layout."],
  });
}

export const lyxParityCoverageRegistry: LyxParityCoverageEntry[] = [
  coverage("docclass-select", {
    status: "partial",
    canonicalAstMapping: ["CanonicalDocumentSettings.documentClass"],
    tiptapEditorMapping: ["document settings surface"],
    latexSerializerMapping: ["\\documentclass serializer branch"],
    previewRendererMapping: ["compiled PDF document-class output"],
    canonicalFixtureIds: coreDocumentFixtures,
    lyxOracleFixtureIds: ["lyx-restoration-foundation"],
    verificationFixtureIds: [...serializerTests, ...compilerTests],
    gaps: ["Only article/book/report are modeled; full LyX class registry and class-specific layouts remain open."],
  }),
  coverage("module-enable-disable", {
    status: "partial",
    canonicalAstMapping: ["CanonicalDocumentSettings.modules", "CanonicalDocumentSettings.enabledModules"],
    tiptapEditorMapping: ["document settings surface"],
    latexSerializerMapping: ["module-dependent package and macro emission"],
    previewRendererMapping: ["compiled package-sensitive PDF output"],
    canonicalFixtureIds: ["fixture-gate-four-lyx-core", "fixture-gate-five-lyx-breadth"],
    lyxOracleFixtureIds: ["lyx-oracle-parity-coverage-breadth"],
    verificationFixtureIds: [...serializerTests, ...compilerTests],
    gaps: ["Modules are persisted and serialized for known fixtures, not discovered from the full LyX module registry."],
  }),
  coverage("doc-metadata-settings", {
    status: "partial",
    canonicalAstMapping: ["CanonicalDocument.title", "CanonicalDocumentSettings", "FrontMatterBlock"],
    tiptapEditorMapping: ["metadata and front matter editor surfaces"],
    latexSerializerMapping: ["title/author/date/front matter serialization"],
    previewRendererMapping: ["compiled metadata output"],
    canonicalFixtureIds: ["fixture-gate-four-lyx-core", "fixture-gate-five-lyx-breadth"],
    lyxOracleFixtureIds: ["lyx-upstream-vcs-info-export", "lyx-oracle-master-child-branch"],
    verificationFixtureIds: [...serializerTests, ...visualTests],
    gaps: ["Class-defined custom metadata fields still need a layout-driven registry."],
  }),
  productFixtureCoverage("custom-preamble-edit", ["fixture-gate-four-lyx-core"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),
  coverage("master-document-linking", {
    status: "unsupported",
    implementation: {
      canonicalAst: "partial",
      tiptapEditor: "partial",
      latexSerializer: "partial",
      previewRenderer: "partial",
    },
    canonicalAstMapping: ["IncludeBlock"],
    tiptapEditorMapping: ["include placeholder surface"],
    latexSerializerMapping: ["include placeholder / resolved block expansion"],
    previewRendererMapping: ["compiled include expansion fixture"],
    canonicalFixtureIds: ["fixture-gate-four-lyx-core", "fixture-gate-five-lyx-breadth"],
    lyxOracleFixtureIds: ["lyx-oracle-master-child-branch"],
    verificationFixtureIds: [...projectionTests, ...serializerTests],
    gaps: ["Deferred: full multi-file precedence, child document storage, and artifact history are not complete."],
  }),

  coverage("sectioning-hierarchy", {
    status: "supported",
    implementation: supportedAll,
    canonicalAstMapping: ["HeadingBlock.level"],
    tiptapEditorMapping: ["heading command projection"],
    latexSerializerMapping: ["\\IkHeadingOne / sectioning serializer"],
    previewRendererMapping: ["editor/PDF text and visual parity fixtures"],
    canonicalFixtureIds: ["fixture-restoration-foundation", "fixture-gate-one-structure"],
    lyxOracleFixtureIds: ["lyx-restoration-foundation"],
    verificationFixtureIds: [...projectionTests, ...serializerTests, ...compilerTests, ...visualTests],
    gaps: [],
  }),
  productFixtureCoverage("abstract-block", ["fixture-gate-two-scholarly"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),
  productFixtureCoverage("titlepage-and-frontmatter", ["fixture-gate-five-lyx-breadth"], [
    "lyx-upstream-language-index",
    "lyx-oracle-master-child-branch",
  ]),
  productFixtureCoverage("quotation-verse-blocks", ["fixture-gate-two-scholarly"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),
  productFixtureCoverage("branch-conditional-content", ["fixture-gate-five-lyx-breadth"], [
    "lyx-oracle-master-child-branch",
  ]),
  productFixtureCoverage("inline-emphasis-styles", ["fixture-restoration-foundation"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),
  productFixtureCoverage("font-family-size-selection", ["fixture-gate-three-layout"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),
  productFixtureCoverage("text-color-and-highlighting", ["fixture-gate-three-layout"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),
  coverage("change-tracking", {
    status: "partial",
    implementation: {
      canonicalAst: "partial",
      tiptapEditor: "partial",
      latexSerializer: "unsupported",
      previewRenderer: "partial",
    },
    canonicalAstMapping: ["ReviewState", "CommentInline"],
    tiptapEditorMapping: ["review panel and annotations"],
    latexSerializerMapping: [],
    previewRendererMapping: ["review-state editor surfaces"],
    canonicalFixtureIds: ["fixture-gate-three-layout"],
    lyxOracleFixtureIds: ["lyx-oracle-parity-coverage-breadth"],
    verificationFixtureIds: [...workspaceTests, "src/lib/editor-core/__tests__/canonical-document.test.ts"],
    gaps: ["Author-attributed insert/delete change tracking is not yet serialized as LyX-equivalent change output."],
  }),

  productFixtureCoverage("inline-and-display-math", ["fixture-restoration-foundation", "fixture-gate-two-scholarly"], [
    "lyx-restoration-foundation",
    "lyx-current-upstream-complicated-table",
  ]),
  productFixtureCoverage("equation-numbering-and-labels", ["fixture-gate-two-scholarly"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),
  productFixtureCoverage("math-structures-matrices-alignment", ["fixture-gate-two-scholarly"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),
  productFixtureCoverage("theorem-like-environments", ["fixture-restoration-foundation", "fixture-gate-two-scholarly"], [
    "lyx-restoration-foundation",
  ]),
  productFixtureCoverage("math-macros-and-decorations", ["fixture-gate-two-scholarly"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),
  coverage("math-extern-cas", {
    status: "unsupported",
    implementation: {
      canonicalAst: "unsupported",
      tiptapEditor: "unsupported",
      latexSerializer: "unsupported",
      previewRenderer: "unsupported",
    },
    canonicalAstMapping: [],
    tiptapEditorMapping: [],
    latexSerializerMapping: [],
    previewRendererMapping: [],
    canonicalFixtureIds: [],
    verificationFixtureIds: ["src/lib/verification/__tests__/lyx-coverage.test.ts"],
    gaps: ["Deferred external CAS integration is intentionally outside the current semantic export core."],
  }),

  productFixtureCoverage("table-insert-edit", ["fixture-gate-one-structure", "fixture-gate-five-lyx-breadth"], [
    "lyx-upstream-formal-booktabs-table",
  ]),
  productFixtureCoverage("table-cell-merge-and-span", ["fixture-gate-five-lyx-breadth"], [
    "lyx-current-upstream-complicated-table",
    "lyx-oracle-export-breadth",
  ]),
  productFixtureCoverage("longtable-mode", ["fixture-gate-five-lyx-breadth"], ["lyx-oracle-export-breadth"]),
  productFixtureCoverage("formal-booktabs-style", ["fixture-gate-five-lyx-breadth"], [
    "lyx-upstream-formal-booktabs-table",
  ]),

  productFixtureCoverage("graphics-insert-configure", ["fixture-gate-one-structure", "fixture-gate-five-lyx-breadth"], [
    "lyx-oracle-export-breadth",
  ]),
  productFixtureCoverage("figure-and-table-floats", ["fixture-gate-one-structure", "fixture-gate-five-lyx-breadth"], [
    "lyx-upstream-figure-caption-cprotect",
    "lyx-oracle-export-breadth",
  ]),
  productFixtureCoverage("caption-management", ["fixture-gate-one-structure", "fixture-gate-five-lyx-breadth"], [
    "lyx-upstream-figure-caption-cprotect",
    "lyx-oracle-export-breadth",
  ]),
  productFixtureCoverage("wrap-margin-floats", ["fixture-gate-three-layout"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),

  productFixtureCoverage("label-insert", ["fixture-gate-two-scholarly", "fixture-gate-four-lyx-core"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),
  productFixtureCoverage("cross-reference-insert", ["fixture-gate-two-scholarly"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),
  productFixtureCoverage("table-of-contents-and-lists", ["fixture-gate-five-lyx-breadth"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),
  productFixtureCoverage("bibliography-insert-manage", ["fixture-gate-two-scholarly"], ["lyx-oracle-export-breadth"]),
  productFixtureCoverage("citation-insert-style-variants", ["fixture-gate-four-lyx-core"], ["lyx-oracle-export-breadth"]),
  productFixtureCoverage("bibliography-output-control", ["fixture-gate-two-scholarly"], ["lyx-oracle-export-breadth"]),
  productFixtureCoverage("index-entry-insert", ["fixture-gate-five-lyx-breadth"], ["lyx-upstream-language-index"]),
  productFixtureCoverage("nomenclature-and-glossary", ["fixture-gate-five-lyx-breadth"], ["lyx-oracle-export-breadth"]),
  coverage("index-property-macros", {
    status: "unsupported",
    implementation: {
      canonicalAst: "unsupported",
      tiptapEditor: "unsupported",
      latexSerializer: "unsupported",
      previewRenderer: "unsupported",
    },
    canonicalAstMapping: [],
    tiptapEditorMapping: [],
    latexSerializerMapping: [],
    previewRendererMapping: [],
    canonicalFixtureIds: [],
    verificationFixtureIds: ["src/lib/verification/__tests__/lyx-coverage.test.ts"],
    gaps: ["Deferred index-property macro support remains outside the current fixture corpus."],
  }),

  productFixtureCoverage("page-breaks-and-flow-breaks", ["fixture-gate-one-structure", "fixture-gate-three-layout"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),
  productFixtureCoverage("multicolumn-and-landscape-modes", ["fixture-gate-three-layout"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),
  productFixtureCoverage("headers-footers-page-style", ["fixture-gate-three-layout"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),
  productFixtureCoverage("spacing-margins-layout-options", ["fixture-gate-three-layout"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),

  productFixtureCoverage("multilingual-language-selection", ["fixture-gate-five-lyx-breadth"], [
    "lyx-upstream-language-index",
    "lyx-upstream-multilingual-encoding",
  ]),
  productFixtureCoverage("encoding-selection-validation", ["fixture-gate-five-lyx-breadth"], [
    "lyx-upstream-language-index",
    "lyx-upstream-multilingual-encoding",
  ]),
  coverage("cjk-and-rtl-support", {
    status: "unsupported",
    implementation: {
      canonicalAst: "partial",
      tiptapEditor: "unsupported",
      latexSerializer: "partial",
      previewRenderer: "unsupported",
    },
    canonicalAstMapping: ["CanonicalDocumentSettings.secondaryLanguages", "CanonicalDocumentSettings.textDirection"],
    tiptapEditorMapping: [],
    latexSerializerMapping: ["CJK/RTL oracle signatures only"],
    previewRendererMapping: [],
    canonicalFixtureIds: ["fixture-gate-five-lyx-breadth"],
    lyxOracleFixtureIds: ["lyx-oracle-export-breadth"],
    verificationFixtureIds: ["src/lib/verification/__tests__/lyx-coverage.test.ts"],
    gaps: ["Deferred: real CJK/RTL editing, engine selection, and PDF visual parity are not implemented."],
  }),
  productFixtureCoverage("multilingual-captions-and-local-overrides", ["fixture-gate-five-lyx-breadth"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),

  productFixtureCoverage("latex-export", coreDocumentFixtures, [
    "lyx-restoration-foundation",
    "lyx-upstream-vcs-info-export",
  ]),
  productFixtureCoverage("preview-and-compile-loop", coreDocumentFixtures, ["lyx-restoration-foundation"]),
  coverage("docbook-export", {
    status: "partial",
    implementation: {
      canonicalAst: "partial",
      tiptapEditor: "not-applicable",
      latexSerializer: "unsupported",
      previewRenderer: "not-applicable",
    },
    canonicalAstMapping: ["CanonicalDocument semantic AST"],
    tiptapEditorMapping: [],
    latexSerializerMapping: [],
    previewRendererMapping: [],
    canonicalFixtureIds: coreDocumentFixtures,
    verificationFixtureIds: ["src/lib/editor-core/__tests__/canonical-document.test.ts"],
    gaps: ["DocBook export itself is not implemented; canonical semantics are tracked for future export."],
    oracleExemption: "DocBook is a non-LaTeX export target, so the LaTeX oracle cannot produce a meaningful source signature.",
  }),
  coverage("xhtml-export", {
    status: "partial",
    implementation: {
      canonicalAst: "partial",
      tiptapEditor: "not-applicable",
      latexSerializer: "unsupported",
      previewRenderer: "partial",
    },
    canonicalAstMapping: ["CanonicalDocument semantic AST"],
    tiptapEditorMapping: [],
    latexSerializerMapping: [],
    previewRendererMapping: ["renderCanonicalDocumentToEditorHtml"],
    canonicalFixtureIds: coreDocumentFixtures,
    verificationFixtureIds: ["src/lib/verification/editor-html-renderer.ts", ...visualTests],
    gaps: ["Dedicated XHTML export is not implemented; editor HTML renderer is only a verification surface."],
    oracleExemption: "XHTML is a non-LaTeX export target, so the LaTeX oracle cannot produce a meaningful source signature.",
  }),
  productFixtureCoverage("export-robustness-and-recovery", coreDocumentFixtures, [
    "lyx-current-upstream-complicated-table",
  ]),

  productFixtureCoverage("template-selection", ["fixture-gate-four-lyx-core", "fixture-gate-five-lyx-breadth"], [
    "lyx-upstream-vcs-info-export",
    "lyx-oracle-parity-coverage-breadth",
  ]),
  productFixtureCoverage("custom-semantic-insets", ["fixture-gate-four-lyx-core"], [
    "lyx-oracle-parity-coverage-breadth",
  ]),
  coverage("customization-of-bindings-and-ui-surfaces", {
    status: "unsupported",
    implementation: {
      canonicalAst: "not-applicable",
      tiptapEditor: "unsupported",
      latexSerializer: "not-applicable",
      previewRenderer: "not-applicable",
    },
    canonicalAstMapping: [],
    tiptapEditorMapping: [],
    latexSerializerMapping: [],
    previewRendererMapping: [],
    canonicalFixtureIds: [],
    verificationFixtureIds: ["src/lib/verification/__tests__/lyx-coverage.test.ts"],
    gaps: ["Deferred power-user customization is not part of the semantic export foundation."],
  }),

  coverage("undo-redo-history", {
    status: "partial",
    implementation: {
      canonicalAst: "not-applicable",
      tiptapEditor: "partial",
      latexSerializer: "not-applicable",
      previewRenderer: "not-applicable",
    },
    canonicalAstMapping: [],
    tiptapEditorMapping: ["Tiptap transaction history boundary", "canonical patch merge no-op detection"],
    latexSerializerMapping: [],
    previewRendererMapping: [],
    canonicalFixtureIds: [],
    verificationFixtureIds: [
      "src/lib/editor-core/__tests__/patch-merge.test.ts",
      "src/lib/tiptap-adapter/__tests__/canonical-attributes.test.ts",
    ],
    gaps: ["Dedicated user-facing history UI and collaborative history model are not complete."],
    oracleExemption: "Undo/redo is editor state behavior and has no stable LaTeX export signature in LyX oracle output.",
  }),
  coverage("find-replace", {
    status: "partial",
    implementation: {
      canonicalAst: "not-applicable",
      tiptapEditor: "partial",
      latexSerializer: "not-applicable",
      previewRenderer: "not-applicable",
    },
    canonicalAstMapping: [],
    tiptapEditorMapping: ["Google Docs-like command surface placeholder"],
    latexSerializerMapping: [],
    previewRendererMapping: [],
    canonicalFixtureIds: [],
    verificationFixtureIds: workspaceTests,
    gaps: ["Search/replace command behavior is not yet implemented beyond shell-level affordance."],
    oracleExemption: "Find/replace is interactive editor behavior and has no stable LaTeX export signature.",
  }),
  coverage("spellcheck-and-thesaurus", {
    status: "partial",
    implementation: {
      canonicalAst: "not-applicable",
      tiptapEditor: "partial",
      latexSerializer: "not-applicable",
      previewRenderer: "not-applicable",
    },
    canonicalAstMapping: [],
    tiptapEditorMapping: ["Google Docs-like command surface placeholder"],
    latexSerializerMapping: [],
    previewRendererMapping: [],
    canonicalFixtureIds: [],
    verificationFixtureIds: workspaceTests,
    gaps: ["Spellcheck and thesaurus providers are not wired."],
    oracleExemption: "Spellcheck/thesaurus is provider-backed editor behavior and has no stable LaTeX export signature.",
  }),
  coverage("paste-special", {
    status: "partial",
    implementation: {
      canonicalAst: "partial",
      tiptapEditor: "partial",
      latexSerializer: "partial",
      previewRenderer: "partial",
    },
    canonicalAstMapping: ["tiptapDocumentToCanonicalPatch"],
    tiptapEditorMapping: ["Tiptap paste/input adapter boundary"],
    latexSerializerMapping: ["canonical serializer after patch merge"],
    previewRendererMapping: ["live preview after canonical patch"],
    canonicalFixtureIds: ["fixture-restoration-foundation"],
    verificationFixtureIds: [...projectionTests, ...compilerTests],
    gaps: ["Format-specific HTML/LaTeX/PDF/image paste conversion is not implemented."],
    oracleExemption: "Paste-special is an import/clipboard behavior; LyX export output cannot prove clipboard conversion fidelity.",
  }),
  coverage("multi-view-bookmarks-fullscreen", {
    status: "partial",
    implementation: {
      canonicalAst: "not-applicable",
      tiptapEditor: "partial",
      latexSerializer: "not-applicable",
      previewRenderer: "partial",
    },
    canonicalAstMapping: [],
    tiptapEditorMapping: ["revealable source/review/PDF panels"],
    latexSerializerMapping: [],
    previewRendererMapping: ["workspace preview panel"],
    canonicalFixtureIds: [],
    verificationFixtureIds: workspaceTests,
    gaps: ["Bookmarks, split editing, and fullscreen workflows remain incomplete."],
    oracleExemption: "Multi-view, bookmarks, and fullscreen are editor workflow surfaces with no stable LaTeX export signature.",
  }),
  coverage("statistics-preferences-reconfigure", {
    status: "unsupported",
    implementation: {
      canonicalAst: "not-applicable",
      tiptapEditor: "unsupported",
      latexSerializer: "not-applicable",
      previewRenderer: "not-applicable",
    },
    canonicalAstMapping: [],
    tiptapEditorMapping: [],
    latexSerializerMapping: [],
    previewRendererMapping: [],
    canonicalFixtureIds: [],
    verificationFixtureIds: ["src/lib/verification/__tests__/lyx-coverage.test.ts"],
    gaps: ["Deferred environment administration and preferences are outside the current parity foundation."],
  }),
  coverage("compare-and-version-control", {
    status: "unsupported",
    implementation: {
      canonicalAst: "not-applicable",
      tiptapEditor: "unsupported",
      latexSerializer: "not-applicable",
      previewRenderer: "not-applicable",
    },
    canonicalAstMapping: [],
    tiptapEditorMapping: [],
    latexSerializerMapping: [],
    previewRendererMapping: [],
    canonicalFixtureIds: [],
    verificationFixtureIds: ["src/lib/verification/__tests__/lyx-coverage.test.ts"],
    gaps: ["Deferred document comparison and VCS integration are not implemented."],
  }),
];

export function parseLyxCapabilityMatrix(markdown: string): LyxCapabilityMatrixEntry[] {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 13)
    .filter((cells) => /^[a-z0-9][a-z0-9-]+$/.test(cells[0]))
    .filter((cells) => isLyxCapabilityClassification(cells[6]) && isLyxCapabilitySequence(cells[11]))
    .map((cells) => ({
      featureId: cells[0],
      capability: cells[1],
      family: cells[2],
      classification: cells[6] as LyxCapabilityClassification,
      tiptapImpact: cells[8],
      astImpact: cells[9],
      latexRenderImpact: cells[10],
      sequence: cells[11] as LyxCapabilitySequence,
    }));
}

export function runLyxCoverageVerification({
  matrixMarkdown,
  registry = lyxParityCoverageRegistry,
  oracleFixtures = [],
}: {
  matrixMarkdown: string;
  registry?: LyxParityCoverageEntry[];
  oracleFixtures?: LyxOracleFixture[];
}): LyxCoverageVerificationReport {
  const matrixEntries = parseLyxCapabilityMatrix(matrixMarkdown);
  const matrixIds = new Set(matrixEntries.map((entry) => entry.featureId));
  const blockingEntries = matrixEntries.filter((entry) => entry.classification !== "deferred parity");
  const registryById = Object.fromEntries(registry.map((entry) => [entry.capabilityId, entry]));
  const oracleFixtureIds = new Set(oracleFixtures.map((fixture) => fixture.id));

  const missingMappings: string[] = [];
  const missingFixtureMappings: string[] = [];
  const oracleOnlyBlockingCapabilities: string[] = [];
  const unknownCanonicalFixtureIds: string[] = [];
  const unknownOracleFixtureIds: string[] = [];
  const missingRequiredOracleFixtureMappings: string[] = [];
  const missingOracleExemptions: string[] = [];
  const mismatchedOracleFixtureFeatureMappings: string[] = [];
  const oracleFeatureIds = new Set(oracleFixtures.flatMap((fixture) => fixture.featureIds));
  const oracleFeatureIdsByFixtureId = Object.fromEntries(
    oracleFixtures.map((fixture) => [fixture.id, new Set(fixture.featureIds)]),
  );
  const unknownOracleFeatureIds = [...oracleFeatureIds]
    .filter((featureId) => !matrixIds.has(featureId) && !registryById[featureId])
    .sort();

  for (const entry of blockingEntries) {
    const coverageEntry = registryById[entry.featureId];
    if (!coverageEntry) {
      missingMappings.push(entry.featureId);
      continue;
    }

    if (coverageEntry.status === "oracle-only") {
      oracleOnlyBlockingCapabilities.push(entry.featureId);
    }

    const fixtureIds = [
      ...coverageEntry.canonicalFixtureIds,
      ...coverageEntry.lyxOracleFixtureIds,
      ...coverageEntry.verificationFixtureIds,
    ];
    if (fixtureIds.length === 0) {
      missingFixtureMappings.push(entry.featureId);
    }

    const onlyOracleEvidence = coverageEntry.lyxOracleFixtureIds.length > 0
      && coverageEntry.canonicalFixtureIds.length === 0
      && coverageEntry.verificationFixtureIds.length === 0;
    const lacksAstAndSerializer = isUnimplemented(coverageEntry.implementation.canonicalAst)
      && isUnimplemented(coverageEntry.implementation.latexSerializer);
    if (onlyOracleEvidence && lacksAstAndSerializer) {
      oracleOnlyBlockingCapabilities.push(entry.featureId);
    }

    if (coverageEntry.lyxOracleFixtureIds.length === 0) {
      if (coverageEntry.oracleExemption) {
        continue;
      }
      if (requiresOracleEvidence(entry)) {
        missingRequiredOracleFixtureMappings.push(entry.featureId);
      } else {
        missingOracleExemptions.push(entry.featureId);
      }
    }
  }

  for (const entry of registry) {
    for (const fixtureId of entry.canonicalFixtureIds) {
      if (!CANONICAL_FIXTURE_IDS.has(fixtureId)) {
        unknownCanonicalFixtureIds.push(`${entry.capabilityId}:${fixtureId}`);
      }
    }
    for (const fixtureId of entry.lyxOracleFixtureIds) {
      if (!oracleFixtureIds.has(fixtureId)) {
        unknownOracleFixtureIds.push(`${entry.capabilityId}:${fixtureId}`);
      } else if (!oracleFeatureIdsByFixtureId[fixtureId]?.has(entry.capabilityId)) {
        mismatchedOracleFixtureFeatureMappings.push(`${entry.capabilityId}:${fixtureId}`);
      }
    }
    for (const fixtureId of entry.verificationFixtureIds) {
      if (!VERIFICATION_FIXTURE_IDS.has(fixtureId)) {
        unknownCanonicalFixtureIds.push(`${entry.capabilityId}:${fixtureId}`);
      }
    }
  }

  const staleRegistryMappings = registry
    .map((entry) => entry.capabilityId)
    .filter((capabilityId) => !matrixIds.has(capabilityId));

  const errors = [
    ...missingMappings.map((id) => `Missing LyX coverage mapping for core/adapted capability: ${id}`),
    ...missingFixtureMappings.map((id) => `Missing verification fixture mapping for core/adapted capability: ${id}`),
    ...oracleOnlyBlockingCapabilities.map((id) => `Core/adapted capability is oracle-only without product support: ${id}`),
    ...staleRegistryMappings.map((id) => `Coverage registry entry is not present in LyX matrix: ${id}`),
    ...unknownCanonicalFixtureIds.map((id) => `Unknown canonical/verification fixture id: ${id}`),
    ...unknownOracleFixtureIds.map((id) => `Unknown LyX oracle fixture id: ${id}`),
    ...unknownOracleFeatureIds.map((id) => `LyX oracle fixture feature ID is not represented in the matrix/registry: ${id}`),
    ...missingRequiredOracleFixtureMappings.map((id) => `Missing required LyX oracle fixture mapping: ${id}`),
    ...missingOracleExemptions.map((id) => `Missing LyX oracle exemption reason: ${id}`),
    ...mismatchedOracleFixtureFeatureMappings.map((id) => `LyX oracle fixture does not declare mapped feature ID: ${id}`),
  ];

  return {
    status: errors.length === 0 ? "passed" : "failed",
    matrixCapabilityCount: matrixEntries.length,
    checkedCapabilityCount: blockingEntries.length,
    coverageById: registryById,
    errors,
    missingMappings,
    missingFixtureMappings,
    oracleOnlyBlockingCapabilities: [...new Set(oracleOnlyBlockingCapabilities)].sort(),
    staleRegistryMappings,
    unknownCanonicalFixtureIds,
    unknownOracleFixtureIds,
    unknownOracleFeatureIds,
    missingRequiredOracleFixtureMappings,
    missingOracleExemptions,
    mismatchedOracleFixtureFeatureMappings,
  };
}

function isLyxCapabilityClassification(value: string): value is LyxCapabilityClassification {
  return value === "core parity" || value === "adapted parity" || value === "deferred parity";
}

function isLyxCapabilitySequence(value: string): value is LyxCapabilitySequence {
  return value === "foundational" || value === "early" || value === "mid" || value === "late";
}

function isUnimplemented(status: LyxImplementationStatus): boolean {
  return status === "unsupported" || status === "not-applicable";
}

function requiresOracleEvidence(entry: LyxCapabilityMatrixEntry): boolean {
  const exportImpact = `${entry.astImpact} ${entry.latexRenderImpact}`.toLowerCase();
  return (
    exportImpact.includes("serializer")
    || exportImpact.includes("preamble")
    || exportImpact.includes("compile")
    || exportImpact.includes("preview")
    || exportImpact.includes("round-trip")
  );
}
