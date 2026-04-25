# Tiptap Capability and Extension Research Verification Plan

## Purpose

This verification plan defines how to validate the Tiptap research package used to guide LyX-parity editor design.

It verifies:

1. the canonical Tiptap research artifacts exist in the expected locations
2. the source sweep contains concrete Tiptap documentation sources
3. the parity mapping distinguishes Tiptap surfaces from editor-core and backend responsibilities
4. the backend-library architecture keeps the editor-core inside the monolith and does not make Tiptap the persistence model

## Canonical Artifacts Under Verification

1. `docs/research/architecture/tiptap-capability-source-sweep.md`
2. `docs/research/architecture/tiptap-lyx-parity-mapping.md`
3. `docs/research/architecture/tiptap-backend-library-architecture.md`

## Verification Steps

### 1. Confirm all canonical artifacts exist

Run:

```bash
test -f docs/research/architecture/tiptap-capability-source-sweep.md && \
test -f docs/research/architecture/tiptap-lyx-parity-mapping.md && \
test -f docs/research/architecture/tiptap-backend-library-architecture.md
```

Expected:

- command exits successfully

### 2. Verify the source sweep cites concrete Tiptap pages

Run:

```bash
rg -n "https://tiptap.dev/" docs/research/architecture/tiptap-capability-source-sweep.md
```

Expected:

- output shows concrete Tiptap URLs

### 3. Verify the mapping file contains real mapped capability rows

Run:

```bash
awk -F'|' '
function trim(s) { gsub(/^[ \t]+|[ \t]+$/, "", s); return s }
/^\| / {
  first = trim($2)
  if (first != "" && first != "lyx_feature_or_family" && first != "---") {
    print $0
    found = 1
    exit
  }
}
END { exit !found }
' docs/research/architecture/tiptap-lyx-parity-mapping.md
```

Expected:

- output prints at least one real mapping row

### 4. Verify controlled vocabularies in the mapping artifact

Run:

```bash
python - <<'PY'
from pathlib import Path

allowed_surfaces = {
    "node",
    "mark",
    "command",
    "plugin/state management",
    "node view",
    "input/paste rule",
    "toolbar/sidebar/dialog surface",
    "document settings surface",
    "external adapter",
    "non-editor backend",
}
allowed_fit = {
    "natural fit",
    "adapted fit",
    "awkward fit",
    "backend-heavy",
    "non-goal",
}

bad = False
for line in Path("docs/research/architecture/tiptap-lyx-parity-mapping.md").read_text().splitlines():
    if not line.startswith("| "):
        continue
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    if not cells or cells[0] in {"lyx_feature_or_family", "---"}:
        continue
    for token in [item.strip() for item in cells[1].split(",") if item.strip()]:
        if token not in allowed_surfaces:
            print(f"invalid tiptap surface: {token}")
            bad = True
    if cells[4] not in allowed_fit:
        print(f"invalid fit classification: {cells[4]}")
        bad = True

raise SystemExit(1 if bad else 0)
PY
```

Expected:

- command exits successfully

### 5. Verify the backend architecture preserves the monolith editor-core boundary

Run:

```bash
rg -n "editor-core|single Next.js monolith|Tiptap.*not.*persistence|canonical AST|adapter" \
  docs/research/architecture/tiptap-backend-library-architecture.md
```

Expected:

- output shows explicit statements that:
  - editor-core lives inside the monolith
  - Tiptap is not the persistence model
  - canonical AST and export logic stay outside the Tiptap adapter layer

### 6. Verify cross-references to LyX research and product direction

Run:

```bash
rg -n "lyx-capability-parity-matrix|lyx-capability-parity-sequence|intellectual-kinetic-product-spec" \
  docs/research/architecture/tiptap-lyx-parity-mapping.md \
  docs/research/architecture/tiptap-backend-library-architecture.md
```

Expected:

- output shows the Tiptap research package explicitly grounded in the existing LyX research and product spec
