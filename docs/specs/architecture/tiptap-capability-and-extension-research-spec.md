# Tiptap Capability and Extension Research Specification

## Purpose

This specification defines the Tiptap research workstream that follows the completed LyX capability inventory.

Its purpose is to determine how far Tiptap can carry the LyX-parity editing layer, where custom Tiptap or ProseMirror work is required, and how the editor should be driven by a reusable editor-core library inside the single Next.js monolith rather than by UI-only logic.

## Problem

The repository now has:

1. a LyX capability parity matrix
2. a LyX parity sequence
3. open questions and source-sweep evidence for LyX
4. a server-side Next.js monolith scaffold

What is still missing is the Tiptap-side research needed to answer:

1. which LyX capabilities map naturally onto Tiptap
2. which capabilities require custom nodes, marks, commands, plugins, node views, or document settings surfaces
3. which capabilities exceed Tiptap's natural scope and therefore require non-editor backend logic
4. how to keep Tiptap as a UI adapter rather than the persistence model or canonical document model

Without this research package, later Tiptap implementation work would be based on guesswork and could easily overfit the UI layer while under-designing the editor-core and LaTeX/export boundaries.

## Goals

1. Research Tiptap's actual editor model, including schema, editor instance, commands, events, content handling, and extension mechanisms.
2. Map the LyX parity inventory onto concrete Tiptap surfaces and identify where Tiptap is a natural fit, an adapted fit, or backend-heavy.
3. Define the backend-library boundary for a reusable editor-core layer inside the existing Next.js monolith.
4. Produce canonical research artifacts that later Tiptap implementation, canonical AST, and LaTeX/live-render work can depend on.
5. Capture the cases where Tiptap alone is insufficient and ProseMirror-level or backend support is mandatory.

## Non-Goals

1. This spec does not implement Tiptap in the application.
2. This spec does not finalize the canonical AST.
3. This spec does not finalize the LaTeX/live-render engine.
4. This spec does not commit the project to Tiptap Pro or Cloud features as architectural dependencies.
5. This spec does not make Tiptap the persistence model.

## Scope Boundary

### In scope

- Tiptap documentation and official guidance relevant to:
  - the editor instance
  - schema behavior
  - commands
  - events
  - custom extensions
  - React integration
  - collaboration guidance
- LyX research artifacts already in `docs/research/architecture/lyx-capability-*`
- mapping LyX capabilities to Tiptap/UI/editor-core/backend responsibilities
- defining an in-monolith editor-core library boundary

### Out of scope

- implementation code
- third-party UI-kit selection
- full ProseMirror source-code archaeology
- payment-driven Tiptap feature adoption decisions
- replacing the single-monolith project boundary with a multi-package architecture

## Authoritative Sources

This research must treat the following sources as authoritative together:

1. Tiptap getting-started and editor API documentation
2. Tiptap extension and custom-extension documentation
3. Tiptap React and SSR guidance
4. Tiptap collaboration guidance where relevant
5. the completed LyX research package in this repository
6. the product spec and product implementation plan

Representative source pages include:

- `https://tiptap.dev/docs/editor/getting-started/overview`
- `https://tiptap.dev/docs/editor/getting-started/install/react`
- `https://tiptap.dev/docs/editor/api/editor`
- `https://tiptap.dev/docs/editor/api/commands`
- `https://tiptap.dev/docs/editor/api/events`
- `https://tiptap.dev/docs/editor/core-concepts/schema`
- `https://tiptap.dev/docs/editor/extensions/overview`
- `https://tiptap.dev/docs/editor/extensions/custom-extensions`
- `https://tiptap.dev/docs/hocuspocus/guides/collaborative-editing`
- `docs/research/architecture/lyx-capability-parity-matrix.md`
- `docs/research/architecture/lyx-capability-parity-sequence.md`
- `docs/research/architecture/lyx-capability-open-questions.md`
- `docs/specs/product/intellectual-kinetic-product-spec.md`

## Canonical Artifact Paths

This workstream should produce these canonical artifacts:

1. spec:
   - `docs/specs/architecture/tiptap-capability-and-extension-research-spec.md`
2. implementation plan:
   - `docs/implementation-plans/architecture/tiptap-capability-and-extension-research-implementation-plan.md`
3. verification plan:
   - `docs/verification-plans/architecture/tiptap-capability-and-extension-research-verification-plan.md`
4. source-sweep log:
   - `docs/research/architecture/tiptap-capability-source-sweep.md`
5. LyX-to-Tiptap mapping:
   - `docs/research/architecture/tiptap-lyx-parity-mapping.md`
6. backend-library architecture:
   - `docs/research/architecture/tiptap-backend-library-architecture.md`

## Research Questions

The research package must answer at least:

1. What is Tiptap's core mental model for structured editing?
2. Which Tiptap surfaces are stable and appropriate to build on?
3. Which LyX capabilities map cleanly onto Tiptap nodes, marks, commands, node views, plugins, or document settings?
4. Which LyX capabilities remain awkward, backend-heavy, or outside Tiptap's natural scope?
5. What logic must live in the reusable editor-core library rather than inside Tiptap extensions or React UI code?
6. How should Tiptap content formats be treated relative to canonical AST and LaTeX export?

## Required Outputs

### 1. Source sweep

The source-sweep artifact must record:

- concrete Tiptap URLs inspected
- the capability surfaces each source informs
- why each source matters to LyX-parity planning

### 2. LyX parity mapping

The mapping artifact must include one row per mapped LyX feature or feature cluster and must record:

1. stable mapped capability ID or LyX feature ID
2. LyX capability/family
3. recommended Tiptap surface(s)
4. required editor-core responsibility
5. required non-editor backend responsibility, if any
6. fit classification
7. rationale / risks
8. source citations

### 3. Backend-library architecture

The backend-library architecture artifact must define:

1. what belongs in `editor-core`
2. what belongs in the Tiptap adapter layer
3. what belongs in canonical-model / serializer / backend services outside Tiptap
4. a proposed in-monolith file structure
5. the rules that keep Tiptap from becoming the persistence model

## Controlled Vocabularies

### Recommended Tiptap surfaces

Use only these values in the mapping artifact:

- `node`
- `mark`
- `command`
- `plugin/state management`
- `node view`
- `input/paste rule`
- `toolbar/sidebar/dialog surface`
- `document settings surface`
- `external adapter`
- `non-editor backend`

### Fit classification

Use only these values in the mapping artifact:

- `natural fit`
- `adapted fit`
- `awkward fit`
- `backend-heavy`
- `non-goal`

## Boundary Rules

The research package must assume and preserve these rules:

1. Tiptap is a UI/editor layer built on ProseMirror, not the canonical persistence model.
2. The reusable editor-core library lives inside the single Next.js monolith.
3. Tiptap JSON and HTML are transient editor-facing representations, not the canonical AST.
4. LaTeX/export logic, reference resolution, and schema-version migration are not owned by Tiptap.
5. Document class, modules, and other high-level document settings must not be modeled as ad hoc UI state without editor-core ownership.

## Completion Criteria

This workstream is complete when:

1. all canonical artifacts exist
2. the source sweep cites concrete Tiptap documentation pages
3. the mapping artifact clearly distinguishes Tiptap responsibilities from editor-core and backend responsibilities
4. the backend-library architecture aligns with the single-monolith product direction
5. the package identifies the Tiptap limitations that must shape later AST and LaTeX/live-render design
