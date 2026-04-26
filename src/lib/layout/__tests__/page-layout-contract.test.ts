import { describe, expect, it } from "vitest";
import { renderCanonicalDocumentToEditorHtml } from "@/lib/verification/editor-html-renderer";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { serializeCanonicalDocumentToLatex } from "@/lib/latex/serializer";
import { buildLatexGeometryOptions, pageLayoutContract, resolvePageLayoutMetrics } from "../page-layout-contract";

describe("shared page layout contract", () => {
  it("defines one source for editor and PDF page geometry", () => {
    expect(pageLayoutContract.page.widthPx).toBe(816);
    expect(pageLayoutContract.page.heightPx).toBe(1056);
    expect(pageLayoutContract.page.marginIn).toBe(1);
    expect(pageLayoutContract.page.topMarginPx).toBe(96);
    expect(pageLayoutContract.page.leftMarginPx).toBe(96);
    expect(pageLayoutContract.page.rightMarginPx).toBe(96);
    expect(pageLayoutContract.typography.bodyFontSizePt).toBe(11);
    expect(pageLayoutContract.fonts.editorBodyFamily).toBe("\"Nimbus Sans\", Arial, Helvetica, sans-serif");
    expect(pageLayoutContract.fonts.requiredPdfBodyFonts).toEqual([
      "NimbusSanL-Regu",
      "NimbusSanL-Bold",
    ]);
    expect(pageLayoutContract.targets.pixelPerfectDifferentPixels).toBe(0);
  });

  it("drives the browser TextView render geometry", () => {
    const html = renderCanonicalDocumentToEditorHtml(restorationFoundationFixture);
    const layout = resolvePageLayoutMetrics(restorationFoundationFixture.settings.pageLayout);

    expect(html).toContain(`width: ${pageLayoutContract.page.widthPx}px;`);
    expect(html).toContain(`height: ${pageLayoutContract.page.heightPx}px;`);
    expect(html).toContain(
      `padding: ${layout.topMarginPx}px ${layout.rightMarginPx}px ${layout.bottomPaddingPx}px ${layout.leftMarginPx}px;`,
    );
    expect(html).toContain(`font-size: ${pageLayoutContract.typography.bodyFontSizePx}px;`);
    expect(html).toContain(`font-family: ${pageLayoutContract.fonts.editorBodyFamily};`);
  });

  it("drives the LaTeX render geometry", () => {
    const latex = serializeCanonicalDocumentToLatex(restorationFoundationFixture).source;

    expect(latex).toContain(`\\usepackage[margin=${pageLayoutContract.page.marginIn}in]{geometry}`);
    expect(latex).toContain(`\\fontsize{${pageLayoutContract.typography.headingOneFontSizePt}pt}`);
    expect(latex).toContain(`\\begin{minipage}[c][${pageLayoutContract.figure.placeholderHeightIn}in][c]`);
    expect(latex).toContain(`\\begin{minipage}[t][${pageLayoutContract.table.cellHeightIn}in][c]`);
  });

  it("resolves custom page layout settings for browser and LaTeX parity", () => {
    const layout = resolvePageLayoutMetrics({
      topMarginPx: 120,
      leftMarginPx: 144,
      rightMarginPx: 72,
    });

    expect(layout.topMarginPx).toBe(120);
    expect(layout.leftMarginPx).toBe(144);
    expect(layout.rightMarginPx).toBe(72);
    expect(layout.contentWidthPx).toBe(600);
    expect(buildLatexGeometryOptions({
      topMarginPx: 120,
      leftMarginPx: 144,
      rightMarginPx: 72,
    })).toBe("top=1.25in,right=0.75in,bottom=1in,left=1.5in");
  });
});
