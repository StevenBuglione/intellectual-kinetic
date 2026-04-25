import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { EditorWorkspace } from "../EditorWorkspace";

describe("EditorWorkspace", () => {
  it("renders a Google Docs-like editor chrome with secondary panels hidden by default", () => {
    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    expect(screen.getByRole("menubar", { name: "Document menu" })).toHaveTextContent(
      "FileEditViewInsertFormatToolsReviewHelp",
    );
    expect(screen.getByRole("toolbar", { name: "Formatting toolbar" })).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("Normal text")).toBeInTheDocument();
    expect(screen.getByLabelText("Document ruler")).toBeInTheDocument();
    expect(screen.getByLabelText("Google Docs-style document page")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "A Treatise on Motion" })).toBeInTheDocument();
    expect(screen.getByText("AST source of truth")).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Source review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "PDF preview" })).not.toBeInTheDocument();
    expect(screen.queryByText("\\documentclass{book}")).not.toBeInTheDocument();
  });

  it("reveals source, review, and PDF preview panels on demand", async () => {
    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    await userEvent.click(screen.getByRole("button", { name: /show source/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Review$/i }));
    await userEvent.click(screen.getByRole("button", { name: /pdf preview/i }));

    const sourcePanel = screen.getByRole("complementary", { name: "Generated LaTeX source" });
    expect(within(sourcePanel).getByText("\\documentclass{book}")).toBeInTheDocument();
    expect(within(sourcePanel).getByText("0 diagnostics")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Source review" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "PDF preview" })).toBeInTheDocument();
  });
});
