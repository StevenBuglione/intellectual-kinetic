import { describe, expect, it } from "vitest";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { compileCanonicalDocumentToPdf } from "../compiler";

describe("LaTeX PDF compiler", () => {
  it("compiles the canonical fixture into a PDF preview artifact", async () => {
    const result = await compileCanonicalDocumentToPdf(restorationFoundationFixture);

    expect(result.status).toBe("compiled");
    expect(result.pdfBase64?.startsWith("JVBER")).toBe(true);
    expect(result.artifactName).toBe("fixture-restoration-foundation-preview.pdf");
    expect(result.diagnostics).toEqual([]);
  }, 30_000);
});
