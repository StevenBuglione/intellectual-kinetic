# LyX Capability Inventory and Extraction Specification

## Purpose

This specification defines the first LyX parity research workstream for Intellectual Kinetic.

Its purpose is to read the LyX codebase in `.ref/lyx`, extract the full set of shipped user-visible LyX capabilities, identify the internal mechanisms that materially support those capabilities, and produce a parity-ready matrix that can guide later Tiptap, canonical AST, and LaTeX/live-render engine design.

This is the first required sub-project for any serious LyX-parity effort. It exists to prevent later parity planning from being based on guesswork, partial memory of LyX, or a narrow reading of only one part of the LyX codebase.

## Problem

The long-term goal is high-fidelity LyX parity for a Tiptap-based editor and LaTeX/live-render engine, but LyX is a large and mature system. Its functionality is distributed across:

- user-facing documentation
- examples and templates
- layout and document definitions
- export tests
- editor/runtime code
- platform and packaging layers

Without a disciplined inventory pass, later specs will be incomplete, inconsistent, or biased toward whichever areas of LyX were easiest to inspect first.

## Goals

1. Inventory all shipped user-visible LyX capabilities.
2. Record the code and asset locations in `.ref/lyx` that define or support those capabilities.
3. Identify supporting internal capabilities when those internals materially affect parity planning.
4. Produce a parity-ready matrix rather than a loose prose catalog.
5. Classify each capability as:
   - core parity
   - adapted parity
   - deferred parity
   - non-goal
6. Recommend an implementation/parity sequence for follow-on specs and plans.

## Non-Goals

1. This spec does not design the final Tiptap implementation.
2. This spec does not define the full canonical AST.
3. This spec does not define the full LaTeX/live-render engine architecture.
4. This spec does not attempt to implement LyX parity directly.
5. This spec does not include experimental-only LyX features in the main scope.

## Scope Boundary

### In scope

- shipped user-visible LyX capabilities
- discoverable internal capabilities that materially support shipped user-visible behavior
- the evidence needed to support parity classification
- the ordering logic for future parity work

### Out of scope

- experimental-only features
- purely internal implementation details with no material parity impact
- packaging-only or platform-only details that do not affect product parity

## Authoritative Sources

The inventory must treat the following sources as authoritative **together**, not individually:

1. LyX source code under `.ref/lyx`
2. bundled docs
3. bundled examples
4. layouts and templates
5. export tests

Representative high-value source areas include:

- `.ref/lyx/lib/layouts/`
- `.ref/lyx/lib/templates/`
- `.ref/lyx/lib/tex/`
- `.ref/lyx/lib/doc/`
- `.ref/lyx/lib/examples/`
- `.ref/lyx/lib/scripts/`
- `.ref/lyx/lib/ui/`
- `.ref/lyx/autotests/export/`
- `.ref/lyx/autotests/checklatexexports/`
- relevant application/editor/runtime source areas discovered during extraction

### Source-code sweep stopping rule

The source-code sweep is bounded as follows:

1. first, extract user-visible capability candidates from docs, examples, layouts, templates, and export tests
2. then, trace those capability candidates into the application/editor/runtime source only far enough to identify the code locations that materially implement or support them
3. do not attempt an unbounded crawl of all LyX internals, packaging code, or platform support code unless those areas are directly required to explain a shipped capability

The source-code sweep is complete when every primary capability row has either:

- at least one concrete source-code citation, or
- an explicit note that the capability is currently evidenced by docs/layouts/templates/tests but still needs deeper code localization

## Evidence Rules

Each matrix row must cite concrete evidence from one or more authoritative sources.

### Minimum evidence expectation

- every user-visible capability must cite at least one concrete source location
- high-impact capabilities should cite more than one source when possible
- supporting internal rows must cite the implementation locations that justify their inclusion

### Source conflict rule

If sources appear to conflict:

1. prefer shipped user-visible behavior over inferred internal intent
2. prefer explicit layouts/templates/docs/tests over speculative code-path reading
3. note the conflict in the matrix rather than silently resolving it
4. if unresolved, classify the capability conservatively and mark it for follow-up research

## Matrix Output Requirements

The first deliverable must be a **parity-ready matrix**.

### Canonical artifact paths

This workstream should produce these canonical artifacts:

1. spec:
   - `docs/specs/architecture/lyx-capability-inventory-and-extraction-spec.md`
2. matrix:
   - `docs/research/architecture/lyx-capability-parity-matrix.md`
3. sequence:
   - `docs/research/architecture/lyx-capability-parity-sequence.md`
4. open questions and unresolved disputes:
   - `docs/research/architecture/lyx-capability-open-questions.md`
5. source-sweep coverage log:
   - `docs/research/architecture/lyx-capability-source-sweep.md`

The matrix and the recommended parity sequence must be separate artifacts so the inventory remains readable while the sequencing logic can evolve independently.

### File format

- the matrix should be a Markdown document
- grouped feature families should be section headings
- each capability row should be represented in a stable table or table-like structure
- supporting internal rows must be visibly linked to a primary capability row
- citations should use repository-relative source paths
- multi-value fields should be encoded as comma-separated controlled vocabulary values

### Granularity

- one row per distinct user-visible capability
- grouped feature families only as headings
- internal capabilities represented as supporting rows linked to a primary user-visible capability

### Split / merge rules

A capability gets its own primary row when it is:

1. independently user-visible, and
2. meaningfully selectable, configurable, or invocable by the user, and
3. likely to affect document semantics, export behavior, rendering behavior, or parity design

Do **not** merge capabilities into one row if they differ materially in:

- user-visible behavior
- document semantics
- LaTeX/export implications
- rendering implications
- implementation/parity sequence

Create separate rows for:

- option-level behaviors that change semantics or output
- per-layout or per-template capabilities when the user-visible behavior is materially different
- capabilities that share a family name but require different parity treatment

Do **not** create separate primary rows for:

- superficial aliases with no parity consequence
- purely internal mechanisms
- tiny variants that do not change semantics, output, or parity planning

### Required matrix fields

Each primary capability row must include at least:

1. feature ID
2. capability name
3. feature family/category
4. user-visible behavior summary
5. primary source location(s) in `.ref/lyx`
6. supporting source location(s), if applicable
7. parity classification:
   - core parity
   - adapted parity
   - deferred parity
   - non-goal
8. parity rationale
9. likely Tiptap impact
10. likely canonical AST impact
11. likely LaTeX/live-render engine impact
12. implementation-sequence recommendation
13. notes/risks/open questions

### Supporting internal rows

Supporting internal rows must include:

1. internal feature ID
2. internal capability name
3. linked primary feature ID(s)
4. why the internal mechanism matters for parity
5. relevant source locations
6. expected downstream impact on Tiptap / AST / LaTeX / render planning

Supporting-row impact fields should use the same controlled vocabularies defined for the primary impact rubrics wherever those rubrics apply.

### Row-linking scheme

- every primary capability row must have a stable `feature_id`
- every internal supporting row must have its own stable `internal_feature_id`
- every internal supporting row must include `linked_primary_feature_ids`
- `linked_primary_feature_ids` may contain one or more primary feature IDs
- if one internal mechanism supports multiple primary capabilities, use one supporting row when the parity implications are meaningfully the same; duplicate the supporting row only when the parity implications materially differ by linked capability

### Example primary row shape

```text
feature_id: refs-cross-reference-insert
capability: Insert cross-reference to labeled object
family: references, labels, and cross-references
behavior: User can insert a cross-reference to a labeled section/figure/table and preserve document-aware linking behavior.
sources: .ref/lyx/lib/layouts/, .ref/lyx/lib/doc/, .ref/lyx/autotests/export/
classification: core parity
classification_rationale: central structured-authoring capability with direct document and export implications
tiptap_impact: command, dialog, inline node/mark integration
ast_impact: reference/citation model
latex_render_impact: serializer mapping, compile behavior, preview behavior
sequence: foundational
notes: verify per-target-type behavior and export expectations
```

## Feature Taxonomy

The matrix should group capabilities under durable feature families. Initial families should include at least:

1. document classes and document settings
2. document structure and semantic blocks
3. text formatting and inline styles
4. math and theorem-like structures
5. tables
6. figures, images, floats, and captions
7. references, labels, and cross-references
8. citations and bibliography
9. index, glossary, and nomenclature features
10. page, layout, and flow control
11. language, encoding, and multilingual text features
12. export and rendering behavior
13. templates, layouts, and customization surfaces
14. editing workflow and user-facing control surfaces

The inventory may refine or split these families if the LyX evidence shows a better structure.

## Capability Classification Rules

### Core parity

A capability is **core parity** if it is essential to the LyX-style structured authoring model we want Intellectual Kinetic to support as a serious parity target.

### Adapted parity

A capability is **adapted parity** if the LyX behavior matters, but the final Intellectual Kinetic implementation will likely require a different UI or interaction model because we are building a server-side Next.js + Tiptap application, not a native desktop editor.

### Deferred parity

A capability is **deferred parity** if it is real, shipped, and relevant, but should be intentionally sequenced after more foundational parity work.

### Non-goal

A capability is **non-goal** if it is shipped but does not materially align with the product direction, would add disproportionate complexity, or is not a good fit for the intended architecture.

## Impact Rubrics

To reduce interpretation drift, the impact fields should use constrained values.

### Tiptap impact

Allowed values may be combined:

- none
- node
- mark
- command
- toolbar/sidebar/dialog surface
- document settings surface
- plugin/state management
- multi-surface workflow

### Canonical AST impact

Allowed values may be combined:

- none
- document metadata
- structural node
- block node
- inline model
- reference/citation model
- math model
- export-only metadata

### LaTeX/live-render engine impact

Allowed values may be combined:

- none
- serializer mapping
- preamble/package dependency
- compile behavior
- preview behavior
- diagnostics mapping
- round-trip/parity risk

### Implementation-sequence recommendation

Allowed sequence labels:

- foundational
- early
- mid
- late
- research-only

### Citation encoding

- cite repository-relative paths
- when a row has multiple citations, separate them with commas
- if a citation needs explanation, put that explanation in notes rather than inventing a second citation format

## Extraction Method

The research process must be systematic rather than opportunistic.

### Suggested extraction order

1. identify user-facing feature families from docs/examples/layouts/templates
2. map each visible feature to concrete source locations
3. confirm export/rendering implications from tests and source
4. identify internal supporting mechanisms only after the primary capability is understood
5. classify capability parity status
6. assign recommended implementation/parity sequence

### Extraction rule

Do not begin from internal implementation details and work outward unless a user-visible capability cannot otherwise be explained. The inventory is parity-oriented, so the user-visible behavior remains the primary anchor.

## Inclusion Rules for Ambiguous Capability Types

### Platform-specific shipped capabilities

Include them if they materially affect:

- document behavior
- export/render behavior
- parity expectations for the authored document

Otherwise classify them as deferred parity or non-goal, with rationale.

### Menu-only shipped capabilities

Include them if the menu action exposes a meaningful authoring, document, export, or render capability.

Do not give primary-row status to menu entries that are only navigation, convenience, or shell behavior without parity impact.

### Customization-driven shipped capabilities

Include them when the customization is enabled through shipped layouts, templates, configuration, or user-facing controls and materially changes authored output or editor semantics.

Do not exclude them merely because they are customizable rather than always-on.

### Experimental-only rule

Treat a capability as experimental-only when one or more of the following is true:

- it is clearly marked experimental, unstable, or unfinished in shipped LyX materials
- it is present only behind development/testing paths and not exposed as normal shipped user behavior
- it lacks evidence of normal shipped user-facing exposure in the authoritative docs/layouts/templates/examples/tests set

If classification is uncertain, record the dispute in the open-questions artifact instead of silently excluding the capability.

## Source-Sweep Completion Rules

The workstream is not complete until the researcher can show that each authoritative source family was intentionally swept and logged.

The source-sweep coverage log must record:

1. each authoritative source family
2. the concrete directories or files inspected
3. what capability families were extracted from that source family
4. whether the source family produced primary capability rows, supporting internal rows, disputes, or no relevant findings

At minimum, the coverage log must address:

- source code
- bundled docs
- bundled examples
- layouts and templates
- export tests

## Open-Questions Artifact Schema

Each open question or dispute entry must include at least:

1. question ID
2. linked `feature_id` or linked feature family
3. question/dispute summary
4. why the issue is unresolved
5. source locations involved
6. blocking vs non-blocking status
7. recommended next research step

## Implementation/Parity Sequence Requirement

The first spec must do more than inventory and classify. It must also recommend an implementation/parity sequence.

That sequence should:

- identify prerequisite capability families
- separate foundational parity from advanced parity
- highlight which families must be designed before Tiptap node modeling
- highlight which families must be designed before deterministic LaTeX/live-render work

### Sequence artifact minimum schema

Each sequence entry must include at least:

1. sequence item ID
2. phase label
3. linked feature family and/or linked `feature_id`s
4. prerequisite capabilities or families
5. why this item belongs in this phase
6. which downstream specs it primarily enables:
   - Tiptap parity
   - canonical AST parity
   - LaTeX/live-render parity

## Expected Deliverables

This workstream should produce:

1. a canonical spec describing the extraction method and matrix rules
2. `docs/research/architecture/lyx-capability-parity-matrix.md`
3. `docs/research/architecture/lyx-capability-parity-sequence.md`
4. `docs/research/architecture/lyx-capability-open-questions.md`
5. `docs/research/architecture/lyx-capability-source-sweep.md`

## Risks

1. LyX has accumulated mature desktop-oriented features that may not map cleanly to a web-based editing model.
2. Some behavior may be implicit across layouts, templates, and exporter code rather than documented in one place.
3. “Full parity” can become unbounded unless classifications remain disciplined.
4. Internal mechanisms can swamp the matrix if they are not kept subordinate to user-visible capability rows.

## Success Criteria

This specification is successful if:

1. a contributor can read `.ref/lyx` systematically without inventing their own taxonomy
2. the resulting matrix can directly inform later Tiptap, canonical AST, and LaTeX/live-render specs
3. every user-visible capability row has evidence and parity classification
4. internal mechanisms are captured without overwhelming the user-facing parity model
5. the spec yields a clear recommended parity sequence for follow-on work
