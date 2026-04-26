import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lyxOracleFixtures } from "@/fixtures/lyx-oracle";
import {
  lyxParityCoverageRegistry,
  parseLyxCapabilityMatrix,
  runLyxCoverageVerification,
} from "../lyx-coverage";

const matrixPath = path.join(process.cwd(), "docs/research/architecture/lyx-capability-parity-matrix.md");
const matrixMarkdown = readFileSync(matrixPath, "utf8");

describe("LyX parity coverage registry", () => {
  it("parses the canonical LyX capability matrix into product capability rows", () => {
    const entries = parseLyxCapabilityMatrix(matrixMarkdown);

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          featureId: "docclass-select",
          classification: "core parity",
          sequence: "foundational",
        }),
        expect.objectContaining({
          featureId: "branch-conditional-content",
          classification: "adapted parity",
          sequence: "early",
        }),
      ]),
    );
    expect(entries.some((entry) => entry.featureId === "internal-undo-stack")).toBe(false);
  });

  it("requires every core/adapted LyX capability to declare product support, fixtures, and non-oracle-only coverage", () => {
    const report = runLyxCoverageVerification({
      matrixMarkdown,
      registry: lyxParityCoverageRegistry,
      oracleFixtures: lyxOracleFixtures,
    });

    expect(report.status).toBe("passed");
    expect(report.matrixCapabilityCount).toBeGreaterThan(50);
    expect(report.checkedCapabilityCount).toBeGreaterThan(45);
    expect(report.errors).toEqual([]);
    expect(report.missingMappings).toEqual([]);
    expect(report.missingFixtureMappings).toEqual([]);
    expect(report.oracleOnlyBlockingCapabilities).toEqual([]);

    expect(report.coverageById["sectioning-hierarchy"]).toMatchObject({
      status: "supported",
      implementation: {
        canonicalAst: "supported",
        tiptapEditor: "supported",
        latexSerializer: "supported",
        previewRenderer: "supported",
      },
    });
    expect(report.coverageById["sectioning-hierarchy"].canonicalFixtureIds).toContain("fixture-restoration-foundation");
    expect(report.coverageById["sectioning-hierarchy"].lyxOracleFixtureIds).toContain("lyx-restoration-foundation");

    expect(report.coverageById["cjk-and-rtl-support"]).toMatchObject({
      status: "unsupported",
    });
  });

  it("fails when a blocking LyX capability loses mapping, fixture evidence, or product support", () => {
    const withoutSectioning = lyxParityCoverageRegistry.filter(
      (entry) => entry.capabilityId !== "sectioning-hierarchy",
    );
    const missingMappingReport = runLyxCoverageVerification({
      matrixMarkdown,
      registry: withoutSectioning,
      oracleFixtures: lyxOracleFixtures,
    });

    expect(missingMappingReport.status).toBe("failed");
    expect(missingMappingReport.missingMappings).toContain("sectioning-hierarchy");

    const withoutFixtures = lyxParityCoverageRegistry.map((entry) => (
      entry.capabilityId === "table-insert-edit"
        ? { ...entry, canonicalFixtureIds: [], lyxOracleFixtureIds: [], verificationFixtureIds: [] }
        : entry
    ));
    const missingFixtureReport = runLyxCoverageVerification({
      matrixMarkdown,
      registry: withoutFixtures,
      oracleFixtures: lyxOracleFixtures,
    });

    expect(missingFixtureReport.status).toBe("failed");
    expect(missingFixtureReport.missingFixtureMappings).toContain("table-insert-edit");

    const oracleOnlyRegistry = lyxParityCoverageRegistry.map((entry) => (
      entry.capabilityId === "inline-and-display-math"
        ? {
            ...entry,
            status: "oracle-only" as const,
            canonicalFixtureIds: [],
            verificationFixtureIds: [],
            lyxOracleFixtureIds: ["lyx-restoration-foundation"],
          }
        : entry
    ));
    const oracleOnlyReport = runLyxCoverageVerification({
      matrixMarkdown,
      registry: oracleOnlyRegistry,
      oracleFixtures: lyxOracleFixtures,
    });

    expect(oracleOnlyReport.status).toBe("failed");
    expect(oracleOnlyReport.oracleOnlyBlockingCapabilities).toContain("inline-and-display-math");
  });
});
