# Tiptap Backend Library Architecture

## Purpose

This document defines how the future Tiptap editing layer should be constrained by a reusable editor-core library inside the single Next.js monolith.

The key design rule is simple:

**Tiptap is the editor adapter, not the persistence model and not the canonical document model.**

## Architectural Position

The product spec already fixes the outer boundary:

- one application codebase
- one server-side Next.js monolith
- Tiptap as the UI editing layer
- canonical AST and deterministic LaTeX export as downstream responsibilities

That means the editor stack should be layered as:

1. **editor-core** inside the monolith
2. **Tiptap adapter** that hydrates and drives the live editor
3. **canonical AST / export services** outside the Tiptap adapter

## Responsibilities by Layer

### 1. `editor-core`

`editor-core` owns the reusable editing semantics that should not depend on React component structure or Tiptap widget details.

It should own:

- document settings and capability gating
- semantic block and inline capability registry
- editor-facing command semantics
- normalization rules
- schema versioning and migration rules
- reference/label identity rules
- numberable object policies
- mapping between canonical AST concepts and editor concepts
- validation rules that apply before persistence or export

It should **not** own:

- direct DOM rendering
- React menus or toolbar components
- direct editor instantiation

### 2. Tiptap adapter layer

The Tiptap adapter should:

- instantiate the editor
- register nodes, marks, commands, plugins, and node views
- translate UI gestures into editor-core commands
- translate editor transactions and events into editor-core notifications
- expose current editor state to the React layer

It should **not** decide:

- canonical persistence format
- LaTeX serializer behavior
- cross-document relationships
- bibliography engine decisions
- compile-time diagnostics logic

### 3. Canonical AST and export services

These layers should stay outside the Tiptap adapter and consume editor-core outputs rather than raw Tiptap state wherever possible.

They should own:

- canonical AST persistence
- AST validation beyond live-editor constraints
- LaTeX serializer mapping
- compile/render pipeline
- export diagnostics
- project-level orchestration such as master-document linking

## Content Boundary Rules

### Canonical

Treat these as canonical or durable:

- editor-core document settings
- canonical AST
- persisted review/provenance metadata
- exported LaTeX/PDF artifacts

### Transient

Treat these as transient:

- Tiptap editor instance state
- Tiptap JSON snapshots used only for hydration or session recovery
- DOM-specific node-view state
- menu and toolbar selection state

## Recommended In-Monolith File Structure

```text
src/
  lib/
    editor-core/
      capabilities/
        capability-registry.ts
        feature-gates.ts
      document-settings/
        document-settings.ts
        document-class-policy.ts
        module-policy.ts
      commands/
        editor-command-types.ts
        command-dispatch.ts
      schema/
        editor-schema.ts
        schema-version.ts
        migrations.ts
      references/
        label-registry.ts
        numbering-policy.ts
      normalization/
        normalize-editor-state.ts
      validation/
        validate-editor-document.ts
      adapters/
        tiptap/
          build-extensions.ts
          build-node-views.ts
          bind-editor-events.ts
          map-tiptap-json.ts
      projections/
        ast/
          editor-to-ast.ts
          ast-to-editor.ts
    latex/
      serializer/
      compile/
    persistence/
      projects/
      documents/
```

## Why This Boundary Matters

### 1. Tiptap schema changes must not equal persistence migrations

If Tiptap extension changes are allowed to directly define persistence structure, every extension tweak becomes a storage migration problem.

The editor-core layer prevents that by making schema/versioning decisions explicit.

### 2. LyX-grade semantics are broader than live editing

LyX capabilities like:

- document classes
- modules
- labels and references
- theorem numbering
- bibliography engine behavior
- multilingual export constraints
- custom preamble behavior

all exceed what should be left to a browser-only editor instance.

### 3. LaTeX export must stay deterministic

The product spec requires deterministic LaTeX generation. That is only credible if export logic reads from canonical/editor-core controlled semantics, not from ad hoc UI state inside Tiptap.

## Tiptap Surface Guidance

### Natural Tiptap surfaces

Good uses of Tiptap include:

- semantic block nodes
- inline marks
- custom commands
- node views for specialized interactive blocks
- plugin state for live editor concerns
- paste/input rules for ergonomic editing

### Surfaces that should stay editor-core or backend owned

These should not become Tiptap-owned truths:

- document class selection
- module registries
- export package rules
- reference resolution
- bibliography engine decisions
- master-document composition
- compile diagnostics and preview orchestration

## Anti-Patterns

Avoid these:

1. **Persisting raw Tiptap JSON as the only durable source of truth**
2. **Encoding all document settings as ad hoc extension-local UI state**
3. **Making node views responsible for canonical semantic meaning**
4. **Letting React menus own editor semantics that should be reusable commands**
5. **Treating collaboration or history plugins as substitutes for canonical audit/review state**

## Downstream Implications

This architecture should drive later implementation work in this order:

1. define editor-core capability and schema boundaries
2. implement Tiptap adapter extensions against those boundaries
3. wire canonical AST conversion
4. wire deterministic LaTeX export
5. add collaborative and specialized workflows without collapsing the boundaries

## Research Inputs

This architecture is grounded in:

- `docs/research/architecture/lyx-capability-parity-matrix.md`
- `docs/research/architecture/lyx-capability-parity-sequence.md`
- `docs/specs/product/intellectual-kinetic-product-spec.md`
- `https://tiptap.dev/docs/editor/api/editor`
- `https://tiptap.dev/docs/editor/api/commands`
- `https://tiptap.dev/docs/editor/api/events`
- `https://tiptap.dev/docs/editor/core-concepts/schema`
- `https://tiptap.dev/docs/editor/extensions/custom-extensions`
- `https://tiptap.dev/docs/hocuspocus/guides/collaborative-editing`
