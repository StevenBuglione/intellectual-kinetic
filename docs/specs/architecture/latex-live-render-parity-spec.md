# LaTeX Live-Render Parity Specification

## Purpose

This specification defines the deterministic LaTeX serializer, live-render pipeline, diagnostics behavior, and revealable source-panel contract for the full LyX-parity editor.

## Problem

The user experience must feel immediate and visual, but restoration-quality correctness depends on:

- deterministic LaTeX generation
- compile and preview behavior that can be trusted
- explicit diagnostics
- a revealable VS Code-like LaTeX panel

Without a dedicated render specification, the project risks building a good editor shell with an unreliable export engine.

## Goals

1. Define AST-to-LaTeX serializer ownership and contracts.
2. Define preamble/package generation.
3. Define compile loop and preview update behavior.
4. Define diagnostics mapping back into editor and source contexts.
5. Define the behavior of the revealable LaTeX source panel.

## Non-Goals

1. This spec does not define the canonical AST itself.
2. This spec does not define OCR or ingest behavior.
3. This spec does not require the preview surface to become the primary editing surface.

## Required Output Model

The package must distinguish:

- canonical AST input
- generated LaTeX source
- compile logs and diagnostics
- preview PDF artifacts
- final export artifacts

## Live Preview Model

The implementation must use a two-surface render model:

1. a live editing surface
2. a rendered preview surface backed by the LaTeX pipeline

The package must define:

- when previews refresh
- how stale preview state is surfaced
- what happens during compile failure
- how diagnostics attach to editor selections and LaTeX spans

## Source Panel Contract

The source panel must:

- be revealable on demand
- show generated LaTeX
- show diagnostics and location context
- remain secondary to the visual editing workflow

## Required Artifacts

1. `docs/specs/architecture/latex-live-render-parity-spec.md`
2. `docs/implementation-plans/architecture/latex-live-render-parity-implementation-plan.md`
3. `docs/verification-plans/architecture/latex-live-render-parity-verification-plan.md`
4. `docs/research/architecture/latex-live-render-pipeline-architecture.md`

## Cross-References

This spec depends on:

- `docs/specs/architecture/canonical-ast-parity-spec.md`
- `docs/research/architecture/tiptap-backend-library-architecture.md`
- `docs/research/architecture/lyx-capability-parity-sequence.md`
- `docs/specs/product/intellectual-kinetic-product-spec.md`

## Completion Criteria

This package is complete when:

1. serializer ownership is explicit
2. preview behavior and stale-state rules are explicit
3. diagnostics mapping is explicit
4. the source panel contract is explicit
5. golden-output and compile validation can be derived without guessing
