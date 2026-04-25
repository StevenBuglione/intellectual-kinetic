# LaTeX Live-Render Pipeline Architecture

## Purpose

This artifact defines the conceptual render pipeline used by the LaTeX/live-render parity package.

## Pipeline Stages

1. **Canonical AST input**
   - validated semantic document
   - document settings and export metadata

2. **Serializer preparation**
   - numbering resolution
   - reference and citation resolution inputs
   - package and preamble planning

3. **LaTeX generation**
   - deterministic `.tex` output
   - stable file layout for preview and final export

4. **Compile stage**
   - compile invocation
   - diagnostics capture
   - artifact status tracking

5. **Preview stage**
   - preview PDF artifact generation
   - stale-state vs fresh-state signaling

6. **Source/debug projection**
   - generated LaTeX panel content
   - diagnostics correlation back to semantic/editor contexts

## Required Behaviors

- preview refresh policy must be explicit
- compile failure must not destroy editor usability
- diagnostics must remain inspectable
- source panel stays secondary to the main editing workflow

## Grounding

This pipeline architecture is derived from:

- `docs/specs/product/intellectual-kinetic-product-spec.md`
- `docs/research/architecture/tiptap-backend-library-architecture.md`
- `docs/research/architecture/lyx-capability-parity-sequence.md`
