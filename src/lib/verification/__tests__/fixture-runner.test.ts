import { describe, expect, it } from "vitest";
import { runParityFixtureVerification } from "../fixture-runner";

describe("fixture-driven parity verification", () => {
  it("runs semantic, projection, and LaTeX checks for the initial fixture corpus", () => {
    const report = runParityFixtureVerification();

    expect(report.status).toBe("passed");
    expect(report.fixtures).toEqual([
      expect.objectContaining({
        id: "fixture-restoration-foundation",
        checks: expect.arrayContaining([
          "canonical-validation",
          "tiptap-projection",
          "latex-serialization",
        ]),
      }),
    ]);
  });
});
