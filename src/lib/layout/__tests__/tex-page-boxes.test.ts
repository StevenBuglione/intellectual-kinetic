import { describe, expect, it } from "vitest";
import type { LatexCompileResult } from "@/lib/latex/compiler";
import { createTexPageBoxesFromPreview } from "../tex-page-boxes";

describe("TeX page boxes", () => {
  it("creates deterministic page boxes from compiled PDF preview pages", () => {
    const preview: LatexCompileResult = {
      status: "compiled",
      artifactName: "fixture-preview.pdf",
      previewImageBase64: "page-one",
      previewPageImageBase64: ["page-one", "page-two"],
      log: "compiled",
      diagnostics: [],
    };

    expect(createTexPageBoxesFromPreview(preview)).toEqual([
      {
        pageNumber: 1,
        widthPx: 816,
        heightPx: 1056,
        backgroundImageBase64: "page-one",
      },
      {
        pageNumber: 2,
        widthPx: 816,
        heightPx: 1056,
        backgroundImageBase64: "page-two",
      },
    ]);
  });

  it("falls back to the first preview image when page images are unavailable", () => {
    const preview: LatexCompileResult = {
      status: "compiled",
      artifactName: "fixture-preview.pdf",
      previewImageBase64: "only-page",
      log: "compiled",
      diagnostics: [],
    };

    expect(createTexPageBoxesFromPreview(preview)).toEqual([
      expect.objectContaining({
        pageNumber: 1,
        backgroundImageBase64: "only-page",
      }),
    ]);
  });
});
