# Intellectual Kinetic Specification

## Product Definition

Intellectual Kinetic is a professional, persistence-safe, AI-assisted PDF-to-LaTeX restoration workbench for general mixed PDFs. It combines side-by-side source review, structured editing, layered OCR/AI evidence, deterministic LaTeX generation, and local PDF preview/export.

The application will be delivered as a **single server-side Next.js application codebase** running through **Docker Compose**. Supporting infrastructure containers are allowed where they improve reliability and persistence, but there should be only one application codebase.

## Current Project Context

This repository is currently specification-only:

- `docs/references/source-material/rough-plan.md` contains the broad product vision and workflow
- `docs/references/design/design-system.md` contains the UI visual system
- `docs/references/images/` contains reference screens for the major product surfaces

There is no application implementation yet.

## Core Product Principles

1. **Evidence first:** OCR output is not final truth. The system must preserve competing evidence and review state.
2. **Canonical model first:** The canonical document AST is the source of truth.
3. **Tiptap is the UI layer:** Tiptap represents and edits the document, but it is not the persistence model.
4. **Deterministic export:** Final LaTeX is generated from the canonical AST, not from free-form model output.
5. **Inspectable persistence:** Users must be able to persist and recover projects, artifacts, and review state across restarts.
6. **Human approval is first-class:** Review state and provenance must be explicit throughout the workflow.
7. **Text and images are different:** Text becomes structured editable content; images become managed/restored assets.

## Target Architecture

### Application Shape

- **One application codebase:** Next.js App Router monolith
- **One primary app service:** the Next.js server owns UI, API routes, background orchestration, and export flows
- **Supporting containers:** allowed for persistence and job infrastructure

### Docker Compose Topology

- `app`: Next.js monolith
- `postgres`: durable relational metadata store
- `redis`: job queue and transient workflow coordination
- persistent mounted volumes for uploaded PDFs, derived artifacts, generated LaTeX/PDFs, and logs

## Persistence Model

### Database

Postgres stores metadata and relationships:

- projects
- source documents
- pages
- regions
- OCR candidates
- editor blocks
- semantic blocks / canonical AST references
- assets
- AI suggestions
- review comments
- compile runs
- verification results
- provider/settings metadata

### Filesystem

Mounted persistent storage holds inspectable artifacts:

- original PDFs
- rendered pages
- cropped regions
- OCR and semantic JSON layers
- Tiptap JSON snapshots
- canonical AST snapshots
- LaTeX sources
- preview/final PDFs
- logs

## Editing and Review Model

The primary workspace is a side-by-side review interface:

- **Left:** original rendered page with regions, overlays, and provenance
- **Right:** reconstructed editable document view powered by Tiptap

Bidirectional linking is required:

- clicking a source region highlights the linked editor block
- clicking an editor block highlights the linked source region

The user must be able to:

- manually correct text
- change semantic block types
- inspect OCR alternatives
- inspect confidence/review state
- approve page and block outcomes

## Provider Model

The application must support a **pluggable provider framework** for OCR and AI correction tools.

### First-release direction

- **Cloud-assisted MVP** from day one
- **Strong starter set of built-in adapters**, not every provider at once
- **Configurable provider settings** as a first-class product surface

### Starter set

- local OCR fallback: Tesseract
- cloud OCR: one initial cloud OCR adapter behind the provider abstraction
- LLM adapters: OpenAI-compatible, Anthropic, Gemini

Provider health, credentials, and availability should be surfaced clearly in settings and diagnostics.

## Offline and Degraded Operation

When cloud providers are unavailable or not configured, the first release must still support:

- upload
- project storage
- manual editing
- local LaTeX generation
- local PDF preview/export
- local OCR fallback where available

Cloud outages should degrade gracefully instead of blocking access to project state.

## MVP Scope

The first implementation should deliver:

1. project creation/opening
2. persistent PDF upload
3. page rendering
4. basic layout detection and OCR
5. initial canonical AST creation
6. mirrored Tiptap document generation
7. side-by-side review workspace
8. manual correction and semantic block editing
9. deterministic LaTeX serialization
10. local PDF compilation and preview
11. export of `.tex` and PDF artifacts
12. persistence across container restarts
13. provider configuration UI

## Out of Scope for the First Release

- desktop shell
- microservice split
- full LyX feature parity
- full Phase 2/3 roadmap from `docs/references/source-material/rough-plan.md`
- implementing every OCR or LLM provider immediately

## Verification Requirements

### Container verification

- Docker Compose boots cleanly
- health checks show service readiness
- volumes survive restart/recreate cycles

### Application verification

- typecheck
- lint
- unit tests for AST, provenance, storage, and LaTeX serialization
- integration tests for ingest, persistence, and export
- browser-level smoke coverage for upload -> review -> export

### Workflow verification

- project data remains intact after restart
- review state remains intact after restart
- generated LaTeX/PDF can be rebuilt from persisted project state
- provider failures surface actionable diagnostics
- cloud outages fall back to the approved offline baseline

## Recommended Implementation Direction

The implementation should begin with the Compose runtime and monolith scaffold, then add persistence, ingest, review, export, provider configuration, and verification in that order.
