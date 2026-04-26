import type { CanonicalBlock } from "./types";

export function mergeCanonicalPatchBlocks(
  currentBlocks: CanonicalBlock[],
  patchBlocks: CanonicalBlock[],
): CanonicalBlock[] {
  const patchById = new Map(patchBlocks.map((block) => [block.id, block]));
  const currentIds = new Set(currentBlocks.map((block) => block.id));
  const mergedBlocks = currentBlocks.map((block) => patchById.get(block.id) ?? block);
  const appendedBlocks = patchBlocks.filter((block) => !currentIds.has(block.id));

  return [...mergedBlocks, ...appendedBlocks];
}
