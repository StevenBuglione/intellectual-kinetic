# Documentation Information Architecture Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize repository documentation so all canonical markdown artifacts live under `docs/`, the required docs taxonomy exists on disk, and the repository root is reduced to a navigational `AGENTS.md`.

**Architecture:** This work is a repository-structure cleanup, not application-code implementation. The change creates the canonical `docs/` directory skeleton, moves and renames existing root markdown/reference artifacts into their correct canonical locations, adds a matching verification plan, and replaces root-level planning documents with a single `AGENTS.md` navigator that points contributors into `docs/`.

**Tech Stack:** Markdown, Git, repository filesystem layout, shell verification commands

---

## Chunk 1: Documentation cleanup implementation

### Task 1: Create the canonical docs directory skeleton

**Files:**
- Create: `docs/specs/product/.gitkeep`
- Create: `docs/specs/architecture/.gitkeep`
- Create: `docs/specs/features/.gitkeep`
- Create: `docs/specs/integrations/.gitkeep`
- Create: `docs/specs/operations/.gitkeep`
- Create: `docs/implementation-plans/product/.gitkeep`
- Create: `docs/implementation-plans/architecture/.gitkeep`
- Create: `docs/implementation-plans/features/.gitkeep`
- Create: `docs/implementation-plans/integrations/.gitkeep`
- Create: `docs/implementation-plans/operations/.gitkeep`
- Create: `docs/verification-plans/product/.gitkeep`
- Create: `docs/verification-plans/architecture/.gitkeep`
- Create: `docs/verification-plans/features/.gitkeep`
- Create: `docs/verification-plans/integrations/.gitkeep`
- Create: `docs/verification-plans/operations/.gitkeep`
- Create: `docs/decisions/product/.gitkeep`
- Create: `docs/decisions/architecture/.gitkeep`
- Create: `docs/decisions/features/.gitkeep`
- Create: `docs/decisions/integrations/.gitkeep`
- Create: `docs/decisions/operations/.gitkeep`
- Create: `docs/research/product/.gitkeep`
- Create: `docs/research/architecture/.gitkeep`
- Create: `docs/research/features/.gitkeep`
- Create: `docs/research/integrations/.gitkeep`
- Create: `docs/research/operations/.gitkeep`
- Create: `docs/references/design/.gitkeep`
- Create: `docs/references/source-material/.gitkeep`
- Create: `docs/references/images/.gitkeep`

- [ ] **Step 1: Create the missing directories and `.gitkeep` placeholders**

Run:

```bash
mkdir -p docs/specs/{product,architecture,features,integrations,operations} \
  docs/implementation-plans/{product,architecture,features,integrations,operations} \
  docs/verification-plans/{product,architecture,features,integrations,operations} \
  docs/decisions/{product,architecture,features,integrations,operations} \
  docs/research/{product,architecture,features,integrations,operations} \
  docs/references/{design,source-material,images} && \
touch docs/specs/{product,architecture,features,integrations,operations}/.gitkeep \
  docs/implementation-plans/{product,architecture,features,integrations,operations}/.gitkeep \
  docs/verification-plans/{product,architecture,features,integrations,operations}/.gitkeep \
  docs/decisions/{product,architecture,features,integrations,operations}/.gitkeep \
  docs/research/{product,architecture,features,integrations,operations}/.gitkeep \
  docs/references/{design,source-material,images}/.gitkeep
```

Expected: command exits successfully and the required taxonomy exists on disk.

- [ ] **Step 2: Verify the directory skeleton**

Run:

```bash
find docs -maxdepth 3 \( -type d -o -name '.gitkeep' \) | sort
```

Expected: output includes every required top-level docs family and scoped subfolder from the spec.

- [ ] **Step 3: Commit the directory skeleton**

Run:

```bash
git add docs && git commit -m "docs: create documentation taxonomy skeleton"
```

Expected: commit created with only taxonomy-structure additions.

### Task 2: Move canonical root markdown docs into docs

**Files:**
- Create: `docs/specs/product/intellectual-kinetic-product-spec.md`
- Create: `docs/implementation-plans/product/intellectual-kinetic-product-implementation-plan.md`
- Delete: `SPEC.md`
- Delete: `IMPLEMENTATION-PLAN.md`

- [ ] **Step 1: Move the root product spec to its canonical docs location**

Run:

```bash
git mv SPEC.md docs/specs/product/intellectual-kinetic-product-spec.md
```

Expected: root `SPEC.md` no longer exists and the product spec exists under `docs/specs/product/`.

- [ ] **Step 2: Move the root product implementation plan to its canonical docs location**

Run:

```bash
git mv IMPLEMENTATION-PLAN.md docs/implementation-plans/product/intellectual-kinetic-product-implementation-plan.md
```

Expected: root `IMPLEMENTATION-PLAN.md` no longer exists and the plan exists under `docs/implementation-plans/product/`.

- [ ] **Step 3: Update moved docs for the new canonical paths**

Edit:

- `docs/specs/product/intellectual-kinetic-product-spec.md`
- `docs/implementation-plans/product/intellectual-kinetic-product-implementation-plan.md`

Apply these exact replacements where present:

```text
ROUGH-PLAN.md -> docs/references/source-material/rough-plan.md
DESIGN.md -> docs/references/design/design-system.md
ref-images/ -> docs/references/images/
SPEC.md -> docs/specs/product/intellectual-kinetic-product-spec.md
IMPLEMENTATION-PLAN.md -> docs/implementation-plans/product/intellectual-kinetic-product-implementation-plan.md
```

Expected: the moved product docs point to canonical `docs/...` locations rather than legacy root paths.

- [ ] **Step 4: Verify the canonical product doc locations**

Run:

```bash
test -f docs/specs/product/intellectual-kinetic-product-spec.md && \
test -f docs/implementation-plans/product/intellectual-kinetic-product-implementation-plan.md && \
rg -n "docs/references/source-material/rough-plan.md|docs/references/design/design-system.md|docs/references/images" \
  docs/specs/product/intellectual-kinetic-product-spec.md \
  docs/implementation-plans/product/intellectual-kinetic-product-implementation-plan.md && \
! rg -n "ROUGH-PLAN\\.md|DESIGN\\.md|SPEC\\.md|IMPLEMENTATION-PLAN\\.md|ref-images/" \
  docs/specs/product/intellectual-kinetic-product-spec.md \
  docs/implementation-plans/product/intellectual-kinetic-product-implementation-plan.md
```

Expected: command exits successfully.

- [ ] **Step 5: Commit the canonical markdown relocation**

Run:

```bash
git add docs/specs/product/intellectual-kinetic-product-spec.md \
  docs/implementation-plans/product/intellectual-kinetic-product-implementation-plan.md && \
git commit -m "docs: move canonical product docs under docs"
```

Expected: commit created with the root product docs removed and canonical docs paths added.

### Task 3: Move legacy design and source-material references

**Files:**
- Create: `docs/references/design/design-system.md`
- Create: `docs/references/source-material/rough-plan.md`
- Delete: `DESIGN.md`
- Delete: `ROUGH-PLAN.md`

- [ ] **Step 1: Move the design-system reference doc**

Run:

```bash
git mv DESIGN.md docs/references/design/design-system.md
```

Expected: root `DESIGN.md` no longer exists and the design reference exists under `docs/references/design/`.

- [ ] **Step 2: Move the rough-plan source material**

Run:

```bash
git mv ROUGH-PLAN.md docs/references/source-material/rough-plan.md
```

Expected: root `ROUGH-PLAN.md` no longer exists and the source material exists under `docs/references/source-material/`.

- [ ] **Step 3: Verify the reference moves**

Run:

```bash
test -f docs/references/design/design-system.md && \
test -f docs/references/source-material/rough-plan.md && \
! test -f DESIGN.md && \
! test -f ROUGH-PLAN.md
```

Expected: command exits successfully.

- [ ] **Step 4: Commit the reference-doc relocation**

Run:

```bash
git add docs/references/design/design-system.md \
  docs/references/source-material/rough-plan.md && \
git commit -m "docs: move legacy root references under docs"
```

Expected: commit created with the root reference markdown removed.

### Task 4: Move image references and add root navigation

**Files:**
- Create: `AGENTS.md`
- Create: `docs/verification-plans/architecture/documentation-information-architecture-verification-plan.md`
- Create/Move: `docs/references/images/*`
- Delete: `ref-images/*`
- Delete: `ref-images/`

- [ ] **Step 1: Move the reference image directory under docs**

Run:

```bash
git mv ref-images docs/references/images
```

Expected: image assets now live under `docs/references/images/ref-images/` temporarily.

- [ ] **Step 2: Flatten the image reference directory to the intended final location**

Run:

```bash
find docs/references/images/ref-images -maxdepth 1 -type f -exec mv {} docs/references/images/ \; && \
rmdir docs/references/images/ref-images
```

Expected: image files exist directly under `docs/references/images/` and the nested `ref-images` directory is gone.

- [ ] **Step 3: Write the architecture verification plan**

Create `docs/verification-plans/architecture/documentation-information-architecture-verification-plan.md` with this exact structure:

```markdown
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
```

Expected: the verification plan file contains the exact sections, commands, and expected-output guidance above.

- [ ] **Step 4: Write the root AGENTS navigator**

Create `AGENTS.md` with this exact structure:

```markdown
# AGENTS

The important canonical project documentation lives under `docs/`.

Start here:

- `docs/specs/architecture/documentation-information-architecture-spec.md`
- `docs/implementation-plans/architecture/documentation-information-architecture-implementation-plan.md`
- `docs/specs/product/intellectual-kinetic-product-spec.md`
- `docs/implementation-plans/product/intellectual-kinetic-product-implementation-plan.md`

Verification artifacts live under:

- `docs/verification-plans/`
```

Expected: `AGENTS.md` stays short and navigational and does not duplicate full spec or plan content.

- [ ] **Step 5: Verify the final root markdown policy**

Run:

```bash
find . -maxdepth 1 -type f -name '*.md' | sort
```

Expected: output shows `./AGENTS.md` and no other root markdown files.

- [ ] **Step 6: Verify the final documentation state**

Run:

```bash
test -f docs/specs/architecture/documentation-information-architecture-spec.md && \
test -f docs/implementation-plans/architecture/documentation-information-architecture-implementation-plan.md && \
test -f docs/verification-plans/architecture/documentation-information-architecture-verification-plan.md && \
test -f docs/specs/product/intellectual-kinetic-product-spec.md && \
test -f docs/implementation-plans/product/intellectual-kinetic-product-implementation-plan.md && \
test -f AGENTS.md && \
test -d docs/references/images && \
! test -d ref-images && \
! test -d docs/references/images/ref-images && \
test "$(find docs/references/images -maxdepth 1 -type f ! -name '.gitkeep' | wc -l)" = "21" && \
rg -n "docs/specs/architecture/documentation-information-architecture-spec.md" AGENTS.md && \
rg -n "docs/implementation-plans/architecture/documentation-information-architecture-implementation-plan.md" AGENTS.md && \
rg -n "docs/specs/product/intellectual-kinetic-product-spec.md" AGENTS.md && \
rg -n "docs/implementation-plans/product/intellectual-kinetic-product-implementation-plan.md" AGENTS.md && \
rg -n "docs/verification-plans/" AGENTS.md && \
rg -ni "goal|scope|filesystem verification commands|root markdown verification command|link/reference verification command|expected:" \
  docs/verification-plans/architecture/documentation-information-architecture-verification-plan.md && \
rg -n "find docs -maxdepth 3" docs/verification-plans/architecture/documentation-information-architecture-verification-plan.md && \
rg -n "find \\. -maxdepth 1 -type f -name '\\*\\.md'" docs/verification-plans/architecture/documentation-information-architecture-verification-plan.md && \
rg -n "test -f docs/specs/architecture/documentation-information-architecture-spec.md" docs/verification-plans/architecture/documentation-information-architecture-verification-plan.md && \
rg -n "test -f docs/implementation-plans/architecture/documentation-information-architecture-implementation-plan.md" docs/verification-plans/architecture/documentation-information-architecture-verification-plan.md && \
rg -n "test -f docs/specs/product/intellectual-kinetic-product-spec.md" docs/verification-plans/architecture/documentation-information-architecture-verification-plan.md && \
rg -n "test -d docs/references/images" docs/verification-plans/architecture/documentation-information-architecture-verification-plan.md
```

Expected: command exits successfully.

- [ ] **Step 7: Commit the final cleanup state**

Run:

```bash
git add AGENTS.md \
  docs/specs/architecture/documentation-information-architecture-spec.md \
  docs/specs/product/intellectual-kinetic-product-spec.md \
  docs/implementation-plans/architecture/documentation-information-architecture-implementation-plan.md \
  docs/implementation-plans/product/intellectual-kinetic-product-implementation-plan.md \
  docs/verification-plans/architecture/documentation-information-architecture-verification-plan.md \
  docs/references/design/design-system.md \
  docs/references/source-material/rough-plan.md \
  docs/references/images && \
git commit -m "docs: finish documentation cleanup migration"
```

Expected: commit created with the final root cleanup, verification plan, navigation file, and moved images.
