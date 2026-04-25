# Documentation Information Architecture Specification

## Purpose

This document defines the canonical documentation structure for the Intellectual Kinetic repository. The project is large enough that root-level specification and planning files do not scale, so the repository must adopt a durable `docs/` taxonomy that can hold multiple product specs, architecture specs, feature specs, implementation plans, and verification plans over time.

## Problem

The repository started with a flat structure:

- `ROUGH-PLAN.md`
- `DESIGN.md`
- root-level `SPEC.md`
- root-level `IMPLEMENTATION-PLAN.md`
- `ref-images/`

That shape is acceptable for early ideation, but it does not scale to a large system with multiple independent subsystems, supporting architecture decisions, feature-specific workstreams, verification artifacts, and reference material. Without a consistent structure, the repository will accumulate duplicate plans, ambiguous filenames, and unclear canonical sources of truth.

## Goals

1. Create a `docs/` hierarchy that scales across many features and subsystems.
2. Make folder names communicate the **type of artifact** they contain.
3. Preserve root-level discoverability without keeping canonical design and planning documents in the root.
4. Separate canonical specs, implementation plans, and verification plans.
5. Provide a naming scheme that remains readable as the project grows.
6. Make it obvious where new artifacts should be added.

## Non-Goals

1. This spec does not define the application source-code layout.
2. This spec does not require every historical note or future ad hoc note to be normalized immediately.
3. This spec does not define the full contents of every future spec, plan, or verification artifact.

## Canonical Documentation Hierarchy

The repository should use this top-level documentation structure:

```text
docs/
  specs/
    product/
    architecture/
    features/
    integrations/
    operations/
  implementation-plans/
    product/
    architecture/
    features/
    integrations/
    operations/
  verification-plans/
    product/
    architecture/
    features/
    integrations/
    operations/
  decisions/
    product/
    architecture/
    features/
    integrations/
    operations/
  research/
    product/
    architecture/
    features/
    integrations/
    operations/
  references/
    design/
    source-material/
    images/
```

## Organizational Principle

The hierarchy is organized by **document type first**, then by **scope area**.

### Why document type first

This project will eventually have many artifacts of different kinds:

- product specs
- architecture specs
- feature specs
- implementation plans
- verification plans

Grouping by type first makes it easy to answer questions like:

- "What are all current specs?"
- "What implementation plans already exist?"
- "What verification work is planned?"

This is more maintainable than a feature-first hierarchy where specs, plans, and verification docs are interleaved under every feature directory.

## Folder Semantics

### `docs/specs/`

Canonical documents that define **what** should be built and **why**.

Subfolders:

- `product/` for project-wide product direction
- `architecture/` for cross-cutting technical/system design
- `features/` for user-facing or domain-specific feature specs
- `integrations/` for third-party or external-system contracts
- `operations/` for deployment, runtime, and operator-facing behavior specs

### `docs/implementation-plans/`

Canonical documents that define **how** approved work will be executed.

The scope categories should mirror `docs/specs/` so that related artifacts are easy to locate.

### `docs/verification-plans/`

Canonical documents that define **how** work will be proven correct.

These plans should describe test coverage, environment checks, workflow validation, persistence verification, failure-mode handling, and any release-readiness gates.

### `docs/decisions/`

Decision records for important choices that need historical traceability. `docs/decisions/` should mirror the same five scope folders as the primary canonical artifact families:

```text
docs/decisions/
  product/
  architecture/
  features/
  integrations/
  operations/
```

Use the same scope-placement rules defined later in this spec. Examples:

- product-scope prioritization choices
- runtime architecture decisions
- database choices
- provider-model decisions
- persistence strategy decisions
- feature-specific workflow tradeoff decisions
- operational backup/restore policy decisions

### `docs/research/`

Exploratory documents that inform future design but are not themselves canonical specs or plans. `docs/research/` should also mirror the same five scope folders:

```text
docs/research/
  product/
  architecture/
  features/
  integrations/
  operations/
```

The scope folder communicates what area the research informs. The filename communicates the specific topic being investigated.

### `docs/references/`

Source material and supporting assets referenced by specs and plans.

Required subfolders:

```text
docs/references/
  design/
  source-material/
  images/
```

## Scope Placement Rules

The scope folders must be used consistently so that contributors can decide where a document belongs without guesswork.

### `product/`

Use `product/` when the document defines project-wide behavior, goals, scope boundaries, roadmap slices, or user-facing outcomes that cut across the whole system.

Examples:

- overall product definition
- project-wide MVP boundaries
- end-to-end user workflow definitions

### `architecture/`

Use `architecture/` when the document defines cross-cutting technical structure shared by multiple features.

Examples:

- runtime topology
- persistence model
- provider abstraction model
- background job orchestration
- repository documentation architecture

### `features/`

Use `features/` when the document centers on one user-facing functional slice with a bounded workflow and clear feature ownership.

Examples:

- PDF ingest and review workspace
- OCR comparison panel
- LaTeX export workspace

### `integrations/`

Use `integrations/` when the document primarily describes contracts with third-party systems, external APIs, provider-specific behavior, or interoperability boundaries.

Examples:

- OpenAI-compatible provider integration
- cloud OCR adapter contract
- external storage provider integration

### `operations/`

Use `operations/` when the document primarily describes deployment, runtime operation, backup/restore, observability, security posture, or operator runbooks.

Examples:

- Docker Compose deployment behavior
- backup and restore workflow
- runtime monitoring and diagnostics

### Borderline-document rule

If a document could plausibly belong in multiple scope folders, place it according to its **primary decision surface**:

1. If it changes user-facing product behavior across the project, use `product/`.
2. If it changes shared technical foundations used by many features, use `architecture/`.
3. If it changes one bounded functional workflow, use `features/`.
4. If it primarily defines an external-system contract, use `integrations/`.
5. If it primarily defines how the system is deployed or operated, use `operations/`.

If a single proposed document has multiple primary decision surfaces, split it into separate documents rather than forcing one oversized artifact into an ambiguous location.

## Root-Level Navigation

The repository root should remain lightweight and discoverable.

Canonical design and planning documents should live under `docs/`, not in the repository root.

The root should instead expose a single navigational document:

- `AGENTS.md`

### Root file rules

1. `AGENTS.md` must be short and navigational.
2. `AGENTS.md` must explain that `docs/` contains the important canonical project information.
3. `AGENTS.md` must point contributors to the correct starting documents under `docs/`.
4. Canonical specs, implementation plans, and verification plans must not live only in the root.

## Naming Conventions

All canonical files should use descriptive kebab-case names ending with the artifact type.

Examples:

```text
docs/specs/product/intellectual-kinetic-product-spec.md
docs/specs/architecture/nextjs-monolith-runtime-spec.md
docs/specs/features/pdf-ingest-and-review-workspace-spec.md

docs/implementation-plans/product/intellectual-kinetic-product-implementation-plan.md
docs/implementation-plans/architecture/nextjs-monolith-runtime-implementation-plan.md
docs/implementation-plans/features/pdf-ingest-and-review-workspace-implementation-plan.md

docs/verification-plans/product/intellectual-kinetic-product-verification-plan.md
docs/verification-plans/architecture/nextjs-monolith-runtime-verification-plan.md
docs/verification-plans/features/pdf-ingest-and-review-workspace-verification-plan.md
```

### Naming rules

1. Use kebab-case only.
2. Put the scope in the directory path and put the document topic in the filename.
3. End the filename with `-spec.md`, `-implementation-plan.md`, or `-verification-plan.md`.
4. Avoid generic names like `plan.md`, `notes.md`, or `feature.md`.

### Supplemental artifact naming

Use the same kebab-case style for supporting directories:

```text
docs/decisions/product/
docs/decisions/architecture/
docs/decisions/features/
docs/decisions/integrations/
docs/decisions/operations/
docs/research/product/
docs/research/architecture/
docs/research/features/
docs/research/integrations/
docs/research/operations/
docs/references/design/
docs/references/source-material/
docs/references/images/
```

Decision records should use concise descriptive names, for example:

```text
docs/decisions/architecture/postgres-over-sqlite-for-persistent-metadata.md
docs/decisions/architecture/redis-for-background-jobs.md
```

Research docs should describe the investigation topic clearly, for example:

```text
docs/research/integrations/cloud-ocr-provider-comparison.md
docs/research/architecture/tectonic-vs-latexmk-evaluation.md
```

## Artifact Mapping Rule

When a workstream has a matching set of canonical artifacts, they should correspond by scope and topic:

```text
docs/specs/architecture/<topic>-spec.md
docs/implementation-plans/architecture/<topic>-implementation-plan.md
docs/verification-plans/architecture/<topic>-verification-plan.md
```

The same mapping rule applies to `product/`, `features/`, `integrations/`, and `operations/`.

## Immediate Deliverables for This Workstream

This specification governs the repository documentation taxonomy itself. The immediate deliverables for this workstream are therefore limited to the documentation information architecture, not the full first wave of product and feature authoring.

The completion target for this workstream is:

```text
docs/specs/architecture/documentation-information-architecture-spec.md
docs/implementation-plans/architecture/documentation-information-architecture-implementation-plan.md
docs/verification-plans/architecture/documentation-information-architecture-verification-plan.md
docs/
  specs/
    product/
    architecture/
    features/
    integrations/
    operations/
  implementation-plans/
    product/
    architecture/
    features/
    integrations/
    operations/
  verification-plans/
    product/
    architecture/
    features/
    integrations/
    operations/
  decisions/
    product/
    architecture/
    features/
    integrations/
    operations/
  research/
    product/
    architecture/
    features/
    integrations/
    operations/
  references/
    design/
    source-material/
    images/
AGENTS.md
```

The directory skeleton above should be created immediately as part of this workstream so contributors do not have to invent structure later. As part of the cleanup end state for this workstream, the repository root should contain only `AGENTS.md` as its markdown navigation entrypoint; canonical markdown artifacts must be moved under `docs/`.

If a directory would otherwise be empty at commit time, persist it in Git with a minimal placeholder such as `.gitkeep`. Additional canonical documents may be created on top of this structure afterward, but they are not required to count this documentation-taxonomy workstream as complete.

## Near-Term Canonical Artifact Targets

Once this taxonomy is in place, the next recommended canonical artifact families are:

```text
docs/specs/product/intellectual-kinetic-product-spec.md
docs/specs/architecture/nextjs-monolith-runtime-spec.md
docs/specs/features/pdf-ingest-and-review-workspace-spec.md

docs/implementation-plans/product/intellectual-kinetic-product-implementation-plan.md
docs/implementation-plans/architecture/nextjs-monolith-runtime-implementation-plan.md
docs/implementation-plans/features/pdf-ingest-and-review-workspace-implementation-plan.md

docs/verification-plans/product/intellectual-kinetic-product-verification-plan.md
docs/verification-plans/architecture/nextjs-monolith-runtime-verification-plan.md
docs/verification-plans/features/pdf-ingest-and-review-workspace-verification-plan.md
```

These targets are illustrative of how the taxonomy should be used next; they are not part of the minimum done criteria for this specification itself.

## Artifact Lifecycle

The expected workflow for new work is:

1. Create or update a canonical spec in `docs/specs/...`
2. Approve the design/spec
3. Create the matching implementation plan in `docs/implementation-plans/...`
4. Create the matching verification plan in `docs/verification-plans/...` whenever any of the following are true:
   - the work is cross-cutting across multiple features
   - the work affects persistence, recovery, or data integrity
   - the work changes deployment, runtime operation, or infrastructure behavior
   - the work introduces or changes third-party integrations
   - the work is risky enough that release acceptance should be explicitly documented
5. Keep root-level entrypoints updated so the current canonical docs remain discoverable

Low-risk work may omit a verification plan only when none of the criteria above are met.

Taxonomy-defining and repository-structure workstreams are not exempt from this rule; they are architecture-scope work and therefore require matching implementation planning, and they also require verification planning because they change cross-cutting repository structure and contributor workflow.

## Migration Guidance for Existing Repository Artifacts

Existing top-level materials should be rehomed under `docs/...` as part of the cleanup implementation that follows this specification.

Recommended direction:

- `DESIGN.md` -> `docs/references/design/design-system.md`
- `ROUGH-PLAN.md` -> `docs/references/source-material/rough-plan.md`
- `SPEC.md` -> `docs/specs/product/intellectual-kinetic-product-spec.md`
- `IMPLEMENTATION-PLAN.md` -> `docs/implementation-plans/product/intellectual-kinetic-product-implementation-plan.md`
- `ref-images/` -> `docs/references/images/`

During migration, temporary mixed state may exist only while the cleanup change is in progress. The intended end state after cleanup is complete is:

- canonical markdown artifacts live under `docs/`
- legacy root markdown files are removed
- `AGENTS.md` remains in root as the only markdown navigation file

### Migration handling rules

1. If a legacy root document is canonical planning or specification content, move it to the correct canonical location under `docs/` rather than copying it.
2. If a legacy root document mixes canonical content and historical/reference material, split it so canonical material moves into the correct `docs/specs/...`, `docs/implementation-plans/...`, or `docs/verification-plans/...` location and the remaining source material moves under `docs/references/...`.
3. After any move or split, update root navigation and any affected intra-repository links so contributors are directed to the new canonical path.
4. Prefer move-and-normalize over duplicate copies; once a canonical document is established under `docs/`, the old root markdown file should be removed.

## Governance Rules

1. Canonical long-form artifacts live under `docs/`, not only at the root.
2. The repository root should contain navigation only, with `AGENTS.md` as the primary contributor entrypoint.
3. New major workstreams, including documentation-taxonomy and repository-structure workstreams, must create matching specs and implementation plans, and they must also create a verification plan whenever any of the criteria in the Artifact Lifecycle verification-plan rule are met.
4. Folder names must clearly indicate the document type they hold.
5. Scope folders must communicate whether the artifact is product-wide, architecture-wide, feature-specific, integration-specific, or operations-specific.

## Success Criteria

This information architecture is successful if:

1. A contributor can quickly find all specs, all plans, or all verification docs.
2. A contributor can tell whether a doc is product-wide, architecture-wide, or feature-specific from its path alone.
3. The repository root remains readable and does not become a dumping ground for canonical planning content.
4. The structure supports many future workstreams without introducing ambiguity.

## Done Criteria for This Specification

This specification is considered complete when:

1. The canonical documentation taxonomy is defined under `docs/`.
2. The meaning of each top-level documentation folder is explicit.
3. The scope-placement rules are explicit enough to resolve borderline cases.
4. The naming rules are explicit enough that contributors can create new docs without inventing ad hoc conventions.
5. The verification-plan creation rule is explicit and consistent.
6. The scoped directory skeleton defined in Immediate Deliverables exists in the repository.
7. Root `AGENTS.md` exists and tells contributors that `docs/` contains the important canonical project information.
