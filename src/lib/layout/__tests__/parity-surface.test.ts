import { describe, expect, it } from "vitest";
import { gateFiveLyxBreadthFixture } from "@/fixtures/parity/gate-five-lyx-breadth";
import { gateFourLyxCoreFixture } from "@/fixtures/parity/gate-four-lyx-core";
import { gateOneStructureFixture } from "@/fixtures/parity/gate-one-structure";
import { gateThreeLayoutFixture } from "@/fixtures/parity/gate-three-layout";
import { gateTwoScholarlyFixture } from "@/fixtures/parity/gate-two-scholarly";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { resolveEditorParitySurface } from "../parity-surface";

describe("editor parity surface selection", () => {
  it("keeps simple restoration documents on the live browser editing surface", () => {
    expect(resolveEditorParitySurface(restorationFoundationFixture)).toBe("browser-editor");
  });

  it("moves LyX semantic and breadth fixtures onto the TeX-derived page surface", () => {
    expect(resolveEditorParitySurface(gateFourLyxCoreFixture)).toBe("tex-derived");
    expect(resolveEditorParitySurface(gateFiveLyxBreadthFixture)).toBe("tex-derived");
  });

  it("moves complex structure, scholarly, and layout fixtures onto the TeX-derived page surface", () => {
    expect(resolveEditorParitySurface(gateOneStructureFixture)).toBe("tex-derived");
    expect(resolveEditorParitySurface(gateTwoScholarlyFixture)).toBe("tex-derived");
    expect(resolveEditorParitySurface(gateThreeLayoutFixture)).toBe("tex-derived");
  });
});
