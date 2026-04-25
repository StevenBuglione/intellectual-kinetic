# Canonical AST Parity Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the canonical AST and editor-core contract that make the editor, persistence layer, and LaTeX/render engine converge on one semantic model.

**Architecture:** This is a documentation-first implementation plan. The work should begin by writing the canonical node taxonomy, then lock persistence and migration rules, then define editor-core/Tiptap/AST boundaries, and finally verify that the package covers the foundational and early LyX parity families. The resulting package must be executable by a coding agent without reopening the semantic ownership question.

**Tech Stack:** Markdown, repository docs, LyX parity research artifacts, Tiptap architecture research

---

## File Structure

**Create:**
- `docs/research/architecture/canonical-ast-node-taxonomy.md`
- `docs/verification-plans/architecture/canonical-ast-parity-verification-plan.md`

**Reference and complete:**
- `docs/specs/architecture/canonical-ast-parity-spec.md`

## Chunk 1: Define the canonical node taxonomy

### Task 1: Write the AST taxonomy artifact

**Files:**
- Create: `docs/research/architecture/canonical-ast-node-taxonomy.md`

- [ ] Define top-level document settings and metadata groups.
- [ ] Define the primary canonical block and inline node families.
- [ ] Record which LyX capability families map into each taxonomy area.
- [ ] Distinguish stable semantic nodes from editor-only affordances.

## Chunk 2: Define persistence and projection rules

### Task 2: Expand the AST spec into an implementation-ready contract

**Files:**
- Modify: `docs/specs/architecture/canonical-ast-parity-spec.md`

- [ ] Define Tiptap-to-AST and AST-to-Tiptap projection expectations.
- [ ] Define schema versioning and migration responsibilities.
- [ ] Define when canonical AST is persisted versus when Tiptap snapshots may be stored secondarily.
- [ ] Define validation and normalization checkpoints in `editor-core`.

## Chunk 3: Verify the AST package

### Task 3: Create the AST verification plan

**Files:**
- Create: `docs/verification-plans/architecture/canonical-ast-parity-verification-plan.md`

- [ ] Verify the canonical artifacts exist.
- [ ] Verify the taxonomy covers foundational and early LyX parity families.
- [ ] Verify the spec explicitly keeps Tiptap out of the canonical persistence role.
- [ ] Verify persistence, migration, and projection rules are explicitly documented.
