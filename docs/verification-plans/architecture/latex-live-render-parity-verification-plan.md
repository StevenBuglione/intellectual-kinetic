# LaTeX Live-Render Parity Verification Plan

## Purpose

This verification plan defines how to validate the LaTeX/live-render parity package.

## Canonical Artifacts Under Verification

1. `docs/specs/architecture/latex-live-render-parity-spec.md`
2. `docs/research/architecture/latex-live-render-pipeline-architecture.md`

## Verification Steps

### 1. Confirm canonical artifacts exist

```bash
test -f docs/specs/architecture/latex-live-render-parity-spec.md && \
test -f docs/research/architecture/latex-live-render-pipeline-architecture.md
```

### 2. Verify AST-first serializer ownership

```bash
rg -n "canonical AST|serializer|preamble|compile|preview|diagnostics" \
  docs/specs/architecture/latex-live-render-parity-spec.md
```

### 3. Verify preview and source-panel behavior are explicit

```bash
rg -n "source panel|stale|refresh|compile failure|preview" \
  docs/specs/architecture/latex-live-render-parity-spec.md \
  docs/research/architecture/latex-live-render-pipeline-architecture.md
```

### 4. Verify grounding in product direction

```bash
rg -n "canonical-ast-parity-spec|intellectual-kinetic-product-spec|lyx-capability-parity-sequence" \
  docs/specs/architecture/latex-live-render-parity-spec.md \
  docs/research/architecture/latex-live-render-pipeline-architecture.md
```
