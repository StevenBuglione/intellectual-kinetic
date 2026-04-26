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
    expect(screen.getByRole("complementary", { name: "Left workspace" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Document tabs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tab 1" })).toHaveAttribute("aria-selected", "true");
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

    expect(await within(findDialog).findByText("1 replacement")).toBeInTheDocument();
    expect(screen.getByLabelText("Google Docs-style document page")).toHaveTextContent(
      "go denote velocity and cite @newton1687.",
    );
    expect(screen.getAllByText("s = vt")).toHaveLength(1);
  });

  it("finds and selects matching document text without replacing it", async () => {
    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    await userEvent.click(screen.getByRole("button", { name: "Find and replace" }));
    const findDialog = screen.getByRole("dialog", { name: "Find and replace" });
    await userEvent.type(within(findDialog).getByRole("searchbox", { name: "Find text" }), "motion");

    await userEvent.click(within(findDialog).getByRole("button", { name: "Find next" }));

    expect(await within(findDialog).findByText("1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "A Treatise on Motion" })).toBeInTheDocument();
    expect(screen.getByLabelText("Google Docs-style document page")).toHaveTextContent(
      "Uniform motion preserves proportional distance.",
    );
  });

  it("highlights all visible find matches and marks the current match", async () => {
    const { container } = render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    await userEvent.click(screen.getByRole("button", { name: "Find and replace" }));
    const findDialog = screen.getByRole("dialog", { name: "Find and replace" });
    await userEvent.type(within(findDialog).getByRole("searchbox", { name: "Find text" }), "motion");

    await userEvent.click(within(findDialog).getByRole("button", { name: "Find next" }));

    expect(await within(findDialog).findByText("1 of 2")).toBeInTheDocument();
    expect(container.querySelectorAll(".ik-find-highlight")).toHaveLength(2);
    expect(container.querySelectorAll(".ik-find-highlight-current")).toHaveLength(1);
    expect(container.querySelector(".ik-find-highlight-current")).toHaveTextContent("Motion");
  });

  it("does not keep the browser selection over the current find highlight", async () => {
    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    await userEvent.click(screen.getByRole("button", { name: "Find and replace" }));
    const findDialog = screen.getByRole("dialog", { name: "Find and replace" });
    await userEvent.type(within(findDialog).getByRole("searchbox", { name: "Find text" }), "motion");

    await userEvent.click(within(findDialog).getByRole("button", { name: "Find next" }));

    expect(await within(findDialog).findByText("1 of 2")).toBeInTheDocument();
    expect(window.getSelection()?.toString()).toBe("");
  });

  it("clears find highlights when the find dialog closes", async () => {
    const { container } = render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    await userEvent.click(screen.getByRole("button", { name: "Find and replace" }));
    const findDialog = screen.getByRole("dialog", { name: "Find and replace" });
    await userEvent.type(within(findDialog).getByRole("searchbox", { name: "Find text" }), "motion");
    await userEvent.click(within(findDialog).getByRole("button", { name: "Find next" }));

    expect(await within(findDialog).findByText("1 of 2")).toBeInTheDocument();
    expect(container.querySelectorAll(".ik-find-highlight")).toHaveLength(2);

    await userEvent.click(within(findDialog).getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog", { name: "Find and replace" })).not.toBeInTheDocument();
    expect(container.querySelectorAll(".ik-find-highlight")).toHaveLength(0);
  });

  it("applies match-case and whole-word options to the visible find count", async () => {
    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    await userEvent.click(screen.getByRole("button", { name: "Find and replace" }));
    const findDialog = screen.getByRole("dialog", { name: "Find and replace" });
    const findInput = within(findDialog).getByRole("searchbox", { name: "Find text" });

    await userEvent.type(findInput, "motion");
    await userEvent.click(within(findDialog).getByRole("button", { name: "Find next" }));
    expect(await within(findDialog).findByText("1 of 2")).toBeInTheDocument();

    await userEvent.click(within(findDialog).getByRole("checkbox", { name: "Match case" }));
    await userEvent.click(within(findDialog).getByRole("button", { name: "Find next" }));
    expect(await within(findDialog).findByText("1 of 1")).toBeInTheDocument();

    await userEvent.clear(findInput);
    await userEvent.type(findInput, "v");
    await userEvent.click(within(findDialog).getByRole("button", { name: "Find next" }));
    expect(await within(findDialog).findByText("1 of 4")).toBeInTheDocument();

    await userEvent.click(within(findDialog).getByRole("checkbox", { name: "Whole word" }));
    await userEvent.click(within(findDialog).getByRole("button", { name: "Find next" }));
    expect(await within(findDialog).findByText("1 of 1")).toBeInTheDocument();
  });

  it("replaces only the currently selected find match", async () => {
    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    await userEvent.click(screen.getByRole("button", { name: "Find and replace" }));
    const findDialog = screen.getByRole("dialog", { name: "Find and replace" });
    await userEvent.type(within(findDialog).getByRole("searchbox", { name: "Find text" }), "motion");
    await userEvent.type(within(findDialog).getByRole("textbox", { name: "Replace with" }), "movement");
    await userEvent.click(within(findDialog).getByRole("button", { name: "Find next" }));

    await userEvent.click(within(findDialog).getByRole("button", { name: /^Replace$/ }));

    expect(await within(findDialog).findByText("1 replacement")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "A Treatise on movement" })).toBeInTheDocument();
    expect(screen.getByText("Uniform motion preserves proportional distance.")).toBeInTheDocument();
    expect(screen.queryByText("Uniform movement preserves proportional distance.")).not.toBeInTheDocument();
  });

  it("opens the find dialog from the standard keyboard shortcut", async () => {
    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    await userEvent.keyboard("{Control>}f{/Control}");

    const findDialog = screen.getByRole("dialog", { name: "Find and replace" });
    expect(within(findDialog).getByRole("searchbox", { name: "Find text" })).toHaveFocus();
  });

  it("lists document headings in the outline and updates when headings are inserted", async () => {
    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    const outline = screen.getByRole("navigation", { name: "Document outline" });
    expect(within(outline).getByRole("button", { name: "A Treatise on Motion" })).toHaveAttribute(
      "aria-current",
      "true",
    );

    await userEvent.click(screen.getByRole("button", { name: "Paste special" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Paste format" }), "latex");
    await userEvent.click(screen.getByRole("textbox", { name: "Paste source" }));
    await userEvent.paste("\\section{Imported Section}\nImported body.");
    await userEvent.click(screen.getByRole("button", { name: "Insert paste" }));

    const updatedOutline = await screen.findByRole("navigation", { name: "Document outline" });
    const importedOutlineItem = await within(updatedOutline).findByRole("button", { name: "Imported Section" });
    await userEvent.click(importedOutlineItem);

    expect(importedOutlineItem).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("heading", { level: 1, name: "Imported Section" })).toBeInTheDocument();
  });

  it("collapses the left workspace and switches between functional left panels", async () => {
    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    const leftWorkspace = screen.getByRole("complementary", { name: "Left workspace" });
    expect(within(leftWorkspace).getByRole("navigation", { name: "Document outline" })).toBeInTheDocument();

    await userEvent.click(within(leftWorkspace).getByRole("button", { name: "Collapse left sidebar" }));

    expect(within(leftWorkspace).getByRole("button", { name: "Expand left sidebar" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("navigation", { name: "Document outline" })).not.toBeInTheDocument();

    await userEvent.click(within(leftWorkspace).getByRole("button", { name: "Open source review" }));

    expect(within(leftWorkspace).getByRole("button", { name: "Open source review" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("complementary", { name: "Source review" })).toBeInTheDocument();

    await userEvent.click(within(leftWorkspace).getByRole("button", { name: "Open document statistics" }));

    expect(screen.queryByRole("complementary", { name: "Source review" })).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Document statistics" })).toHaveTextContent("18 words");

    await userEvent.click(within(leftWorkspace).getByRole("button", { name: "Open paste special" }));

    expect(screen.queryByRole("complementary", { name: "Document statistics" })).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Paste special" })).toBeInTheDocument();

    await userEvent.click(within(leftWorkspace).getByRole("button", { name: "Open document outline" }));

    expect(screen.queryByRole("complementary", { name: "Paste special" })).not.toBeInTheDocument();
    expect(within(leftWorkspace).getByRole("navigation", { name: "Document outline" })).toBeInTheDocument();
  });

  it("adds, switches, isolates, and deletes document tabs in the left workspace", async () => {
    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    const tabList = screen.getByRole("tablist", { name: "Document tabs" });
    expect(within(tabList).getByRole("tab", { name: "Tab 1" })).toHaveAttribute("aria-selected", "true");

    await userEvent.click(screen.getByRole("button", { name: "Add document tab" }));

    const tabTwo = within(tabList).getByRole("tab", { name: "Tab 2" });
    expect(tabTwo).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByRole("heading", { level: 1, name: "Untitled tab 2" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "A Treatise on Motion" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Open paste special" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Paste format" }), "latex");
    await userEvent.click(screen.getByRole("textbox", { name: "Paste source" }));
    await userEvent.paste("\\section{Tab Two Section}\nTab two body.");
    await userEvent.click(screen.getByRole("button", { name: "Insert paste" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Tab Two Section" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Document outline" })).toHaveTextContent("Tab Two Section");

    await userEvent.click(within(tabList).getByRole("tab", { name: "Tab 1" }));

    expect(within(tabList).getByRole("tab", { name: "Tab 1" })).toHaveAttribute("aria-selected", "true");
    expect(tabTwo).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("heading", { level: 1, name: "A Treatise on Motion" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Tab Two Section" })).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Document outline" })).not.toHaveTextContent("Tab Two Section");

    await userEvent.click(tabTwo);
    await userEvent.click(screen.getByRole("button", { name: "Delete Tab 2" }));

    expect(screen.queryByRole("tab", { name: "Tab 2" })).not.toBeInTheDocument();
    expect(within(tabList).getByRole("tab", { name: "Tab 1" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { level: 1, name: "A Treatise on Motion" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Tab 1" })).toBeDisabled();
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
