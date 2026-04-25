# LyX Capability Inventory and Extraction Verification Plan

## Purpose

This verification plan defines how to validate the LyX capability inventory research package produced from `.ref/lyx`.

It verifies:

1. the canonical research artifacts exist in the expected locations
2. the parity matrix is structurally valid and contains real primary capability rows
3. supporting internal rows are complete and linked correctly
4. the sequence, open-questions, and source-sweep artifacts use the required schemas
5. citations are repository-relative and the authoritative source families were intentionally swept

## Canonical Artifacts Under Verification

1. `docs/research/architecture/lyx-capability-parity-matrix.md`
2. `docs/research/architecture/lyx-capability-parity-sequence.md`
3. `docs/research/architecture/lyx-capability-open-questions.md`
4. `docs/research/architecture/lyx-capability-source-sweep.md`

## Verification Steps

### 1. Confirm all canonical artifacts exist

Run:

```bash
test -f docs/research/architecture/lyx-capability-parity-matrix.md && \
test -f docs/research/architecture/lyx-capability-parity-sequence.md && \
test -f docs/research/architecture/lyx-capability-open-questions.md && \
test -f docs/research/architecture/lyx-capability-source-sweep.md
```

Expected:

- command exits successfully

### 2. Verify matrix family structure and supporting section placement

Run:

```bash
python - <<'PY'
from pathlib import Path

lines = Path("docs/research/architecture/lyx-capability-parity-matrix.md").read_text().splitlines()
expected_header = "| feature_id | capability | family | behavior | sources | supporting_sources | classification | classification_rationale | tiptap_impact | ast_impact | latex_render_impact | sequence | notes |"
expected_separator = "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"

supporting_indices = [i for i, line in enumerate(lines) if line.strip() == "## Supporting Internal Capabilities"]
if len(supporting_indices) != 1:
    raise SystemExit(f"expected exactly one Supporting Internal Capabilities section, found {len(supporting_indices)}")

supporting_index = supporting_indices[0]
for line in lines[supporting_index + 1:]:
    if line.startswith("## Feature Family: "):
        raise SystemExit("supporting section is not at the end of the matrix file")

for i, line in enumerate(lines):
    if line.startswith("## Feature Family: "):
        if i + 3 >= len(lines):
            raise SystemExit(f"incomplete family section: {line}")
        if lines[i + 1].strip() != "":
            raise SystemExit(f"expected blank line after family heading: {line}")
        if lines[i + 2].strip() != expected_header:
            raise SystemExit(f"missing repeated primary table header after family heading: {line}")
        if lines[i + 3].strip() != expected_separator:
            raise SystemExit(f"missing primary table separator after family heading: {line}")
PY
```

Expected:

- command exits successfully

### 3. Verify the matrix contains populated primary capability rows

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

Expected:

- output prints at least one real primary capability row

### 4. Verify required primary-row fields are populated

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
    found = 1
    if (capability == "" || family == "" || behavior == "" || sources == "" || classification == "" || classification_rationale == "" || tiptap_impact == "" || ast_impact == "" || latex_render_impact == "" || sequence == "" || notes == "") {
      print "incomplete primary row: " feature_id
      bad = 1
    }
  }
}
END { exit bad || !found }
' docs/research/architecture/lyx-capability-parity-matrix.md
```

Expected:

- command exits successfully

### 5. Verify controlled-vocabulary compliance

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
        fields = {
            "classification": cells[6],
            "sequence": cells[11],
            "tiptap_impact": cells[8],
            "ast_impact": cells[9],
            "latex_render_impact": cells[10],
        }
    elif len(cells) == 9:
        feature_id = cells[0]
        fields = {
            "tiptap_impact": cells[5],
            "ast_impact": cells[6],
            "latex_render_impact": cells[7],
        }
    else:
        continue
    for field, value in fields.items():
        for token in [item.strip() for item in value.split(",") if item.strip()]:
            if token not in allowed[field]:
                print(f"invalid {field} value for {feature_id}: {token}")
                bad = True

raise SystemExit(1 if bad else 0)
PY
```

Expected:

- command exits successfully

### 6. Verify supporting rows are complete and correctly linked

Run:

```bash
python - <<'PY'
from pathlib import Path

lines = Path("docs/research/architecture/lyx-capability-parity-matrix.md").read_text().splitlines()
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
    for linked_id in [item.strip() for item in cells[2].split(",") if item.strip()]:
        if linked_id not in feature_ids:
            print(f"supporting row links missing feature_id: {linked_id}")
            bad = True

raise SystemExit(1 if bad else 0)
PY
```

Expected:

- command exits successfully

### 7. Verify repository-relative citations

Run:

```bash
! rg -n "/home/|~/|/tmp/|[A-Za-z]:\\\\|\\bUsers/" docs/research/architecture/lyx-capability-parity-matrix.md docs/research/architecture/lyx-capability-open-questions.md docs/research/architecture/lyx-capability-source-sweep.md && \
rg -n -m 1 "\\.ref/lyx/" docs/research/architecture/lyx-capability-parity-matrix.md docs/research/architecture/lyx-capability-open-questions.md docs/research/architecture/lyx-capability-source-sweep.md
```

Expected:

- no absolute or home-relative paths are found
- repository-relative `.ref/lyx/...` citations are present

### 8. Verify sequence, open-questions, and source-sweep row completeness

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

Expected:

- command exits successfully

### 9. Verify cross-artifact link integrity

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

Expected:

- command exits successfully

### 10. Verify all authoritative source families were intentionally swept

Run:

```bash
rg -n "bundled docs|bundled examples|layouts and templates|export tests|source code" docs/research/architecture/lyx-capability-source-sweep.md
```

Expected:

- all five authoritative source families appear in the source-sweep artifact

## Completion Criteria

The research package is verified when:

1. all canonical artifacts exist
2. the matrix contains populated primary capability rows and complete supporting rows
3. the sequence, open questions, and source sweep pass schema checks
4. citations are repository-relative
5. all authoritative source families are present in the source-sweep artifact
6. cross-artifact links resolve cleanly
