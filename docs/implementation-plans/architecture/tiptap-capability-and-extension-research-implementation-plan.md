# Tiptap Capability and Extension Research Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the canonical Tiptap research package needed to plan a LyX-capability editor layer and an in-monolith reusable editor-core library.

**Architecture:** This is a research-and-documentation implementation plan. The work should begin with a bounded sweep of official Tiptap sources, then map LyX capabilities onto Tiptap surfaces, then define the backend-library/editor-core architecture, and finally verify that the resulting artifacts are consistent with the product spec and the existing LyX research package.

**Tech Stack:** Markdown, Tiptap documentation, repository docs, web fetch/search, git

---

## File Structure

**Create:**
- `docs/research/architecture/tiptap-capability-source-sweep.md` - authoritative source log for Tiptap documentation pages and capability surfaces inspected.
- `docs/research/architecture/tiptap-lyx-parity-mapping.md` - mapping from LyX capabilities to Tiptap surfaces, editor-core responsibilities, and backend responsibilities.
- `docs/research/architecture/tiptap-backend-library-architecture.md` - monolith-internal editor-core architecture, adapter boundaries, and file-structure proposal.
- `docs/verification-plans/architecture/tiptap-capability-and-extension-research-verification-plan.md` - validation steps for the research package.

**Reference only:**
- `docs/specs/architecture/tiptap-capability-and-extension-research-spec.md`
- `docs/research/architecture/lyx-capability-parity-matrix.md`
- `docs/research/architecture/lyx-capability-parity-sequence.md`
- `docs/specs/product/intellectual-kinetic-product-spec.md`
- `package.json`

## Chunk 1: Sweep Tiptap sources

### Task 1: Build the Tiptap source sweep artifact

**Files:**
- Create: `docs/research/architecture/tiptap-capability-source-sweep.md`

- [ ] Record the official Tiptap pages used for the research package.
- [ ] Note which capability surfaces each page informs: schema, commands, events, React/SSR, custom extensions, collaboration, content handling.
- [ ] Keep citations URL-based and concrete.

## Chunk 2: Map LyX capabilities to Tiptap surfaces

### Task 2: Create the LyX-to-Tiptap mapping artifact

**Files:**
- Create: `docs/research/architecture/tiptap-lyx-parity-mapping.md`

- [ ] Start from the highest-priority LyX sequence items and representative specialized items.
- [ ] For each mapped capability, record the recommended Tiptap surfaces and the required editor-core/backend responsibilities.
- [ ] Clearly label natural fits versus adapted, awkward, or backend-heavy cases.
- [ ] Call out where Tiptap alone is insufficient.

## Chunk 3: Define the reusable editor-core boundary

### Task 3: Write the backend-library architecture artifact

**Files:**
- Create: `docs/research/architecture/tiptap-backend-library-architecture.md`

- [ ] Define the monolith-internal `editor-core` boundary.
- [ ] Separate canonical-model logic, serializer/export logic, and Tiptap adapter logic.
- [ ] Propose a concrete in-repo file structure for later implementation.
- [ ] State the anti-patterns to avoid, especially treating Tiptap JSON as canonical persistence.

## Chunk 4: Verify and package the research

### Task 4: Write the verification plan and validate the package

**Files:**
- Create: `docs/verification-plans/architecture/tiptap-capability-and-extension-research-verification-plan.md`

- [ ] Verify all canonical artifacts exist.
- [ ] Verify the source sweep contains concrete Tiptap pages.
- [ ] Verify the parity mapping uses only the allowed vocabularies for Tiptap surface and fit classification.
- [ ] Verify the backend architecture keeps editor-core inside the monolith and keeps Tiptap out of the persistence role.
- [ ] Verify the package cross-references LyX artifacts and the product spec.
