import { describe, expect, it } from "vitest";
import { renderCanonicalDocumentToEditorHtml } from "@/lib/verification/editor-html-renderer";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { serializeCanonicalDocumentToLatex } from "@/lib/latex/serializer";
import { pageLayoutContract } from "../page-layout-contract";

describe("shared page layout contract", () => {
  it("defines one source for editor and PDF page geometry", () => {
    expect(pageLayoutContract.page.widthPx).toBe(816);
    expect(pageLayoutContract.page.heightPx).toBe(1056);
    expect(pageLayoutContract.page.marginIn).toBe(1);
    expect(pageLayoutContract.typography.bodyFontSizePt).toBe(11);
    expect(pageLayoutContract.targets.pixelPerfectDifferentPixels).toBe(0);
  });

  it("drives the browser TextView render geometry", () => {
    const html = renderCanonicalDocumentToEditorHtml(restorationFoundationFixture);

    expect(html).toContain(`width: ${pageLayoutContract.page.widthPx}px;`);
    expect(html).toContain(`height: ${pageLayoutContract.page.heightPx}px;`);
    expect(html).toContain(`padding: ${pageLayoutContract.page.marginPx}px ${pageLayoutContract.page.marginPx}px ${pageLayoutContract.page.bottomPaddingPx}px;`);
    expect(html).toContain(`font-size: ${pageLayoutContract.typography.bodyFontSizePx}px;`);
  });

  it("drives the LaTeX render geometry", () => {
    const latex = serializeCanonicalDocumentToLatex(restorationFoundationFixture).source;

    expect(latex).toContain(`\\usepackage[margin=${pageLayoutContract.page.marginIn}in]{geometry}`);
    expect(latex).toContain(`\\fontsize{${pageLayoutContract.typography.headingOneFontSizePt}pt}`);
    expect(latex).toContain(`\\begin{minipage}[c][${pageLayoutContract.figure.placeholderHeightIn}in][c]`);
    expect(latex).toContain(`\\begin{minipage}[t][${pageLayoutContract.table.cellHeightIn}in][c]`);
  });
});
