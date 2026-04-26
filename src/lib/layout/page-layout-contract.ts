import type { CanonicalPageLayoutSettings } from "@/lib/editor-core/types";

const PX_PER_IN = 96;

export const pageLayoutContract = {
  page: {
    widthPx: 816,
    heightPx: 1056,
    marginIn: 1,
    marginPx: 96,
    topMarginPx: 96,
    leftMarginPx: 96,
    rightMarginPx: 96,
    bottomPaddingPx: 110,
    pdfRenderDpi: 96,
  },
  ruler: {
    minTopMarginPx: 0,
    minLeftMarginPx: 0,
    minRightMarginPx: 0,
    minContentWidthPx: 24,
    minContentHeightPx: 24,
  },
  typography: {
    bodyFontSizePt: 11,
    bodyFontSizePx: 14.6667,
    bodyLineHeight: 1.5,
    headingOneFontSizePt: 21,
    headingOneLineHeightPt: 26,
    headingOneFontSizePx: 28,
    headingTwoFontSizePt: 17,
    headingTwoLineHeightPt: 22,
    headingTwoFontSizePx: 22,
    headingThreeFontSizePt: 14,
    headingThreeLineHeightPt: 18,
    headingThreeFontSizePx: 18,
    mathDisplayFontSizePx: 16,
  },
  fonts: {
    editorBodyFamily: "\"Nimbus Sans\", Arial, Helvetica, sans-serif",
    latexBodyPackage: "helvet",
    requiredPdfBodyFonts: ["NimbusSanL-Regu", "NimbusSanL-Bold"],
  },
  spacing: {
    paragraphBottomPx: 11,
    headingBottomPx: 14,
    blockquoteMarginPx: 20,
    blockquoteIndentPx: 36,
    mathDisplayMarginPx: 18,
    listLeftMarginPx: 24,
    listBottomMarginPx: 14,
    listItemBottomPx: 6,
    figureMarginPx: 18,
    captionBottomPx: 6,
    pageBreakMarginPx: 28,
  },
  table: {
    cellMinWidthPx: 96,
    cellPaddingYPx: 6,
    cellPaddingXPx: 8,
    cellHeightIn: "0.34",
    contentWidthIn: 6,
  },
  figure: {
    placeholderMinHeightPx: 96,
    placeholderHeightIn: "1.0",
    placeholderWidthRatio: "0.68",
  },
  targets: {
    pixelPerfectDifferentPixels: 0,
  },
} as const;

export const pagePixelCount = pageLayoutContract.page.widthPx * pageLayoutContract.page.heightPx;

export type ResolvedPageLayoutMetrics = {
  widthPx: number;
  heightPx: number;
  topMarginPx: number;
  leftMarginPx: number;
  rightMarginPx: number;
  bottomPaddingPx: number;
  contentWidthPx: number;
  contentHeightPx: number;
};

export function resolvePageLayoutMetrics(pageLayout?: CanonicalPageLayoutSettings): ResolvedPageLayoutMetrics {
  const { page, ruler } = pageLayoutContract;
  const maxHorizontalMarginPx = page.widthPx - ruler.minContentWidthPx;
  const maxTopMarginPx = page.heightPx - page.bottomPaddingPx - ruler.minContentHeightPx;
  let leftMarginPx = clamp(
    pageLayout?.leftMarginPx ?? page.leftMarginPx,
    ruler.minLeftMarginPx,
    maxHorizontalMarginPx,
  );
  let rightMarginPx = clamp(
    pageLayout?.rightMarginPx ?? page.rightMarginPx,
    ruler.minRightMarginPx,
    maxHorizontalMarginPx,
  );
  const topMarginPx = clamp(
    pageLayout?.topMarginPx ?? page.topMarginPx,
    ruler.minTopMarginPx,
    maxTopMarginPx,
  );

  if (leftMarginPx + rightMarginPx > page.widthPx - ruler.minContentWidthPx) {
    const overflow = leftMarginPx + rightMarginPx - (page.widthPx - ruler.minContentWidthPx);
    if (rightMarginPx >= leftMarginPx) {
      rightMarginPx = Math.max(ruler.minRightMarginPx, rightMarginPx - overflow);
    } else {
      leftMarginPx = Math.max(ruler.minLeftMarginPx, leftMarginPx - overflow);
    }
  }

  return {
    widthPx: page.widthPx,
    heightPx: page.heightPx,
    topMarginPx,
    leftMarginPx,
    rightMarginPx,
    bottomPaddingPx: page.bottomPaddingPx,
    contentWidthPx: page.widthPx - leftMarginPx - rightMarginPx,
    contentHeightPx: page.heightPx - topMarginPx - page.bottomPaddingPx,
  };
}

export function buildLatexGeometryOptions(pageLayout?: CanonicalPageLayoutSettings): string {
  const { page } = pageLayoutContract;
  const resolvedLayout = resolvePageLayoutMetrics(pageLayout);
  const usesDefaultMargins = resolvedLayout.topMarginPx === page.topMarginPx
    && resolvedLayout.leftMarginPx === page.leftMarginPx
    && resolvedLayout.rightMarginPx === page.rightMarginPx;

  if (usesDefaultMargins) {
    return `margin=${page.marginIn}in`;
  }

  return [
    `top=${formatInches(resolvedLayout.topMarginPx)}in`,
    `right=${formatInches(resolvedLayout.rightMarginPx)}in`,
    `bottom=${page.marginIn}in`,
    `left=${formatInches(resolvedLayout.leftMarginPx)}in`,
  ].join(",");
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function formatInches(pixelValue: number): string {
  const inchValue = pixelValue / PX_PER_IN;
  return Number.isInteger(inchValue)
    ? String(inchValue)
    : inchValue.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}
