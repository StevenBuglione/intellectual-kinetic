import { pageLayoutContract, pagePixelCount } from "@/lib/layout/page-layout-contract";

export type VisualParityRatchet = {
  fixtureId: string;
  maxDifferentPixels: number;
  maxNormalizedDifference: number;
  targetDifferentPixels: number;
};

export const visualParityRatchets = {
  "fixture-restoration-foundation": createRatchet("fixture-restoration-foundation", 11_773),
  "fixture-gate-one-structure": createRatchet("fixture-gate-one-structure", 107_381),
  "fixture-gate-two-scholarly": createRatchet("fixture-gate-two-scholarly", 21_382),
  "fixture-gate-three-layout": createRatchet("fixture-gate-three-layout", 150_000),
} satisfies Record<string, VisualParityRatchet>;

export function getVisualParityRatchet(fixtureId: string): VisualParityRatchet | undefined {
  return visualParityRatchets[fixtureId as keyof typeof visualParityRatchets];
}

function createRatchet(fixtureId: string, maxDifferentPixels: number): VisualParityRatchet {
  return {
    fixtureId,
    maxDifferentPixels,
    maxNormalizedDifference: maxDifferentPixels / pagePixelCount,
    targetDifferentPixels: pageLayoutContract.targets.pixelPerfectDifferentPixels,
  };
}
