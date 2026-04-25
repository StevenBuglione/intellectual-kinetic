# Canonical AST Parity Specification

## Purpose

This specification defines the canonical document model and editor-core contract for Intellectual Kinetic's full LyX-parity implementation target.

Its purpose is to ensure that Tiptap, persistence, review state, and LaTeX export all depend on a single semantic source of truth rather than on browser-local editor state.

## Problem

The product requires:

- a Google Docs-like editing experience
- Tiptap as the live editor layer
- deterministic LaTeX generation
- full LyX parity as the implementation goal

Those goals cannot be satisfied safely unless the project defines a canonical AST that owns durable document meaning, settings, references, numbering, and migration rules.

## Goals

1. Define the canonical AST as the durable semantic model.
2. Define the responsibilities of `editor-core`.
3. Map high-priority LyX capabilities into canonical AST constructs.
4. Define persistence, migration, and normalization rules.
5. Define the contract between Tiptap state and canonical AST projections.

## Non-Goals

1. This spec does not implement editor behavior.
2. This spec does not define final serializer code.
3. This spec does not define PDF preview rendering internals.

## Architectural Position

The canonical AST sits between the Tiptap adapter and the LaTeX/live-render engine.

- Tiptap edits and presents content
- editor-core validates and projects editor state into canonical AST
- canonical AST is persisted and versioned
- LaTeX/render services consume canonical AST

## Required Semantics

The canonical AST must represent at least:

- document settings: class, modules, language, encoding, template, export knobs
- semantic block structure: sections, front matter, theorem-like environments, floats, captions, table structures
- inline semantics: emphasis, code-like spans, citations, references, labels, language overrides
- math constructs: inline math, display math, numbering metadata, math references
- review and provenance metadata where required by the product model

## Persistence Rules

1. Canonical AST is the durable semantic source of truth.
2. Tiptap JSON may be stored for recovery or debugging, but not as the canonical source.
3. Persisted canonical documents must include an explicit schema version.
4. Every migration must define both forward normalization behavior and verification expectations.

## Required Artifacts

This workstream should produce:

1. `docs/specs/architecture/canonical-ast-parity-spec.md`
2. `docs/implementation-plans/architecture/canonical-ast-parity-implementation-plan.md`
3. `docs/verification-plans/architecture/canonical-ast-parity-verification-plan.md`
4. `docs/research/architecture/canonical-ast-node-taxonomy.md`

## Cross-References

This spec is grounded in:

- `docs/research/architecture/lyx-capability-parity-matrix.md`
- `docs/research/architecture/lyx-capability-parity-sequence.md`
- `docs/research/architecture/tiptap-backend-library-architecture.md`
- `docs/specs/product/intellectual-kinetic-product-spec.md`

This spec enables:

- `docs/specs/architecture/latex-live-render-parity-spec.md`
- `docs/specs/architecture/verification-and-visual-parity-spec.md`

## Completion Criteria

This package is complete when:

1. the AST taxonomy exists
2. editor-core ownership boundaries are explicit
3. persistence and migration rules are explicit
4. LyX foundational and early capability families have a canonical-model mapping
5. downstream LaTeX/render work can consume the AST contract without redefining semantics
