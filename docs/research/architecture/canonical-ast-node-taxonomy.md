# Canonical AST Node Taxonomy

## Purpose

This artifact defines the initial semantic taxonomy for the canonical AST.

## Top-Level Groups

1. **Document settings**
   - document class
   - enabled modules
   - template identity
   - language and encoding defaults
   - export configuration and preamble intent

2. **Structural blocks**
   - section hierarchy
   - abstract/front matter
   - theorem-like environments
   - quotations and semantic block containers

3. **Reference-bearing blocks**
   - figures
   - tables
   - captions
   - numbered equations

4. **Inline semantics**
   - emphasis and strong semantics
   - citations
   - references
   - labels
   - inline code and language overrides

5. **Math structures**
   - inline math
   - display math
   - math numbering and labels

## Ownership Notes

- Tiptap nodes and marks are adapter-facing representations.
- Canonical node identities and invariants belong to editor-core.
- Numbering, references, and export-sensitive metadata belong to canonical semantics, not node-view state.

## Grounding

This taxonomy is derived from:

- `docs/research/architecture/lyx-capability-parity-matrix.md`
- `docs/research/architecture/lyx-capability-parity-sequence.md`
- `docs/research/architecture/tiptap-lyx-parity-mapping.md`
