import { pageLayoutContract, pagePixelCount } from "@/lib/layout/page-layout-contract";

export type VisualParityRatchet = {
  fixtureId: string;
  maxDifferentPixels: number;
  maxNormalizedDifference: number;
  maxRootMeanSquareDifference: number;
  targetDifferentPixels: number;
};

export const visualParityRatchets = {
  "fixture-restoration-foundation": createRatchet("fixture-restoration-foundation", 11_600, 0.068),
  "fixture-gate-one-structure": createRatchet("fixture-gate-one-structure", 107_000, 0.112),
  "fixture-gate-two-scholarly": createRatchet("fixture-gate-two-scholarly", 21_700, 0.092),
  "fixture-gate-three-layout": createRatchet("fixture-gate-three-layout", 105_000, 0.125),
  "fixture-gate-four-lyx-core": createRatchet("fixture-gate-four-lyx-core", 23_000, 0.092),
  "fixture-gate-five-lyx-breadth": createRatchet("fixture-gate-five-lyx-breadth", 58_000, 0.175),
} satisfies Record<string, VisualParityRatchet>;

export function getVisualParityRatchet(fixtureId: string): VisualParityRatchet | undefined {
  return visualParityRatchets[fixtureId as keyof typeof visualParityRatchets];
}

function createRatchet(
  fixtureId: string,
  maxDifferentPixels: number,
  maxRootMeanSquareDifference: number,
): VisualParityRatchet {
  return {
    fixtureId,
    maxDifferentPixels,
    maxNormalizedDifference: maxDifferentPixels / pagePixelCount,
    maxRootMeanSquareDifference,
    targetDifferentPixels: pageLayoutContract.targets.pixelPerfectDifferentPixels,
  };
}
