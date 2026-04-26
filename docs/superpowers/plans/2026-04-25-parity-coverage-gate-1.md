# Parity Coverage Gate 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first explicit LyX/Tiptap parity coverage gate for common document structures beyond headings, paragraphs, theorem, and math.

**Architecture:** Extend canonical AST first, then update Tiptap projection, LaTeX serialization, preview text parity, and fixture verification. Add a capability registry so the app can distinguish verified support from partial or unsupported document families.

**Tech Stack:** Next.js, TypeScript, Tiptap JSON adapter, Vitest, pdflatex, Poppler.

---

## Chunk 1: Gate 1 Core

### Task 1: Capability Registry

**Files:**
- Create: `src/lib/editor-core/capabilities.ts`
- Test: `src/lib/editor-core/__tests__/capabilities.test.ts`

- [ ] Write failing tests for supported Gate 1 families and unsupported future families.
- [ ] Implement a typed registry with status and fixture requirements.
- [ ] Run the focused capability test.

### Task 2: Canonical AST Families

**Files:**
- Modify: `src/lib/editor-core/types.ts`
- Modify: `src/lib/editor-core/canonical-document.ts`
- Modify: `src/lib/editor-core/plaintext.ts`
- Test: `src/lib/editor-core/__tests__/canonical-document.test.ts`

- [ ] Write failing validation tests for lists, tables, figures/captions, and page breaks.
- [ ] Add AST types and zod validation.
- [ ] Update editor text projection.
- [ ] Run focused editor-core tests.

### Task 3: Fixture Coverage

**Files:**
- Create: `src/fixtures/parity/gate-one-structure.ts`
- Modify: `src/lib/verification/fixture-runner.ts`
- Test: `src/lib/verification/__tests__/fixture-runner.test.ts`

- [ ] Add a Gate 1 fixture that includes list, table, figure/caption, reference, and page break.
- [ ] Include it in fixture verification.
- [ ] Assert the fixture passes all existing parity checks.

### Task 4: Tiptap and LaTeX Projection

**Files:**
- Modify: `src/lib/tiptap-adapter/projection.ts`
- Test: `src/lib/tiptap-adapter/__tests__/projection.test.ts`
- Modify: `src/lib/latex/serializer.ts`
- Test: `src/lib/latex/__tests__/serializer.test.ts`
- Test: `src/lib/latex/__tests__/compiler.test.ts`

- [ ] Add failing projection and serialization tests for Gate 1 fixture.
- [ ] Implement projection support using Tiptap-native list/table/image-ish nodes where possible.
- [ ] Implement deterministic LaTeX for lists, tables, figure placeholders/captions, references, and page breaks.
- [ ] Run focused adapter, serializer, and compiler tests.

### Task 5: Verification

**Files:**
- Existing project files only.

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run verify:fixtures`.
- [ ] Run `npm run build`.
- [ ] Run `docker compose build app`.
- [ ] Commit the implementation.
