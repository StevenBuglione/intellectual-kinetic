# Canonical AST Parity Verification Plan

## Purpose

This verification plan defines how to validate the canonical AST parity package.

## Canonical Artifacts Under Verification

1. `docs/specs/architecture/canonical-ast-parity-spec.md`
2. `docs/research/architecture/canonical-ast-node-taxonomy.md`

## Verification Steps

### 1. Confirm canonical artifacts exist

```bash
test -f docs/specs/architecture/canonical-ast-parity-spec.md && \
test -f docs/research/architecture/canonical-ast-node-taxonomy.md
```

### 2. Verify the AST spec preserves the persistence boundary

```bash
rg -n "canonical AST|Tiptap JSON|schema version|migration|editor-core" \
  docs/specs/architecture/canonical-ast-parity-spec.md
```

### 3. Verify the taxonomy covers high-priority LyX families

```bash
rg -n "section|math|table|float|citation|reference|document settings|language" \
  docs/research/architecture/canonical-ast-node-taxonomy.md
```

### 4. Verify grounding in existing research

```bash
rg -n "lyx-capability-parity-matrix|lyx-capability-parity-sequence|tiptap-backend-library-architecture" \
  docs/specs/architecture/canonical-ast-parity-spec.md \
  docs/research/architecture/canonical-ast-node-taxonomy.md
```
