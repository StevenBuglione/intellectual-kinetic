import type { LatexCompileResult } from "@/lib/latex/compiler";
import { pageLayoutContract } from "./page-layout-contract";

export type TexPageBox = {
  pageNumber: number;
  widthPx: number;
  heightPx: number;
  backgroundImageBase64: string;
};

export function createTexPageBoxesFromPreview(preview: LatexCompileResult | null): TexPageBox[] {
  if (preview?.status !== "compiled") {
    return [];
  }

  const pageImages = preview.previewPageImageBase64
    ?? (preview.previewImageBase64 ? [preview.previewImageBase64] : []);

  return pageImages.map((backgroundImageBase64, index) => ({
    pageNumber: index + 1,
    widthPx: pageLayoutContract.page.widthPx,
    heightPx: pageLayoutContract.page.heightPx,
    backgroundImageBase64,
  }));
}
