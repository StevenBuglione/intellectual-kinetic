# LaTeX Live-Render Parity Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the deterministic serializer, compile loop, preview model, diagnostics mapping, and source-panel behavior for the full LyX-parity editor.

**Architecture:** This is a documentation-first implementation plan. The work should start by describing the serializer and render pipeline architecture, then lock preview update semantics and diagnostics rules, then define the VS Code-like source panel behavior, and finally verify that the package consumes the canonical AST contract instead of bypassing it.

**Tech Stack:** Markdown, canonical AST package, product spec, LyX/Tiptap research artifacts

---

## File Structure

**Create:**
- `docs/research/architecture/latex-live-render-pipeline-architecture.md`
- `docs/verification-plans/architecture/latex-live-render-parity-verification-plan.md`

**Reference and complete:**
- `docs/specs/architecture/latex-live-render-parity-spec.md`

## Chunk 1: Define serializer and pipeline architecture

### Task 1: Write the render pipeline research artifact

**Files:**
- Create: `docs/research/architecture/latex-live-render-pipeline-architecture.md`

- [ ] Define AST-to-LaTeX serializer stages.
- [ ] Define preamble/package generation stages.
- [ ] Define compile, preview, and export artifact stages.
- [ ] Define the handoff between editor-core and render services.

## Chunk 2: Define preview and diagnostics contracts

### Task 2: Expand the render spec into an implementation-ready contract

**Files:**
- Modify: `docs/specs/architecture/latex-live-render-parity-spec.md`

- [ ] Define refresh and stale-preview rules.
- [ ] Define compile-failure handling and diagnostics surfaces.
- [ ] Define source-panel reveal behavior and correlation to editor state.
- [ ] Define which outputs are persisted and how they are named conceptually.

## Chunk 3: Verify the render package

### Task 3: Create the render verification plan

**Files:**
- Create: `docs/verification-plans/architecture/latex-live-render-parity-verification-plan.md`

- [ ] Verify the canonical artifacts exist.
- [ ] Verify the spec references the AST package and does not bypass it.
- [ ] Verify preview, diagnostics, and source-panel behavior are explicit.
- [ ] Verify the package can support golden-output validation later.
