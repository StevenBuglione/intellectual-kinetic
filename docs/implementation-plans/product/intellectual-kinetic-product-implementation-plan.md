# Intellectual Kinetic Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a professional, persistence-safe, Docker Compose-based AI-assisted PDF-to-LaTeX restoration workbench as a single server-side Next.js application codebase.

**Architecture:** The repository is currently spec-only, so implementation starts from a greenfield scaffold. The system will be a Next.js App Router monolith running in Docker Compose, with Postgres for metadata, Redis for jobs, and mounted persistent storage for PDFs, OCR artifacts, LaTeX sources, compiled PDFs, and logs.

**Tech Stack:** Next.js App Router, TypeScript, React, Tiptap, PDF.js, Tailwind CSS, PostgreSQL, Redis, Docker Compose, mounted persistent volumes, OCR/layout/image tooling installed in the app container, deterministic LaTeX generation with local compilation.

---

## Problem Statement

Build the first working version of Intellectual Kinetic around these agreed constraints:

- single-user local/self-hosted workspace
- one Next.js application codebase
- Docker Compose deployment
- cloud-assisted OCR/LLM support from day one
- pluggable provider framework with a strong starter set
- useful offline baseline when cloud services are unavailable
- focus on general mixed PDFs, not a specialist document niche

## Proposed Repository Layout

```text
src/
  app/
    (dashboard)/
    projects/[projectId]/
    api/
  components/
    dashboard/
    workspace/
    editor/
    review/
    settings/
  features/
    projects/
    ingest/
    pages/
    regions/
    editor/
    latex/
    review/
    settings/
  lib/
    db/
    queue/
    storage/
    pdf/
    ocr/
    layout/
    image/
    latex/
    ast/
    providers/
    validation/
  server/
    jobs/
    workflows/
  styles/
docker/
prisma/ or db/
tests/
e2e/
```

## Execution Order

### Task 1: Scaffold the monolith and Compose runtime

**Files:**
- Create: `package.json`
- Create: `next.config.*`
- Create: `tsconfig.json`
- Create: `src/app/**/*`
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`
- Create: `.env.example`

- [ ] Initialize a Next.js App Router project in TypeScript.
- [ ] Add Tailwind and encode the visual tokens from `docs/references/design/design-system.md`.
- [ ] Define Compose services for `app`, `postgres`, and `redis`.
- [ ] Add persistent volumes for database state and project artifacts.
- [ ] Add health checks and predictable startup behavior.

### Task 2: Implement database, storage, and job foundations

**Files:**
- Create: `src/lib/db/**/*`
- Create: `src/lib/storage/**/*`
- Create: `src/lib/queue/**/*`
- Create: `src/server/jobs/**/*`
- Create: `src/features/projects/**/*`

- [ ] Define schemas for projects, documents, pages, regions, OCR candidates, blocks, assets, review state, and compile runs.
- [ ] Implement persistent on-disk project workspaces backed by mounted volumes.
- [ ] Implement background job orchestration for ingest and export workflows.
- [ ] Ensure project state can be recovered after container restarts.

### Task 3: Implement ingest and evidence capture

**Files:**
- Create: `src/lib/pdf/**/*`
- Create: `src/lib/ocr/**/*`
- Create: `src/lib/layout/**/*`
- Create: `src/lib/ast/**/*`
- Create: `src/features/ingest/**/*`
- Create: `src/features/pages/**/*`

- [ ] Upload a PDF and persist it into the project workspace.
- [ ] Render pages to images.
- [ ] Run initial layout detection and OCR.
- [ ] Persist layered evidence and provenance metadata.
- [ ] Build the first canonical AST and mirrored editor JSON.

### Task 4: Build the review workspace

**Files:**
- Create: `src/components/dashboard/**/*`
- Create: `src/components/workspace/**/*`
- Create: `src/components/editor/**/*`
- Create: `src/components/review/**/*`
- Create: `src/features/editor/**/*`
- Create: `src/features/review/**/*`

- [ ] Build dashboard and project navigation.
- [ ] Build the left-right original-vs-editor workspace.
- [ ] Link source regions and editor blocks bidirectionally.
- [ ] Support manual text edits and semantic block type changes.
- [ ] Surface OCR alternatives, confidence, and review state.

### Task 5: Implement deterministic LaTeX export and preview

**Files:**
- Create: `src/lib/latex/**/*`
- Create: `src/features/latex/**/*`
- Create: `src/app/api/projects/[projectId]/export/**/*`

- [ ] Map canonical AST nodes to deterministic LaTeX serializers.
- [ ] Run local LaTeX compilation inside the app container.
- [ ] Persist generated `.tex`, compile logs, preview PDFs, and exported PDFs.
- [ ] Surface preview and compile diagnostics in the UI.

### Task 6: Implement provider configuration

**Files:**
- Create: `src/lib/providers/**/*`
- Create: `src/features/settings/**/*`
- Create: `src/components/settings/**/*`
- Modify: `.env.example`

- [ ] Create a provider abstraction for OCR and LLM adapters.
- [ ] Add a strong starter set: local Tesseract fallback, one cloud OCR adapter, OpenAI-compatible, Anthropic, and Gemini.
- [ ] Add settings UI for credentials, enablement, validation, and health.
- [ ] Ensure outage and misconfiguration states degrade gracefully.

### Task 7: Add verification and release hardening

**Files:**
- Create: `tests/**/*`
- Create: `e2e/**/*`
- Modify: `docker-compose.yml`
- Modify: documentation files added during implementation

- [ ] Add unit coverage around AST, provenance, storage, and LaTeX serialization.
- [ ] Add integration coverage for ingest, persistence, and export.
- [ ] Add browser-level smoke coverage for the core review flow.
- [ ] Verify restart persistence for Postgres state and mounted project artifacts.
- [ ] Verify offline-baseline behavior when cloud providers are unavailable.

## Verification Plan

1. **Container verification**
   - Compose boots app, Postgres, and Redis cleanly.
   - Volumes survive restart/recreate cycles.
   - Health checks make service readiness obvious.
2. **Application verification**
   - typecheck
   - lint
   - unit tests for AST, serializers, provenance mapping, and storage helpers
   - integration tests for ingest, project persistence, and export flows
   - browser smoke test for upload -> review -> export happy path
3. **Workflow verification**
   - uploaded documents still exist after restart
   - project metadata and review states remain intact after restart
   - generated LaTeX/PDF can be rebuilt from persisted project state
   - failed OCR/LaTeX jobs surface actionable error details
   - provider outage scenarios degrade gracefully to the offline baseline
4. **Operational verification**
   - environment variables are documented
   - local startup is one Docker Compose command
   - persistent data locations are explicit
   - backup/restore path is documented

## Non-Goals During Initial Implementation

- desktop packaging
- full LyX parity
- full Phase 2/3 feature delivery
- implementing every possible provider in the first iteration

## Immediate Next Task

Start with **Task 1: Scaffold the monolith and Compose runtime**. That task is now the first ready-to-execute implementation step.
