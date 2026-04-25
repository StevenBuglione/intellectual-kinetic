# Full Parity Handoff Design

## Context

The repository now contains:

- the product spec for a single server-side Next.js monolith
- the completed LyX capability inventory and parity sequence
- the completed Tiptap capability and backend-library research package
- the initial Next.js monolith scaffold

Those artifacts establish the product direction and the editing-layer boundary, but they do not yet provide the final coordinated handoff package needed for a coding agent to implement the full LyX-capable editor and LaTeX rendering engine end to end.

## Goal

Produce a final coordinated architecture handoff package that is strong enough for a coding agent to implement a **Google Docs-like, visually simple, restoration-oriented editor** with:

1. full LyX parity as the implementation goal
2. an AST-first internal architecture
3. deterministic LaTeX generation and live rendered preview
4. a revealable VS Code-like LaTeX panel
5. visual validation strong enough to prove restoration-quality behavior

## Core Product Direction

The final implementation target should feel **WYSIWYG-like to the user** while remaining **AST-first under the hood**.

That means:

- users edit in a live visual editor that feels direct and modern
- Tiptap provides the interactive editing surface
- a reusable in-monolith `editor-core` library owns durable document semantics
- the canonical AST remains the source of truth
- LaTeX is generated deterministically from canonical semantics
- live PDF/rendered output is used to validate visual fidelity

This is the correct choice for book restoration because a purely browser-first WYSIWYG core would be too fragile for numbering, references, theorem structures, multilingual export, and reproducible LaTeX output.

## Persistence Contract

The final handoff package must explicitly distinguish:

1. **canonical persistence**
   - canonical AST
   - document settings
   - provenance/review metadata
   - exported artifacts and diagnostics

2. **secondary or recovery persistence**
   - Tiptap JSON snapshots used only for hydration, recovery, or debugging

Tiptap JSON may be stored as a recovery-oriented artifact, but it must never replace canonical AST as the durable semantic source of truth.

The handoff package must also define:

- when editor state is projected into canonical AST
- when canonical AST is persisted
- when Tiptap snapshots are optionally persisted
- which recovery paths rebuild the editor from canonical AST versus Tiptap snapshots

## Approved Design Rules

1. **User experience rule**  
   The delivered product must feel like a modern Google Docs-style editor with direct manipulation, low-friction editing, and immediate visual feedback.

2. **Architecture rule**  
   The system must remain AST-first internally. Tiptap is the editor adapter, not the persistence model.

3. **Rendering rule**  
   While typing, users should see a live visually coherent document surface that tracks the downstream rendered result as closely as practical.

4. **Source transparency rule**  
   A revealable VS Code-like LaTeX panel is required so users and developers can inspect generated LaTeX and related diagnostics.

5. **Design-system rule**  
   UI implementation must follow `docs/references/design/design-system.md` unless a later approved architecture artifact explicitly overrides it.

6. **Restoration-quality rule**  
   The system is not considered complete until representative book-restoration fixtures pass editing, rendering, and export validation together.

7. **Handoff rule**  
   The final package must be strong enough that a coding agent does not need to re-decide AST boundaries, rendering ownership, or validation strategy.

## Recommended Architecture

The final system should be documented as four cooperating layers inside the single Next.js monolith:

1. **Editor shell/UI**
   - Google Docs-like primary editing experience
   - side-by-side restoration workflow surfaces
   - context menus, toolbars, semantic controls, and revealable source/debug panes

2. **Tiptap adapter layer**
   - live editor instance
   - custom nodes, marks, commands, plugins, and node views
   - translation between editor gestures and editor-core commands
   - translation of editor transactions, selection changes, and content events back into editor-core notifications

3. **Editor-core + canonical AST**
   - canonical semantic model
   - document settings
   - references, numbering, validation, normalization, migrations
   - editor-to-AST and AST-to-editor conversion rules

4. **LaTeX/live-render engine**
   - deterministic serializer
   - preamble/package generation
   - compile loop
   - PDF/live preview generation
   - diagnostics and source/editor/render correlation

### Live preview architecture

The handoff package should explicitly assume a two-surface render model inside the Next.js monolith:

1. a **primary live editing surface** that remains Tiptap-based and visually coherent while the user types
2. a **rendered preview surface** fed by the LaTeX compile pipeline and shown through a PDF/document preview pane

The preview does not replace the live editor. Instead:

- the editor remains fast and interactive
- the preview remains the authority for pixel-focused LaTeX fidelity
- the implementation must define refresh behavior, stale-state indicators, and diagnostics when the preview lags or compilation fails

## Final Handoff Package Structure

The recommended handoff package is **three coordinated full-parity workstreams**, each with its own spec, implementation plan, and verification plan.

### 1. Canonical AST parity package

This package defines the durable document model and editor-core contract.

It should include:

- canonical AST spec
- implementation plan
- verification plan
- supporting research artifact(s) for node taxonomy and LyX-to-AST mapping

It must answer:

- what the canonical document model is
- how LyX capabilities map into AST structures
- what invariants the model must enforce
- how migrations/versioning work
- what belongs to editor-core vs Tiptap vs downstream export

### 2. LaTeX/live-render parity package

This package defines how canonical content becomes deterministic LaTeX and live rendered output.

It should include:

- LaTeX/live-render spec
- implementation plan
- verification plan
- supporting research artifact(s) for serializer architecture and render pipeline

It must answer:

- how AST nodes map to LaTeX
- how preamble/package generation works
- how compile loops and preview artifacts are managed
- how diagnostics map back to source/editor structures
- how the revealable LaTeX panel behaves

It must also consume an **interface-stable AST contract** from the canonical AST package rather than assuming that all implementation detail is permanently frozen before serializer work begins.

### 3. Verification and visual parity package

This package defines how the full system is validated as a restoration-quality engine.

It should include:

- verification/parity strategy spec
- implementation plan
- verification plan
- supporting research artifact(s) for fixture corpus and visual validation matrix

It must answer:

- how we validate editor behavior
- how we validate source-to-editor linking
- how we validate LaTeX/PDF/render fidelity
- which fixtures prove correctness
- which regressions block release

## Cross-Package Contract Rules

The three workstreams are sequential, but they must be coordinated by explicit interface contracts:

1. the **AST package** must define interface-stable node, settings, and invariant contracts before LaTeX/render implementation begins
2. the **LaTeX/live-render package** may reveal design pressure that requires controlled AST refinement, but not uncontrolled architectural drift
3. the **verification package** must validate the agreed interfaces across both earlier packages rather than inventing its own model

So "AST first" should be interpreted as:

- semantic ownership is fixed first
- interface contracts are fixed first
- implementation may still refine details where downstream evidence requires it, but without reopening the foundational ownership boundaries

## Execution Order

The coding agent should execute these packages in this order:

1. canonical AST parity package
2. LaTeX/live-render parity package
3. verification and visual parity package

This order ensures that:

- the semantic ownership and interface contracts are fixed before serializer work
- serializer and preview architecture are fixed before parity tests are finalized
- the coding agent inherits explicit ownership boundaries rather than inventing them while implementing

## Visual Validation Model

The handoff package should require visual validation at four levels:

### 1. Editing UX validation

- Google Docs-like document editing interactions
- immediate visual update behavior
- semantic transforms, block insertion, tables, math, floats, references
- styling validation against `docs/references/design/design-system.md`

### 2. Rendered document validation

- live rendered document view behavior
- representative fixtures for headings, theorem structures, math, tables, captions, multilingual content, and references
- checks that visually important structures survive editing and rendering
- explicit validation of the preview surface behavior, including refresh timing, stale indicators, and compile-failure states

### 3. Source/debug validation

- revealable VS Code-like LaTeX panel
- correlation between editor context and generated LaTeX
- visible diagnostics for reference, numbering, package, and compile failures

### 4. Golden-output validation

- representative book-restoration fixtures
- expected LaTeX outputs and PDF previews
- regression gates for layout drift, compile failures, numbering changes, and broken references

## Tradeoffs Considered

### Option 1: Three coordinated parity packages (recommended)

This produces the clearest coding-agent handoff and the strongest boundary control.

### Option 2: One umbrella architecture spec plus thinner plans

This would be easier to read narratively but would leave too many implementation choices implicit for a coding agent.

### Option 3: One giant spec

This would increase ambiguity, make review harder, and encourage implementation shortcuts.

## Recommendation

Use the three-package coordinated handoff structure.

That is the best way to keep:

- the UX visual and approachable
- the architecture AST-first
- the LaTeX pipeline deterministic
- the validation strategy concrete enough for restoration-quality delivery

## Immediate Next Step

The next approved step after this design is to write the detailed implementation plans for the three coordinated full-parity packages so a coding agent can execute them without reopening the core architectural decisions.
