import type { CanonicalBlock } from "./types";

export function canonicalBlockListsEqual(
  leftBlocks: CanonicalBlock[],
  rightBlocks: CanonicalBlock[],
): boolean {
  return JSON.stringify(stabilizeCanonicalValue(leftBlocks)) === JSON.stringify(stabilizeCanonicalValue(rightBlocks));
}

export function mergeCanonicalPatchBlocks(
  currentBlocks: CanonicalBlock[],
  patchBlocks: CanonicalBlock[],
): CanonicalBlock[] {
  const patchById = new Map(patchBlocks.map((block) => [block.id, block]));
  const currentIds = new Set(currentBlocks.map((block) => block.id));
  const mergedBlocks = currentBlocks.map((block) => mergeCanonicalPatchBlock(block, patchById.get(block.id)));
  const appendedBlocks = patchBlocks.filter((block) => !currentIds.has(block.id) && !isEmptyGeneratedParagraph(block));

  return [...mergedBlocks, ...appendedBlocks];
}

function mergeCanonicalPatchBlock(
  currentBlock: CanonicalBlock,
  patchBlock?: CanonicalBlock,
): CanonicalBlock {
  if (!patchBlock) {
    return currentBlock;
  }

  return {
    ...patchBlock,
    provenance: patchBlock.provenance ?? currentBlock.provenance,
    reviewState: patchBlock.reviewState ?? currentBlock.reviewState,
  } as CanonicalBlock;
}

function isEmptyGeneratedParagraph(block: CanonicalBlock): boolean {
  return block.type === "paragraph" && block.children.length === 0 && !block.provenance;
}

function stabilizeCanonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stabilizeCanonicalValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, childValue]) => [key, stabilizeCanonicalValue(childValue)]),
    );
  }

  return value;
}
