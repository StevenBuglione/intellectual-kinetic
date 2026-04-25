# LyX Capability Inventory and Extraction Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the canonical LyX capability inventory artifacts by systematically reading `.ref/lyx` and generating a parity-ready matrix, parity sequence, open-questions log, and source-sweep coverage log.

**Architecture:** This is a research-and-documentation implementation plan, not application code. The work should proceed source-family first, with evidence captured into a stable matrix and coverage log before parity classification and sequencing are finalized. Each artifact has one responsibility: the matrix stores extracted capabilities, the sequence stores rollout order, the open-questions file stores unresolved disputes, and the source-sweep log proves the LyX evidence sweep was complete.

**Tech Stack:** Markdown, ripgrep, find, git, repository documentation structure, LyX source tree in `.ref/lyx`

---

## File Structure

**Create:**
- `docs/research/architecture/lyx-capability-parity-matrix.md` - Canonical parity-ready matrix, one row per distinct user-visible capability with supporting internal rows linked by ID.
- `docs/research/architecture/lyx-capability-parity-sequence.md` - Recommended implementation/parity sequence derived from the matrix.
- `docs/research/architecture/lyx-capability-open-questions.md` - Unresolved capability disputes, evidence conflicts, and follow-up research items.
- `docs/research/architecture/lyx-capability-source-sweep.md` - Coverage log showing every authoritative source family was intentionally swept.

**Reference only:**
- `docs/specs/architecture/lyx-capability-inventory-and-extraction-spec.md`
- `.ref/lyx/`

## Family Batch Definitions

Use these exact batch boundaries whenever a task says to work "one feature family batch at a time":

```text
Batch A:
- document classes and document settings
- document structure and semantic blocks
- text formatting and inline styles

Batch B:
- math and theorem-like structures
- tables
- figures, images, floats, and captions

Batch C:
- references, labels, and cross-references
- citations and bibliography
- index, glossary, and nomenclature features

Batch D:
- page, layout, and flow control
- language, encoding, and multilingual text features
- export and rendering behavior
- templates, layouts, and customization surfaces
- editing workflow and user-facing control surfaces
```

A batch is only complete when all relevant evidence from the current task's source families has been incorporated for every family in that batch, and the related conflicts, exclusions, open questions, and source-sweep updates for that batch have been recorded.

## Chunk 1: Scaffold research artifacts

### Task 1: Scaffold the four canonical research artifacts

**Files:**
- Create: `docs/research/architecture/lyx-capability-parity-matrix.md`
- Create: `docs/research/architecture/lyx-capability-parity-sequence.md`
- Create: `docs/research/architecture/lyx-capability-open-questions.md`
- Create: `docs/research/architecture/lyx-capability-source-sweep.md`

- [ ] **Step 1: Create the artifact directory if needed**
Run:

```bash
mkdir -p docs/research/architecture
```

Expected: `docs/research/architecture/` exists.

- [ ] **Step 2: Create the matrix file with the required header and column contract**
Write this exact starting structure to `docs/research/architecture/lyx-capability-parity-matrix.md`:

```markdown
# LyX Capability Parity Matrix

## Feature Family: document classes and document settings

| feature_id | capability | family | behavior | sources | supporting_sources | classification | classification_rationale | tiptap_impact | ast_impact | latex_render_impact | sequence | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Supporting Internal Capabilities

| internal_feature_id | internal_capability | linked_primary_feature_ids | parity_relevance | sources | tiptap_impact | ast_impact | latex_render_impact | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
```

When multiple impact values apply in `tiptap_impact`, `ast_impact`, or `latex_render_impact`, encode them as comma-separated values drawn only from the spec's controlled vocabularies.

Use these stable ID rules everywhere in the package:

```text
- feature_id: lowercase kebab-case, stable across revisions, derived from family + capability intent
- internal_feature_id: lowercase kebab-case prefixed with internal-
- never reuse an ID for a different behavior
- example feature_id: refs-cross-reference-insert
- example internal_feature_id: internal-refs-buffer-label-index
```

Matrix layout rule:

```text
- every ## Feature Family heading must be followed by the same primary-row table header and separator before any rows in that family
- repeat the primary-row table header for every family section
- keep exactly one Supporting Internal Capabilities section and table at the end of the file
```

- [ ] **Step 3: Create the sequence file with the required schema**
Write this exact starting structure to `docs/research/architecture/lyx-capability-parity-sequence.md`:

```markdown
# LyX Capability Parity Sequence

| sequence_item_id | phase | linked_family_or_feature_ids | prerequisites | rationale | enables |
| --- | --- | --- | --- | --- | --- |
```

- [ ] **Step 4: Create the open-questions file with the required schema**
Write this exact starting structure to `docs/research/architecture/lyx-capability-open-questions.md`:

```markdown
# LyX Capability Open Questions

| question_id | linked_feature_or_family | summary | unresolved_reason | sources | blocking_status | next_step |
| --- | --- | --- | --- | --- | --- | --- |
```

- [ ] **Step 5: Create the source-sweep log with the required schema**
Write this exact starting structure to `docs/research/architecture/lyx-capability-source-sweep.md`:

```markdown
# LyX Capability Source Sweep

| source_family | concrete_paths_checked | capability_families_found | output_type | notes |
| --- | --- | --- | --- | --- |
```

- [ ] **Step 6: Verify all four artifacts exist**
Run:

```bash
test -f docs/research/architecture/lyx-capability-parity-matrix.md && \
test -f docs/research/architecture/lyx-capability-parity-sequence.md && \
test -f docs/research/architecture/lyx-capability-open-questions.md && \
test -f docs/research/architecture/lyx-capability-source-sweep.md
```

Expected: command exits successfully.

- [ ] **Step 7: Commit the scaffold**
Run:

```bash
git add docs/research/architecture/lyx-capability-parity-matrix.md \
  docs/research/architecture/lyx-capability-parity-sequence.md \
  docs/research/architecture/lyx-capability-open-questions.md \
  docs/research/architecture/lyx-capability-source-sweep.md && \
git commit -m "docs: scaffold LyX capability research artifacts"
```

Expected: commit created with only the four new research artifacts.

## Chunk 2: Extract capabilities from docs, examples, layouts, and templates

### Task 2: Sweep bundled docs, examples, layouts, and templates for primary user-visible capabilities

**Files:**
- Modify: `docs/research/architecture/lyx-capability-parity-matrix.md`
- Modify: `docs/research/architecture/lyx-capability-source-sweep.md`
- Modify: `docs/research/architecture/lyx-capability-open-questions.md`

- [ ] **Step 1: Inspect bundled docs and examples**
Run:

```bash
find .ref/lyx/lib/doc .ref/lyx/lib/examples -type f | sort
```

Expected: the command prints a complete sorted manifest for bundled docs/examples, not a preview subset.

- [ ] **Step 2: Inspect layouts and templates**
Run:

```bash
find .ref/lyx/lib/layouts .ref/lyx/lib/templates -type f | sort
```

Expected: the command prints a complete sorted manifest for layouts/templates, not a preview subset.

- [ ] **Step 3: Add the baseline family headings to the matrix**
Use this exact sectioning rule:

```text
- Use the baseline family list from the spec as the starting taxonomy
- Add one markdown heading per discovered family in the form: ## Feature Family: <family name>
- Only introduce a new family or split a baseline family when the LyX evidence shows the baseline taxonomy is insufficient
- Place primary capability rows directly under the matching family heading
- Repeat the primary-row table header immediately under every family heading
- Keep the Supporting Internal Capabilities table at the end of the file only
```

Start from this minimum family set from the spec:

```text
document classes and document settings
document structure and semantic blocks
text formatting and inline styles
math and theorem-like structures
tables
figures, images, floats, and captions
references, labels, and cross-references
citations and bibliography
index, glossary, and nomenclature features
page, layout, and flow control
language, encoding, and multilingual text features
export and rendering behavior
templates, layouts, and customization surfaces
editing workflow and user-facing control surfaces
```

- [ ] **Step 4: Verify all baseline family headings are present**
Run:

```bash
python - <<'PY'
from pathlib import Path

expected = {
    "document classes and document settings",
    "document structure and semantic blocks",
    "text formatting and inline styles",
    "math and theorem-like structures",
    "tables",
    "figures, images, floats, and captions",
    "references, labels, and cross-references",
    "citations and bibliography",
    "index, glossary, and nomenclature features",
    "page, layout, and flow control",
    "language, encoding, and multilingual text features",
    "export and rendering behavior",
    "templates, layouts, and customization surfaces",
    "editing workflow and user-facing control surfaces",
}

text = Path("docs/research/architecture/lyx-capability-parity-matrix.md").read_text().splitlines()
found = {
    line.replace("## Feature Family: ", "", 1).strip()
    for line in text
    if line.startswith("## Feature Family: ")
}

missing = sorted(expected - found)
if missing:
    for item in missing:
        print(f"missing family heading: {item}")
    raise SystemExit(1)
PY
```

Expected: the command exits successfully with all baseline spec families present as headings before any optional refinements are added.

**Batch extraction requirements for bundled docs/examples and layouts/templates**
Add user-visible capability rows to `docs/research/architecture/lyx-capability-parity-matrix.md` for one feature family batch at a time using bundled docs/examples evidence. Every row must include:

```text
feature_id, capability, family, behavior, sources, supporting_sources, classification, classification_rationale, tiptap_impact, ast_impact, latex_render_impact, sequence, notes
```

When bundled docs/examples disagree internally or conflict with other evidence already captured, note that conflict in the affected matrix row `notes` field and `classification_rationale` field before adding anything to the open-questions artifact. Apply the spec's precedence rules while doing so: prefer shipped user-visible behavior over inferred internal intent, prefer explicit docs/layouts/templates/tests over speculative code-path reading, and classify conservatively if the conflict remains unresolved.

Add or refine primary capability rows for one feature family batch at a time using layouts/templates evidence. Do not collapse materially different user-visible behaviors into one row.

Apply the spec's split/merge rules while refining rows:
- separate option-level behaviors when they change semantics or output
- separate per-layout or per-template capabilities when user-visible behavior materially differs
- do not merge capabilities that differ in semantics, export/render behavior, or parity sequence

When layouts/templates conflict with docs/examples, note the conflict directly in the affected matrix row `notes` field and `classification_rationale` field. Apply the spec's precedence rules while doing so: prefer shipped user-visible behavior over inferred internal intent, prefer explicit docs/layouts/templates/tests over speculative code-path reading, and classify conservatively if the conflict remains unresolved.

For each batch below, also add `bundled docs`, `bundled examples`, and `layouts and templates` rows to the source-sweep artifact; record unresolved ambiguities in the open-questions artifact; and exclude experimental-only, packaging-only, platform-only, and purely internal non-parity capabilities, recording uncertain exclusions as open questions instead of deciding silently.

- [ ] **Step 5A: Extract bundled docs/examples primary rows for Batch A**
- [ ] **Step 5B: Refine Batch A rows with layouts/templates evidence**
- [ ] **Step 5C: Update Batch A source-sweep, ambiguity, and exclusion records**
- [ ] **Step 5D: Extract bundled docs/examples primary rows for Batch B**
- [ ] **Step 5E: Refine Batch B rows with layouts/templates evidence**
- [ ] **Step 5F: Update Batch B source-sweep, ambiguity, and exclusion records**
- [ ] **Step 5G: Extract bundled docs/examples primary rows for Batch C**
- [ ] **Step 5H: Refine Batch C rows with layouts/templates evidence**
- [ ] **Step 5I: Update Batch C source-sweep, ambiguity, and exclusion records**
- [ ] **Step 5J: Extract bundled docs/examples primary rows for Batch D**
- [ ] **Step 5K: Refine Batch D rows with layouts/templates evidence**
- [ ] **Step 5L: Update Batch D source-sweep, ambiguity, and exclusion records**

- [ ] **Step 10: Verify the first-pass matrix contains real capability rows**
Run:

```bash
awk -F'|' '
function trim(s) { gsub(/^[ \t]+|[ \t]+$/, "", s); return s }
BEGIN { in_supporting = 0 }
/^## Supporting Internal Capabilities$/ { in_supporting = 1; next }
/^\| / {
  if (in_supporting) next
  feature_id = trim($2)
  if (feature_id != "" && feature_id != "feature_id" && feature_id != "---" && feature_id != "internal_feature_id") {
    print $0
    found = 1
    exit
  }
}
END { exit !found }
' docs/research/architecture/lyx-capability-parity-matrix.md
```

Expected: output prints at least one populated primary capability row and exits successfully.

- [ ] **Step 11: Commit the first-pass extraction**
Run:

```bash
git add docs/research/architecture/lyx-capability-parity-matrix.md \
  docs/research/architecture/lyx-capability-source-sweep.md \
  docs/research/architecture/lyx-capability-open-questions.md && \
git commit -m "docs: extract first-pass LyX capabilities"
```

Expected: commit created with the first pass of capability extraction.

## Chunk 3: Integrate export and render evidence

### Task 3: Sweep export tests and render/export evidence

**Files:**
- Modify: `docs/research/architecture/lyx-capability-parity-matrix.md`
- Modify: `docs/research/architecture/lyx-capability-source-sweep.md`
- Modify: `docs/research/architecture/lyx-capability-open-questions.md`

- [ ] **Step 1: Inspect export-focused test assets**
Run:

```bash
find .ref/lyx/autotests/export .ref/lyx/autotests/checklatexexports -type f | sort
```

Expected: the command prints a complete sorted manifest for export-related tests, not a preview subset.

**Batch export-evidence requirements**
Update existing rows for one feature family batch at a time so `latex_render_impact`, `classification_rationale`, `sources`, and `notes` reflect export-test evidence where applicable. Add new primary rows when export behavior exposes distinct user-visible capabilities not yet represented in the current batch. When export tests conflict with docs/examples/layouts/templates, note that conflict directly in the affected matrix row and apply the same precedence rules as earlier extraction work.

Do not turn a test artifact into a primary capability row when it only reflects:

```text
- experimental-only behavior
- packaging-only behavior
- platform-only behavior with no parity consequence for the product
```

If the boundary is unclear, record the dispute in `docs/research/architecture/lyx-capability-open-questions.md`.

For each batch step below, also add the `export tests` row to the source-sweep artifact and record unresolved export-behavior disputes in the open-questions artifact.

- [ ] **Step 2A: Enrich Batch A rows with export/render evidence**
- [ ] **Step 2B: Add Batch A export-discovered capability rows or disputes**
- [ ] **Step 2C: Enrich Batch B rows with export/render evidence**
- [ ] **Step 2D: Add Batch B export-discovered capability rows or disputes**
- [ ] **Step 2E: Enrich Batch C rows with export/render evidence**
- [ ] **Step 2F: Add Batch C export-discovered capability rows or disputes**
- [ ] **Step 2G: Enrich Batch D rows with export/render evidence**
- [ ] **Step 2H: Add Batch D export-discovered capability rows or disputes**
- [ ] **Step 8: Verify export evidence is now represented in the matrix**
Run:

```bash
rg -n -m 1 "autotests/export|autotests/checklatexexports" docs/research/architecture/lyx-capability-parity-matrix.md
```

Expected: output shows matrix rows now citing export-test evidence.

- [ ] **Step 9: Commit the export-evidence pass**
Run:

```bash
git add docs/research/architecture/lyx-capability-parity-matrix.md \
  docs/research/architecture/lyx-capability-source-sweep.md \
  docs/research/architecture/lyx-capability-open-questions.md && \
git commit -m "docs: add LyX export evidence to parity matrix"
```

Expected: commit created with export/render evidence integrated.

## Chunk 4: Localize runtime and source evidence

### Task 4: Localize capabilities into application/editor/runtime source and add supporting internal rows

**Files:**
- Modify: `docs/research/architecture/lyx-capability-parity-matrix.md`
- Modify: `docs/research/architecture/lyx-capability-source-sweep.md`
- Modify: `docs/research/architecture/lyx-capability-open-questions.md`

- [ ] **Step 1: Search runtime/editor code for supporting implementations**
Run:

```bash
find .ref/lyx/src .ref/lyx/lib/ui .ref/lyx/lib/scripts .ref/lyx/lib/tex -type f 2>/dev/null | sort
```

Expected: the command prints the bounded default manifest for source-localization discovery, including `.ref/lyx/lib/ui/`, `.ref/lyx/lib/scripts/`, and `.ref/lyx/lib/tex/`.
If these default areas are insufficient for a shipped capability, inspect only the additional runtime/editor paths directly justified by earlier evidence or unresolved localization gaps, and record those added paths in the `source code` row of `docs/research/architecture/lyx-capability-source-sweep.md`.

**Batch runtime/source localization requirements**
For each batch, add concrete code citations to primary rows where available. For any primary row that is still evidenced by docs/layouts/templates/tests but does not yet have a concrete code citation, add the literal note marker `code_localization_pending`.

If `.ref/lyx/src`, `.ref/lyx/lib/ui`, `.ref/lyx/lib/scripts`, or `.ref/lyx/lib/tex` reveal shipped user-visible capabilities that were not visible in docs/examples/layouts/templates/tests, add new primary rows for those capabilities in the correct family section before proceeding. Treat menu-only, customization-driven, or otherwise discoverable shipped capabilities as in-scope when they materially affect product parity.

Add supporting internal rows only where they materially affect parity planning, using:

```text
internal_feature_id, internal capability name, linked primary feature ID(s), why it matters, relevant source locations, expected downstream impact
```

Use the exact supporting-row columns already scaffolded in the matrix file:

```text
internal_feature_id | internal_capability | linked_primary_feature_ids | parity_relevance | sources | tiptap_impact | ast_impact | latex_render_impact | notes
```

When code evidence conflicts with docs/examples/layouts/templates/export tests, note that conflict directly in the affected matrix row `notes` field and `classification_rationale` field. Apply the spec's precedence rules while doing so: prefer shipped user-visible behavior over inferred internal intent, prefer explicit docs/layouts/templates/tests over speculative code-path reading, and classify conservatively if the conflict remains unresolved.

For each batch step below, also update the `source code` row in the source-sweep artifact with the paths actually inspected; record unresolved localization gaps in the open-questions artifact with explicit blocking/non-blocking status; and exclude packaging-only or platform-only internals unless they materially explain a shipped capability.

- [ ] **Step 2A: Add code citations or pending markers for Batch A**
- [ ] **Step 2B: Add Batch A net-new shipped capabilities and supporting rows**
- [ ] **Step 2C: Update Batch A conflicts, source-sweep paths, and localization gaps**
- [ ] **Step 2D: Add code citations or pending markers for Batch B**
- [ ] **Step 2E: Add Batch B net-new shipped capabilities and supporting rows**
- [ ] **Step 2F: Update Batch B conflicts, source-sweep paths, and localization gaps**
- [ ] **Step 2G: Add code citations or pending markers for Batch C**
- [ ] **Step 2H: Add Batch C net-new shipped capabilities and supporting rows**
- [ ] **Step 2I: Update Batch C conflicts, source-sweep paths, and localization gaps**
- [ ] **Step 2J: Add code citations or pending markers for Batch D**
- [ ] **Step 2K: Add Batch D net-new shipped capabilities and supporting rows**
- [ ] **Step 2L: Update Batch D conflicts, source-sweep paths, and localization gaps**
- [ ] **Step 10: Verify primary rows now include code citations or explicit localization notes**
Run:

```bash
python - <<'PY'
from pathlib import Path

source_sweep = Path("docs/research/architecture/lyx-capability-source-sweep.md").read_text().splitlines()
matrix_lines = Path("docs/research/architecture/lyx-capability-parity-matrix.md").read_text().splitlines()

source_code_paths = []
for line in source_sweep:
    if not line.startswith("| "):
        continue
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    if not cells or cells[0] in {"source_family", "---"}:
        continue
    if cells[0] == "source code":
        source_code_paths = [item.strip() for item in cells[1].split(",") if item.strip()]
        break

if not source_code_paths:
    print("missing source code paths in source-sweep artifact")
    raise SystemExit(1)

bad = False
for line in matrix_lines:
    if not line.startswith("| "):
        continue
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    if not cells or cells[0] in {"feature_id", "internal_feature_id", "---"} or len(cells) != 13:
        continue
    feature_id = cells[0]
    sources = cells[4]
    supporting_sources = cells[5]
    notes = cells[12]
    cited = any(path in sources or path in supporting_sources for path in source_code_paths)
    if not cited and "code_localization_pending" not in notes:
        print(f"missing code localization coverage for feature_id: {feature_id}")
        bad = True

raise SystemExit(1 if bad else 0)
PY
```

Expected: the command exits successfully after proving each primary row cites one of the recorded `source code` paths in either `sources` or `supporting_sources`, or explicitly carries the `code_localization_pending` marker.

- [ ] **Step 11: Commit the code-localization pass**
Run:

```bash
git add docs/research/architecture/lyx-capability-parity-matrix.md \
  docs/research/architecture/lyx-capability-source-sweep.md \
  docs/research/architecture/lyx-capability-open-questions.md && \
git commit -m "docs: localize LyX capabilities into source code"
```

Expected: commit created with code-localization updates and supporting internal rows.

## Chunk 5: Finalize classification, sequence, and validation

### Task 5: Finalize parity classification and sequence

**Files:**
- Modify: `docs/research/architecture/lyx-capability-parity-matrix.md`
- Modify: `docs/research/architecture/lyx-capability-parity-sequence.md`
- Modify: `docs/research/architecture/lyx-capability-open-questions.md`
- Modify: `docs/research/architecture/lyx-capability-source-sweep.md`

**Batch normalization and sequencing requirements**
Update one feature family batch at a time so each matrix row in that batch uses only the allowed `classification` and `sequence` values:

```text
classification: core parity | adapted parity | deferred parity | non-goal
sequence: foundational | early | mid | late | research-only
```

During normalization, explicitly re-check that no row classified as a shipped capability is actually:

```text
- experimental-only
- packaging-only with no product-parity consequence
- platform-only with no product-parity consequence
```

If a row remains ambiguous after normalization, move the uncertainty into `docs/research/architecture/lyx-capability-open-questions.md` and classify conservatively. If normalization reveals a real conflict or unresolved ambiguity, note it directly in the affected matrix row `notes` field and `classification_rationale` field as well.

Update one feature family batch at a time so `tiptap_impact`, `ast_impact`, and `latex_render_impact` use only the allowed spec values. When more than one value applies in one field, encode the values as a comma-separated list using only the allowed vocabulary entries.

- [ ] **Step 3: Verify controlled-vocabulary compliance**
Run:

```bash
python - <<'PY'
from pathlib import Path

allowed = {
    "classification": {"core parity", "adapted parity", "deferred parity", "non-goal"},
    "sequence": {"foundational", "early", "mid", "late", "research-only"},
    "tiptap_impact": {"none", "node", "mark", "command", "toolbar/sidebar/dialog surface", "document settings surface", "plugin/state management", "multi-surface workflow"},
    "ast_impact": {"none", "document metadata", "structural node", "block node", "inline model", "reference/citation model", "math model", "export-only metadata"},
    "latex_render_impact": {"none", "serializer mapping", "preamble/package dependency", "compile behavior", "preview behavior", "diagnostics mapping", "round-trip/parity risk"},
}

bad = False
for line in Path("docs/research/architecture/lyx-capability-parity-matrix.md").read_text().splitlines():
    if not line.startswith("| "):
        continue
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    if not cells or cells[0] in {"feature_id", "internal_feature_id", "---"}:
        continue
    if len(cells) == 13:
        feature_id = cells[0]
        values = {
            "classification": cells[6],
            "classification_rationale": cells[7],
            "tiptap_impact": cells[8],
            "ast_impact": cells[9],
            "latex_render_impact": cells[10],
            "sequence": cells[11],
        }
        for field in ("classification", "sequence", "tiptap_impact", "ast_impact", "latex_render_impact"):
            for token in [item.strip() for item in values[field].split(",") if item.strip()]:
                if token not in allowed[field]:
                    print(f"invalid {field} value for {feature_id}: {token}")
                    bad = True
    elif len(cells) == 9:
        internal_feature_id = cells[0]
        values = {
            "tiptap_impact": cells[5],
            "ast_impact": cells[6],
            "latex_render_impact": cells[7],
        }
        for field in ("tiptap_impact", "ast_impact", "latex_render_impact"):
            for token in [item.strip() for item in values[field].split(",") if item.strip()]:
                if token not in allowed[field]:
                    print(f"invalid {field} value for {internal_feature_id}: {token}")
                    bad = True

raise SystemExit(1 if bad else 0)
PY
```

Expected: the command exits successfully with only spec-approved values used in classification, sequence, and impact fields.

Resolve near-duplicate rows one feature family batch at a time. If a duplicate cannot be cleanly resolved, note the conflict in the affected matrix row `notes` field and record it in `docs/research/architecture/lyx-capability-open-questions.md`.

Update one affected artifact section at a time so matrix rows, supporting rows, open-questions entries, and source-sweep entries use repository-relative LyX evidence citations such as `.ref/lyx/...` rather than absolute paths or shell-expanded home-directory paths.

Populate `docs/research/architecture/lyx-capability-parity-sequence.md` using:

```text
sequence_item_id, phase, linked_family_or_feature_ids, prerequisites, rationale, enables
```

Each `enables` field must explicitly name which downstream parity design work it unlocks:

```text
- Tiptap parity spec/design
- canonical AST parity spec/design
- LaTeX/live-render parity spec/design
```

Expected: the sequence explains the recommended order for later parity work rather than just listing matrix rows again.

- [ ] **Step 1A: Normalize classification and sequence for Batch A**
- [ ] **Step 1B: Normalize impacts for Batch A**
- [ ] **Step 1C: Deduplicate overlaps, normalize citations, and update sequence entries for Batch A**
- [ ] **Step 1D: Normalize classification and sequence for Batch B**
- [ ] **Step 1E: Normalize impacts for Batch B**
- [ ] **Step 1F: Deduplicate overlaps, normalize citations, and update sequence entries for Batch B**
- [ ] **Step 1G: Normalize classification and sequence for Batch C**
- [ ] **Step 1H: Normalize impacts for Batch C**
- [ ] **Step 1I: Deduplicate overlaps, normalize citations, and update sequence entries for Batch C**
- [ ] **Step 1J: Normalize classification and sequence for Batch D**
- [ ] **Step 1K: Normalize impacts for Batch D**
- [ ] **Step 1L: Deduplicate overlaps, normalize citations, and update sequence entries for Batch D**
- [ ] **Step 7: Verify source-family coverage is complete**
Ensure `docs/research/architecture/lyx-capability-source-sweep.md` covers:

```text
source code
bundled docs
bundled examples
layouts and templates
export tests
```

Run:

```bash
rg -n "bundled docs|bundled examples|layouts and templates|export tests|source code" docs/research/architecture/lyx-capability-source-sweep.md
```

Expected: all five required source families appear in the source-sweep artifact.

- [ ] **Step 8: Verify required primary-row fields are populated**
Run:

```bash
awk -F'|' '
function trim(s) { gsub(/^[ \t]+|[ \t]+$/, "", s); return s }
BEGIN { in_supporting = 0 }
/^## Supporting Internal Capabilities$/ { in_supporting = 1; next }
/^\| / {
  if (in_supporting) next
  feature_id = trim($2)
  capability = trim($3)
  family = trim($4)
  behavior = trim($5)
  sources = trim($6)
  classification = trim($8)
  classification_rationale = trim($9)
  tiptap_impact = trim($10)
  ast_impact = trim($11)
  latex_render_impact = trim($12)
  sequence = trim($13)
  notes = trim($14)
  if (feature_id != "" && feature_id != "feature_id" && feature_id != "---" && feature_id != "internal_feature_id") {
    if (capability == "" || family == "" || behavior == "" || sources == "" || classification == "" || classification_rationale == "" || tiptap_impact == "" || ast_impact == "" || latex_render_impact == "" || sequence == "" || notes == "") {
      print "incomplete primary row: " feature_id
      bad = 1
    }
    found = 1
  }
}
END { exit bad || !found }
' docs/research/architecture/lyx-capability-parity-matrix.md
```

Expected: the command exits successfully with no incomplete primary rows reported and at least one populated primary capability row present.

- [ ] **Step 9: Verify supporting internal rows are complete and correctly linked**
Run:

```bash
python - <<'PY'
from pathlib import Path

matrix_path = Path("docs/research/architecture/lyx-capability-parity-matrix.md")
lines = matrix_path.read_text().splitlines()

feature_ids = set()
internal_ids = set()
in_supporting = False
bad = False

for line in lines:
    if line.strip() == "## Supporting Internal Capabilities":
        in_supporting = True
        continue
    if not line.startswith("| "):
        continue
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    if not cells:
        continue
    first = cells[0]
    if first in {"feature_id", "internal_feature_id", "---"}:
        continue
    if in_supporting:
        internal_id, internal_capability, linked_primary, parity_relevance, sources, tiptap_impact, ast_impact, latex_render_impact, notes = cells
        if not all([internal_id, internal_capability, linked_primary, parity_relevance, sources, tiptap_impact, ast_impact, latex_render_impact, notes]):
            print(f"incomplete supporting row: {internal_id or '<missing internal_feature_id>'}")
            bad = True
        if internal_id in internal_ids:
            print(f"duplicate internal_feature_id: {internal_id}")
            bad = True
        if ".ref/lyx/" not in sources:
            print(f"supporting row lacks repository-relative implementation citation: {internal_id}")
            bad = True
        internal_ids.add(internal_id)
    else:
        feature_ids.add(first)

in_supporting = False
for line in lines:
    if line.strip() == "## Supporting Internal Capabilities":
        in_supporting = True
        continue
    if not line.startswith("| ") or not in_supporting:
        continue
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    if not cells or cells[0] in {"internal_feature_id", "---"}:
        continue
    linked_primary = cells[2]
    for linked_id in [item.strip() for item in linked_primary.split(",") if item.strip()]:
        if linked_id not in feature_ids:
            print(f"supporting row links missing feature_id: {linked_id}")
            bad = True

raise SystemExit(1 if bad else 0)
PY
```

Expected: the command exits successfully with no incomplete supporting rows, duplicate `internal_feature_id` values, or broken `linked_primary_feature_ids`.

- [ ] **Step 10: Verify sequence, open-questions, and source-sweep rows are complete**
Run:

```bash
python - <<'PY'
from pathlib import Path

checks = {
    "docs/research/architecture/lyx-capability-parity-sequence.md": ("sequence_item_id", 6),
    "docs/research/architecture/lyx-capability-open-questions.md": ("question_id", 7),
    "docs/research/architecture/lyx-capability-source-sweep.md": ("source_family", 5),
}

bad = False
for path_str, (header_name, width) in checks.items():
    for line in Path(path_str).read_text().splitlines():
        if not line.startswith("| "):
            continue
        cells = [cell.strip() for cell in line.split("|")[1:-1]]
        if not cells or cells[0] in {header_name, "---"}:
            continue
        if len(cells) != width:
            print(f"wrong column count in {path_str}: {line}")
            bad = True
            continue
        if any(cell == "" for cell in cells):
            print(f"incomplete row in {path_str}: {line}")
            bad = True
        if path_str.endswith("lyx-capability-parity-sequence.md"):
            enables = cells[5]
            allowed_targets = [
                "Tiptap parity spec/design",
                "canonical AST parity spec/design",
                "LaTeX/live-render parity spec/design",
            ]
            if not any(item in enables for item in allowed_targets):
                print(f"sequence row missing downstream enables target in {path_str}: {line}")
                bad = True

raise SystemExit(1 if bad else 0)
PY
```

Expected: every populated sequence, open-questions, and source-sweep row has the full schema and no blank fields, and every sequence row explicitly names at least one downstream parity design target.

- [ ] **Step 11: Verify repository-relative citation formats**
Run:

```bash
! rg -n "/home/|~/|/tmp/|[A-Za-z]:\\\\|\\bUsers/" docs/research/architecture/lyx-capability-parity-matrix.md docs/research/architecture/lyx-capability-open-questions.md docs/research/architecture/lyx-capability-source-sweep.md && \
rg -n -m 1 "\\.ref/lyx/" docs/research/architecture/lyx-capability-parity-matrix.md docs/research/architecture/lyx-capability-open-questions.md docs/research/architecture/lyx-capability-source-sweep.md
```

Expected: no absolute or home-relative paths are found, and repository-relative `.ref/lyx/...` citations appear in the artifacts.

- [ ] **Step 12: Verify cross-artifact IDs and references are valid**
Run:

```bash
python - <<'PY'
from pathlib import Path

matrix_lines = Path("docs/research/architecture/lyx-capability-parity-matrix.md").read_text().splitlines()
sequence_lines = Path("docs/research/architecture/lyx-capability-parity-sequence.md").read_text().splitlines()
open_lines = Path("docs/research/architecture/lyx-capability-open-questions.md").read_text().splitlines()

families = set()
feature_ids = set()
internal_ids = set()
in_supporting = False
bad = False

for line in matrix_lines:
    if line.startswith("## Feature Family: "):
        families.add(line.replace("## Feature Family: ", "", 1).strip())
        continue
    if line.strip() == "## Supporting Internal Capabilities":
        in_supporting = True
        continue
    if not line.startswith("| "):
        continue
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    if not cells or cells[0] in {"feature_id", "internal_feature_id", "---"}:
        continue
    if in_supporting:
        if cells[0] in internal_ids:
            print(f"duplicate internal_feature_id: {cells[0]}")
            bad = True
        internal_ids.add(cells[0])
    else:
        if cells[0] in feature_ids:
            print(f"duplicate feature_id: {cells[0]}")
            bad = True
        feature_ids.add(cells[0])

valid_links = families | feature_ids

for line in sequence_lines:
    if not line.startswith("| "):
        continue
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    if not cells or cells[0] in {"sequence_item_id", "---"}:
        continue
    for token in [item.strip() for item in cells[2].split(",") if item.strip()]:
        if token not in valid_links:
            print(f"sequence link target missing from matrix: {token}")
            bad = True

for line in open_lines:
    if not line.startswith("| "):
        continue
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    if not cells or cells[0] in {"question_id", "---"}:
        continue
    link_target = cells[1]
    if link_target and link_target not in valid_links:
        print(f"open question link target missing from matrix: {link_target}")
        bad = True

raise SystemExit(1 if bad else 0)
PY
```

Expected: the command exits successfully with unique `feature_id` and `internal_feature_id` values and no broken family/feature links in the sequence or open-questions artifacts.

- [ ] **Step 13: Verify final matrix structure is still valid**
Run:

```bash
python - <<'PY'
from pathlib import Path

lines = Path("docs/research/architecture/lyx-capability-parity-matrix.md").read_text().splitlines()
supporting_indices = [i for i, line in enumerate(lines) if line.strip() == "## Supporting Internal Capabilities"]
bad = False

if len(supporting_indices) != 1:
    print(f"expected exactly one Supporting Internal Capabilities section, found {len(supporting_indices)}")
    bad = True
else:
    supporting_index = supporting_indices[0]
    for line in lines[supporting_index + 1:]:
        if line.startswith("## Feature Family: "):
            print("supporting section is not at the end of the matrix file")
            bad = True
            break

for i, line in enumerate(lines):
    if line.startswith("## Feature Family: "):
        expected_header = "| feature_id | capability | family | behavior | sources | supporting_sources | classification | classification_rationale | tiptap_impact | ast_impact | latex_render_impact | sequence | notes |"
        expected_separator = "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"
        if i + 2 >= len(lines) or lines[i + 1].strip() != "" or lines[i + 2].strip() != expected_header:
            print(f"family heading missing repeated primary table header: {line}")
            bad = True
            continue
        if i + 3 >= len(lines) or lines[i + 3].strip() != expected_separator:
            print(f"family heading missing primary table separator: {line}")
            bad = True

raise SystemExit(1 if bad else 0)
PY
```

Expected: the matrix still has exactly one supporting section at the end, and every family heading still carries the repeated primary table header and separator.

- [ ] **Step 14: Verify the matrix, sequence, open questions, and source sweep all exist and contain substantive content**
Run:

```bash
test -f docs/research/architecture/lyx-capability-parity-matrix.md && \
test -f docs/research/architecture/lyx-capability-parity-sequence.md && \
test -f docs/research/architecture/lyx-capability-open-questions.md && \
test -f docs/research/architecture/lyx-capability-source-sweep.md && \
awk -F'|' '
function trim(s) { gsub(/^[ \t]+|[ \t]+$/, "", s); return s }
BEGIN { in_supporting = 0 }
/^## Supporting Internal Capabilities$/ { in_supporting = 1; next }
/^\| / {
  if (in_supporting) next
  first = trim($2)
  if (first != "" && first != "feature_id" && first != "---" && first != "internal_feature_id") found = 1
}
END { exit !found }
' docs/research/architecture/lyx-capability-parity-matrix.md && \
awk -F'|' '
function trim(s) { gsub(/^[ \t]+|[ \t]+$/, "", s); return s }
/^\| / {
  first = trim($2)
  if (first != "" && first != "sequence_item_id" && first != "---") found = 1
}
END { exit !found }
' docs/research/architecture/lyx-capability-parity-sequence.md && \
awk -F'|' '
function trim(s) { gsub(/^[ \t]+|[ \t]+$/, "", s); return s }
/^\| / {
  first = trim($2)
  if (first != "" && first != "source_family" && first != "---") found = 1
}
END { exit !found }
' docs/research/architecture/lyx-capability-source-sweep.md
```

Expected: the matrix, sequence, and source-sweep artifacts exist and each contains populated rows beyond the table header. The open-questions artifact exists and may contain either populated rows or only the schema header if no unresolved questions remain.

- [ ] **Step 15: Commit the finalized LyX capability inventory package**
Run:

```bash
git add docs/research/architecture/lyx-capability-parity-matrix.md \
  docs/research/architecture/lyx-capability-parity-sequence.md \
  docs/research/architecture/lyx-capability-open-questions.md \
  docs/research/architecture/lyx-capability-source-sweep.md && \
git commit -m "docs: finalize LyX capability parity inventory"
```

Expected: commit created with the completed matrix, sequence, source sweep, and open questions artifacts.
