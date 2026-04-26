import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { gateFiveLyxBreadthFixture } from "@/fixtures/parity/gate-five-lyx-breadth";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { EditorWorkspace } from "../EditorWorkspace";

describe("EditorWorkspace", () => {
  it("renders a Google Docs-like editor chrome with secondary panels hidden by default", () => {
    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    expect(screen.getByRole("link", { name: "Docs home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Share$/i })).toBeInTheDocument();
    expect(screen.getByRole("menubar", { name: "Document menu" })).toHaveTextContent(
      "FileEditViewInsertFormatToolsExtensionsHelp",
    );
    expect(screen.getByRole("combobox", { name: "Search the menus" })).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "Formatting toolbar" })).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("Normal text")).toBeInTheDocument();
    expect(screen.getByText("Arial")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spelling and grammar check" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paint format" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Underline" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Insert image" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editing mode" })).toBeInTheDocument();
    expect(screen.getByLabelText("Document ruler")).toBeInTheDocument();
    expect(screen.getByLabelText("Vertical ruler")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Document tabs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tab 1" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByLabelText("Google Docs-style document page")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "A Treatise on Motion" })).toBeInTheDocument();
    expect(screen.getByText("AST source of truth")).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Source review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "PDF preview" })).not.toBeInTheDocument();
    expect(screen.queryByText("\\documentclass{book}")).not.toBeInTheDocument();
  });

  it("reveals source, review, and PDF preview panels on demand", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      status: "compiled",
      artifactName: "fixture-restoration-foundation-preview.pdf",
      pdfBase64: "JVBERi0xLjQ=",
      previewImageBase64: "iVBORw0KGgo=",
      log: "compiled",
      diagnostics: [],
      extractedText: [
        "A Treatise on Motion",
        "Let v denote velocity and cite @newton1687.",
        "Uniform motion preserves proportional distance.",
        "s = vt",
      ].join("\n"),
    }), { status: 200, headers: { "content-type": "application/json" } })));

    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    await userEvent.click(screen.getByRole("button", { name: /show source/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Review$/i }));
    await userEvent.click(screen.getByRole("button", { name: /pdf preview/i }));

    expect(screen.getByRole("button", { name: /hide source/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^Review$/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /pdf preview/i })).toHaveAttribute("aria-pressed", "true");
    const sourcePanel = screen.getByRole("complementary", { name: "Generated LaTeX source" });
    expect(within(sourcePanel).getByText("\\documentclass{book}")).toBeInTheDocument();
    expect(within(sourcePanel).getByText("0 diagnostics")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Source review" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "PDF preview" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Compiled PDF preview page" })).toBeInTheDocument();
    expect(await screen.findByText("PDF text matches editor")).toBeInTheDocument();
  });

  it("mounts the live editor inside compiled TeX page boxes for advanced LyX fixtures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      status: "compiled",
      artifactName: "fixture-gate-five-lyx-breadth-preview.pdf",
      pdfBase64: "JVBERi0xLjQ=",
      previewImageBase64: "iVBORw0KGgo=",
      previewPageImageBase64: ["iVBORw0KGgo=", "iVBORw0KGgo2"],
      log: "compiled",
      diagnostics: [],
      extractedText: [
        "Restored Universal Fixture",
        "Breadth Coverage",
        "Branch content exports into PDF.",
      ].join("\n"),
    }), { status: 200, headers: { "content-type": "application/json" } })));

    render(<EditorWorkspace initialDocument={gateFiveLyxBreadthFixture} />);

    expect(screen.queryByRole("region", { name: "TeX page box editor surface" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /pdf preview/i }));

    const texSurface = await screen.findByRole("region", { name: "TeX page box editor surface" });
    expect(within(texSurface).getByRole("img", { name: "TeX page box background 1" })).toHaveAttribute(
      "src",
      "data:image/png;base64,iVBORw0KGgo=",
    );
    expect(within(texSurface).getByRole("img", { name: "TeX page box background 2" })).toHaveAttribute(
      "src",
      "data:image/png;base64,iVBORw0KGgo2",
    );
    expect(screen.getByLabelText("Google Docs-style document page")).not.toHaveAttribute("aria-hidden");
    expect(within(texSurface).getByLabelText("Google Docs-style document page")).toBeInTheDocument();
  });

  it("runs find and replace through canonical AST and updates the editing surface", async () => {
    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    await userEvent.click(screen.getByRole("button", { name: "Find and replace" }));
    const findDialog = screen.getByRole("dialog", { name: "Find and replace" });
    await userEvent.type(within(findDialog).getByRole("searchbox", { name: "Find text" }), "Let v");
    await userEvent.type(within(findDialog).getByRole("textbox", { name: "Replace with" }), "go");
    await userEvent.click(within(findDialog).getByRole("button", { name: "Replace all" }));

    expect(await within(findDialog).findByText("1 replacements")).toBeInTheDocument();
    expect(screen.getByLabelText("Google Docs-style document page")).toHaveTextContent(
      "go denote velocity and cite @newton1687.",
    );
    expect(screen.getAllByText("s = vt")).toHaveLength(1);
  });

  it("shows document statistics and imports paste-special content into the canonical editor", async () => {
    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    await userEvent.click(screen.getByRole("button", { name: "Document statistics" }));
    expect(screen.getByRole("complementary", { name: "Document statistics" })).toHaveTextContent("18 words");
    expect(screen.getByRole("complementary", { name: "Document statistics" })).toHaveTextContent("4 blocks");

    await userEvent.click(screen.getByRole("button", { name: "Paste special" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Paste format" }), "latex");
    await userEvent.click(screen.getByRole("textbox", { name: "Paste source" }));
    await userEvent.paste("\\section{Imported Section}\nImported body.");
    await userEvent.click(screen.getByRole("button", { name: "Insert paste" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Imported Section" })).toBeInTheDocument();
    expect(screen.getByText("Imported body.")).toBeInTheDocument();
  });
});
