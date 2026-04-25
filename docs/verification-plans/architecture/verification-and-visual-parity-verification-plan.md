# Verification and Visual Parity Verification Plan

## Purpose

This verification plan defines how to validate the verification and visual parity package itself.

## Canonical Artifacts Under Verification

1. `docs/specs/architecture/verification-and-visual-parity-spec.md`
2. `docs/research/architecture/visual-validation-fixture-matrix.md`

## Verification Steps

### 1. Confirm canonical artifacts exist

```bash
test -f docs/specs/architecture/verification-and-visual-parity-spec.md && \
test -f docs/research/architecture/visual-validation-fixture-matrix.md
```

### 2. Verify the fixture matrix covers the required validation targets

```bash
rg -n "heading|theorem|math|table|float|caption|reference|multilingual|source panel|review" \
  docs/research/architecture/visual-validation-fixture-matrix.md
```

### 3. Verify the spec encodes the full validation stack

```bash
rg -n "editing UX|rendered document|source/debug|golden-output|design-system" \
  docs/specs/architecture/verification-and-visual-parity-spec.md
```

### 4. Verify cross-references to upstream packages

```bash
rg -n "canonical-ast-parity-spec|latex-live-render-parity-spec|design-system|intellectual-kinetic-product-spec" \
  docs/specs/architecture/verification-and-visual-parity-spec.md \
  docs/research/architecture/visual-validation-fixture-matrix.md
```
