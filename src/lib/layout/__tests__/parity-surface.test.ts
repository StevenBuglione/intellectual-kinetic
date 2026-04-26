import { describe, expect, it } from "vitest";
import { gateFiveLyxBreadthFixture } from "@/fixtures/parity/gate-five-lyx-breadth";
import { gateFourLyxCoreFixture } from "@/fixtures/parity/gate-four-lyx-core";
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
});
