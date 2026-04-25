# Documentation Information Architecture Verification Plan

**Goal:** Verify that the repository documentation cleanup moved canonical markdown under `docs/`, preserved the required taxonomy, and reduced the root markdown surface to `AGENTS.md`.

**Scope:** Documentation taxonomy skeleton, migrated markdown files, migrated image references, root navigation, and canonical path correctness.

## Filesystem verification commands

```bash
find docs -maxdepth 3 \( -type d -o -name '.gitkeep' \) | sort
test -f docs/specs/architecture/documentation-information-architecture-spec.md
test -f docs/implementation-plans/architecture/documentation-information-architecture-implementation-plan.md
test -f docs/specs/product/intellectual-kinetic-product-spec.md
test -f docs/implementation-plans/product/intellectual-kinetic-product-implementation-plan.md
test -f docs/references/design/design-system.md
test -f docs/references/source-material/rough-plan.md
test -d docs/references/images
! test -d ref-images
! test -d docs/references/images/ref-images
test "$(find docs/references/images -maxdepth 1 -type f ! -name '.gitkeep' | wc -l)" = "21"
```

Expected: all required canonical paths exist, the legacy image directory is gone, and 21 image files exist in `docs/references/images/`.

## Root markdown verification command

```bash
find . -maxdepth 1 -type f -name '*.md' | sort
```

Expected: output contains only `./AGENTS.md`.

## Link/reference verification command

```bash
rg -n "docs/specs/architecture/documentation-information-architecture-spec.md" AGENTS.md
rg -n "docs/implementation-plans/architecture/documentation-information-architecture-implementation-plan.md" AGENTS.md
rg -n "docs/specs/product/intellectual-kinetic-product-spec.md" AGENTS.md
rg -n "docs/implementation-plans/product/intellectual-kinetic-product-implementation-plan.md" AGENTS.md
rg -n "docs/verification-plans/" AGENTS.md
```

Expected: `AGENTS.md` points contributors to the canonical documentation entrypoints under `docs/`.
