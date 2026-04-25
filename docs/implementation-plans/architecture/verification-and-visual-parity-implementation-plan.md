# Verification and Visual Parity Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the fixture corpus, visual validation surfaces, and release-blocking parity gates that prove the final editor works for restoration-quality workflows.

**Architecture:** This is a documentation-first implementation plan. The work should begin with the fixture matrix, then define validation layers and release gates, then define the commands and expectations for browser, source-linking, render, and golden-output validation. The final package should let a coding agent build the verification harness without inventing its own success criteria.

**Tech Stack:** Markdown, product spec, design system, AST package, LaTeX/render package

---

## File Structure

**Create:**
- `docs/research/architecture/visual-validation-fixture-matrix.md`
- `docs/verification-plans/architecture/verification-and-visual-parity-verification-plan.md`

**Reference and complete:**
- `docs/specs/architecture/verification-and-visual-parity-spec.md`

## Chunk 1: Define the fixture matrix

### Task 1: Write the visual validation fixture matrix

**Files:**
- Create: `docs/research/architecture/visual-validation-fixture-matrix.md`

- [ ] Define representative fixture categories by capability family.
- [ ] Record which fixtures exercise editing, source-linking, preview, and final export behavior.
- [ ] Identify which fixtures are release-blocking.

## Chunk 2: Define validation contracts

### Task 2: Expand the verification spec into an implementation-ready contract

**Files:**
- Modify: `docs/specs/architecture/verification-and-visual-parity-spec.md`

- [ ] Define expected browser-level validation behavior.
- [ ] Define source-region/editor-block linking validation behavior.
- [ ] Define preview/PDF golden-output validation behavior.
- [ ] Define how design-system conformance is checked.

## Chunk 3: Verify the verification package

### Task 3: Create the verification-package verification plan

**Files:**
- Create: `docs/verification-plans/architecture/verification-and-visual-parity-verification-plan.md`

- [ ] Verify the canonical artifacts exist.
- [ ] Verify the fixture matrix covers the required capability families.
- [ ] Verify visual, semantic, and output validation layers are all represented.
- [ ] Verify the package cross-references the AST package, render package, and design system.
