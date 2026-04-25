import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { EditorWorkspace } from "../EditorWorkspace";

describe("EditorWorkspace", () => {
  it("renders document, live preview status, and revealable LaTeX source panel", async () => {
    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    expect(screen.getByRole("heading", { level: 1, name: "A Treatise on Motion" })).toBeInTheDocument();
    expect(screen.getByText("AST source of truth")).toBeInTheDocument();
    expect(screen.queryByText("\\documentclass{book}")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /show source/i }));

    const sourcePanel = screen.getByRole("complementary", { name: "Generated LaTeX source" });
    expect(within(sourcePanel).getByText("\\documentclass{book}")).toBeInTheDocument();
    expect(within(sourcePanel).getByText("0 diagnostics")).toBeInTheDocument();
  });
});
