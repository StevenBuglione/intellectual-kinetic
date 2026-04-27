import { createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CanonicalDocument } from "@/lib/editor-core/types";
import { gateFiveLyxBreadthFixture } from "@/fixtures/parity/gate-five-lyx-breadth";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { pdfPreviewableLyxDocumentClasses } from "@/lib/lyx/document-classes";
import { EditorWorkspace } from "../EditorWorkspace";

describe("EditorWorkspace", () => {
  function createSpellcheckFixture(): CanonicalDocument {
    return {
      ...restorationFoundationFixture,
      blocks: restorationFoundationFixture.blocks.map((block, index) => {
        if (index !== 1 || block.type !== "paragraph") {
          return block;
        }

        return {
          ...block,
          children: [{ type: "text" as const, text: "Teh langauge remains paralell to the source." }],
        };
      }),
    };
  }

  function createRepeatedSpellcheckFixture(): CanonicalDocument {
    return {
      ...restorationFoundationFixture,
      blocks: restorationFoundationFixture.blocks.map((block, index) => {
        if (index !== 1 || block.type !== "paragraph") {
          return block;
        }

        return {
          ...block,
          children: [{ type: "text" as const, text: "Teh teh langauge remains paralell to the source." }],
        };
      }),
    };
  }

  it("renders a Google Docs-like editor chrome with secondary panels hidden by default", () => {
    const { container } = render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    expect(screen.getByRole("link", { name: "Docs home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Share$/i })).toBeInTheDocument();
    expect(screen.getByRole("menubar", { name: "Document menu" })).toHaveTextContent(
      "FileEditViewInsertFormatToolsExtensionsHelp",
    );
    expect(screen.getByRole("combobox", { name: "Search the menus" })).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "Formatting toolbar" })).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Document class" })).toHaveValue("book");
    expect(screen.getAllByRole("option")).toHaveLength(pdfPreviewableLyxDocumentClasses.length);
    expect(screen.getByRole("option", { name: "Europe CV" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "A0 Poster" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Association for Computing Machinery (ACM)" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "DocBook Article (XML)" })).not.toBeInTheDocument();
    expect(screen.getByText("Normal text")).toBeInTheDocument();
    expect(screen.getByText("Arial")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spelling and grammar check" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paint format" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Underline" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Insert image" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editing mode" })).toBeInTheDocument();
    expect(screen.getByLabelText("Document ruler")).toBeInTheDocument();
    expect(screen.getByLabelText("Vertical ruler")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adjust left document margin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adjust right document margin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adjust top document margin" })).toBeInTheDocument();
    expect(container.querySelectorAll(".ik-doc-ruler-division").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".ik-doc-vertical-ruler-division").length).toBeGreaterThan(0);
    expect(screen.getByRole("complementary", { name: "Left workspace" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Document tabs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tab 1" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Google Docs-style document page")).toBeInTheDocument();
    expect(screen.getByLabelText("Google Docs-style document page")).toHaveAttribute("spellcheck", "false");
    expect(container.querySelector(".ik-doc-page-stack")).toHaveStyle("--ik-doc-left-margin: 96px");
    expect(screen.getByRole("heading", { level: 1, name: "A Treatise on Motion" })).toBeInTheDocument();
    expect(screen.getByText("AST source of truth")).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Source review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "PDF preview" })).not.toBeInTheDocument();
    expect(screen.queryByText("\\documentclass{book}")).not.toBeInTheDocument();
  });

  it("drags the ruler controls to adjust document margins and top spacing", async () => {
    const { container } = render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    const pageStack = container.querySelector(".ik-doc-page-stack");
    expect(pageStack).not.toBeNull();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Adjust left document margin" }), { clientX: 96 });
    fireEvent.pointerMove(window, { clientX: 132 });
    fireEvent.pointerUp(window);

    await waitFor(() => {
      expect(pageStack).toHaveStyle("--ik-doc-left-margin: 132px");
    });

    fireEvent.pointerDown(screen.getByRole("button", { name: "Adjust left document margin" }), { clientX: 132 });
    fireEvent.pointerMove(window, { clientX: 24 });
    fireEvent.pointerUp(window);

    await waitFor(() => {
      expect(pageStack).toHaveStyle("--ik-doc-left-margin: 24px");
    });

    fireEvent.pointerDown(screen.getByRole("button", { name: "Adjust left document margin" }), { clientX: 24 });
    fireEvent.pointerMove(window, { clientX: -60 });
    fireEvent.pointerUp(window);

    await waitFor(() => {
      expect(pageStack).toHaveStyle("--ik-doc-left-margin: 0px");
    });

    fireEvent.pointerDown(screen.getByRole("button", { name: "Adjust top document margin" }), { clientY: 96 });
    fireEvent.pointerMove(window, { clientY: 144 });
    fireEvent.pointerUp(window);

    await waitFor(() => {
      expect(pageStack).toHaveStyle("--ik-doc-top-margin: 144px");
    });

    fireEvent.pointerDown(screen.getByRole("button", { name: "Adjust top document margin" }), { clientY: 144 });
    fireEvent.pointerMove(window, { clientY: 18 });
    fireEvent.pointerUp(window);

    await waitFor(() => {
      expect(pageStack).toHaveStyle("--ik-doc-top-margin: 18px");
    });

    fireEvent.pointerDown(screen.getByRole("button", { name: "Adjust top document margin" }), { clientY: 18 });
    fireEvent.pointerMove(window, { clientY: -40 });
    fireEvent.pointerUp(window);

    await waitFor(() => {
      expect(pageStack).toHaveStyle("--ik-doc-top-margin: 0px");
    });
  });

  it("toggles supported LyX modules from the left rail and updates the generated LaTeX", async () => {
    const { container } = render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    await userEvent.click(screen.getByRole("button", { name: "Show source" }));
    await userEvent.click(screen.getByRole("button", { name: "Open document modules" }));

    const modulesPanel = screen.getByRole("complementary", { name: "Document modules" });
    expect(within(modulesPanel).getByText("AMS Theorems")).toBeInTheDocument();
    expect(within(modulesPanel).getByText("Custom Header/Footer Text")).toBeInTheDocument();
    expect(within(modulesPanel).getByText("Multiple Columns")).toBeInTheDocument();

    const sourcePanel = screen.getByRole("complementary", { name: "Generated LaTeX source" });
    const multicolCheckbox = within(modulesPanel).getByRole("checkbox", { name: "Enable Multiple Columns module" });

    await userEvent.click(multicolCheckbox);

    await waitFor(() => {
      expect(within(sourcePanel).getByText("\\usepackage{multicol}")).toBeInTheDocument();
      expect(within(sourcePanel).getByText("\\begin{multicols}{2}")).toBeInTheDocument();
    });
    expect(container.querySelector(".ik-doc-page-stack")).toHaveAttribute("data-enabled-modules", "multicol");

    await userEvent.click(screen.getByRole("checkbox", { name: "Disable Multiple Columns module" }));

    await waitFor(() => {
      expect(within(sourcePanel).queryByText("\\usepackage{multicol}")).not.toBeInTheDocument();
      expect(within(sourcePanel).queryByText("\\begin{multicols}{2}")).not.toBeInTheDocument();
    });
    expect(container.querySelector(".ik-doc-page-stack")).toHaveAttribute("data-enabled-modules", "");
  });

  it("uses the TeX-derived editor surface for layout-affecting modules so PDF parity stays verified", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      status: "compiled",
      artifactName: "fixture-restoration-foundation-preview.pdf",
      pdfBase64: "JVBERi0xLjQ=",
      previewImageBase64: "iVBORw0KGgo=",
      previewPageImageBase64: ["iVBORw0KGgo="],
      log: "compiled",
      diagnostics: [],
      extractedText: [
        "A Treatise on Motion",
        "Uniform motion preserves proportional distance.",
        "Let v denote velocity and cite @newton1687.",
        "s = vt",
      ].join("\n\n"),
    }), { status: 200, headers: { "content-type": "application/json" } })));

    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    await userEvent.click(screen.getByRole("button", { name: "Show source" }));
    await userEvent.click(screen.getByRole("button", { name: "Open document modules" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Enable Multiple Columns module" }));

    const sourcePanel = screen.getByRole("complementary", { name: "Generated LaTeX source" });
    expect(await within(sourcePanel).findByText("\\usepackage{multicol}")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /pdf preview/i }));

    expect(await screen.findByRole("region", { name: "TeX page box editor surface" })).toBeInTheDocument();
    expect(await screen.findByLabelText("PDF preview verified")).toBeInTheDocument();
    expect(screen.queryByLabelText("PDF text verification")).not.toBeInTheDocument();
  });

  it("opens spellcheck and thesaurus providers and applies spelling corrections", async () => {
    render(<EditorWorkspace initialDocument={createSpellcheckFixture()} />);

    await userEvent.click(screen.getByRole("button", { name: "Spelling and grammar check" }));

    const spellcheckDialog = screen.getByRole("dialog", { name: "Spelling and grammar check" });
    expect(within(spellcheckDialog).getByText("Providers: IK spellcheck and IK thesaurus")).toBeInTheDocument();
    expect(within(spellcheckDialog).getByRole("button", { name: "Replace all with the" })).toBeInTheDocument();
    expect(within(spellcheckDialog).getByRole("button", { name: "Replace all with language" })).toBeInTheDocument();

    await userEvent.click(within(spellcheckDialog).getByRole("button", { name: "Replace all with the" }));

    expect(screen.getByLabelText("Google Docs-style document page")).toHaveTextContent(
      "The langauge remains paralell to the source.",
    );

    await userEvent.clear(within(spellcheckDialog).getByRole("textbox", { name: "Thesaurus lookup" }));
    await userEvent.type(within(spellcheckDialog).getByRole("textbox", { name: "Thesaurus lookup" }), "motion");

    expect(within(spellcheckDialog).getByRole("list", { name: "Thesaurus suggestions" })).toHaveTextContent("movement");
    expect(within(spellcheckDialog).getByRole("list", { name: "Thesaurus suggestions" })).toHaveTextContent("locomotion");
  });

  it("opens a right-click correction popup on a misspelled word", async () => {
    const { container } = render(<EditorWorkspace initialDocument={createRepeatedSpellcheckFixture()} />);

    await waitFor(() => {
      expect(container.querySelector('[data-spellcheck-word="teh"]')).not.toBeNull();
    });

    const misspelledWord = container.querySelector('[data-spellcheck-word="teh"]');
    expect(misspelledWord).not.toBeNull();

    const editorSurface = screen.getByLabelText("Google Docs-style document page");
    const originalElementFromPoint = document.elementFromPoint;
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => misspelledWord as Element),
    });
    fireEvent.contextMenu(editorSurface, { clientX: 120, clientY: 32 });
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: originalElementFromPoint,
    });

    const spellMenu = screen.getByRole("menu", { name: "Spelling suggestions" });
    expect(within(spellMenu).getByText("Did you mean:")).toBeInTheDocument();
    expect(within(spellMenu).getByRole("menuitem", { name: "The, spelling suggestion" })).toBeInTheDocument();
    expect(within(spellMenu).getByRole("menuitem", { name: "Ignore all" })).toBeInTheDocument();
    expect(within(spellMenu).getByRole("menuitem", { name: 'Always correct to "The"' })).toBeInTheDocument();
    expect(within(spellMenu).getByRole("menuitem", { name: "Add to personal dictionary" })).toBeInTheDocument();
    expect(within(spellMenu).getByRole("menuitem", { name: "Spelling and grammar check Ctrl+Alt+X" })).toBeInTheDocument();
    expect(within(spellMenu).getAllByRole("separator")).toHaveLength(2);

    await userEvent.click(within(spellMenu).getByRole("menuitem", { name: "The, spelling suggestion" }));

    expect(screen.queryByRole("menu", { name: "Spelling suggestions" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Google Docs-style document page")).toHaveTextContent(
      "The teh langauge remains paralell to the source.",
    );
  });

  it("adds the selected misspelling to the personal dictionary without changing document content", async () => {
    const { container } = render(<EditorWorkspace initialDocument={createRepeatedSpellcheckFixture()} />);

    await waitFor(() => {
      expect(container.querySelectorAll('[data-spellcheck-word="teh"]')).toHaveLength(2);
    });

    const misspelledWord = container.querySelector('[data-spellcheck-word="teh"]');
    expect(misspelledWord).not.toBeNull();

    const editorSurface = screen.getByLabelText("Google Docs-style document page");
    const originalElementFromPoint = document.elementFromPoint;
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => misspelledWord as Element),
    });
    fireEvent.contextMenu(editorSurface, { clientX: 120, clientY: 32 });
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: originalElementFromPoint,
    });

    const spellMenu = screen.getByRole("menu", { name: "Spelling suggestions" });
    await userEvent.click(within(spellMenu).getByRole("menuitem", { name: "Add to personal dictionary" }));

    await waitFor(() => {
      expect(screen.queryByRole("menu", { name: "Spelling suggestions" })).not.toBeInTheDocument();
      expect(container.querySelectorAll('[data-spellcheck-word="teh"]')).toHaveLength(0);
    });

    expect(screen.getByLabelText("Google Docs-style document page")).toHaveTextContent(
      "Teh teh langauge remains paralell to the source.",
    );
    expect(container.querySelectorAll('[data-spellcheck-word="langauge"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-spellcheck-word="paralell"]')).toHaveLength(1);
  });

  it("suppresses the native browser context menu inside the editor surface", () => {
    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    const editorSurface = screen.getByLabelText("Google Docs-style document page");
    const contextMenuEvent = createEvent.contextMenu(editorSurface);
    fireEvent(editorSurface, contextMenuEvent);

    expect(contextMenuEvent.defaultPrevented).toBe(true);
    expect(screen.queryByRole("menu", { name: "Spelling suggestions" })).not.toBeInTheDocument();
  });

  it("opens spellcheck from the Google Docs shortcut", async () => {
    render(<EditorWorkspace initialDocument={createSpellcheckFixture()} />);

    await userEvent.keyboard("{Control>}{Alt>}x{/Alt}{/Control}");

    expect(screen.getByRole("dialog", { name: "Spelling and grammar check" })).toBeInTheDocument();
  });

  it("toggles editing, review, PDF preview, and source panels from the top toolbar", async () => {
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

    const editingButton = screen.getByRole("button", { name: "Editing mode" });
    const reviewButton = screen.getByRole("button", { name: /^Review$/i });
    const pdfPreviewButton = screen.getByRole("button", { name: /pdf preview/i });
    const sourceButton = screen.getByRole("button", { name: "Show source" });

    expect(editingButton).toHaveAttribute("aria-pressed", "true");
    expect(reviewButton).toHaveAttribute("aria-pressed", "false");
    expect(pdfPreviewButton).toHaveAttribute("aria-pressed", "false");
    expect(sourceButton).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(sourceButton);
    await userEvent.click(reviewButton);
    await userEvent.click(pdfPreviewButton);

    expect(editingButton).toHaveAttribute("aria-pressed", "false");
    expect(reviewButton).toHaveAttribute("aria-pressed", "true");
    expect(pdfPreviewButton).toHaveAttribute("aria-pressed", "true");
    expect(sourceButton).toHaveAttribute("aria-pressed", "true");
    const sourcePanel = screen.getByRole("complementary", { name: "Generated LaTeX source" });
    expect(within(sourcePanel).getByText("\\documentclass{book}")).toBeInTheDocument();
    expect(within(sourcePanel).getByText("0 diagnostics")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Source review" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "PDF preview" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Compiled PDF preview page" })).toBeInTheDocument();
    expect(await screen.findByLabelText("PDF preview verified")).toBeInTheDocument();

    await userEvent.click(reviewButton);
    await userEvent.click(pdfPreviewButton);
    await userEvent.click(sourceButton);

    expect(editingButton).toHaveAttribute("aria-pressed", "true");
    expect(reviewButton).toHaveAttribute("aria-pressed", "false");
    expect(pdfPreviewButton).toHaveAttribute("aria-pressed", "false");
    expect(sourceButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("complementary", { name: "Source review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "PDF preview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Generated LaTeX source" })).not.toBeInTheDocument();

    await userEvent.click(sourceButton);
    await userEvent.click(reviewButton);
    await userEvent.click(pdfPreviewButton);
    await userEvent.click(editingButton);

    expect(editingButton).toHaveAttribute("aria-pressed", "true");
    expect(reviewButton).toHaveAttribute("aria-pressed", "false");
    expect(pdfPreviewButton).toHaveAttribute("aria-pressed", "false");
    expect(sourceButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("complementary", { name: "Source review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "PDF preview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Generated LaTeX source" })).not.toBeInTheDocument();
  });

  it("changes the document class and reflects it in generated source and version history", async () => {
    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    expect(screen.getAllByRole("option")).toHaveLength(pdfPreviewableLyxDocumentClasses.length);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Document class" }), "europecv");
    await userEvent.click(screen.getByRole("button", { name: "Show source" }));

    expect(screen.getByRole("complementary", { name: "Generated LaTeX source" })).toHaveTextContent("\\documentclass{europecv}");

    await userEvent.click(screen.getByRole("button", { name: "Version history" }));

    const historyDialog = screen.getByRole("dialog", { name: "Version history" });
    expect(within(historyDialog).getByRole("button", { name: "Changed document class to Europe CV" })).toBeInTheDocument();
  });

  it("tracks author-attributed insertions and deletions from the review panel and resolves them", async () => {
    const { container } = render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    await userEvent.click(screen.getByRole("button", { name: /^Review$/i }));

    const reviewPanel = screen.getByRole("complementary", { name: "Source review" });
    await userEvent.clear(within(reviewPanel).getByRole("textbox", { name: "Review author" }));
    await userEvent.type(within(reviewPanel).getByRole("textbox", { name: "Review author" }), "Alex Reviewer");
    await userEvent.selectOptions(within(reviewPanel).getByRole("combobox", { name: "Review target block" }), "block-intro");
    await userEvent.type(within(reviewPanel).getByRole("textbox", { name: "Tracked deletion text" }), "velocity");
    await userEvent.click(within(reviewPanel).getByRole("button", { name: "Track deletion" }));

    expect(container.querySelectorAll(".ik-tracked-delete")).toHaveLength(1);
    expect(within(reviewPanel).getByText("Tracked deletion recorded.")).toBeInTheDocument();
    expect(within(reviewPanel).getByText("Alex Reviewer")).toBeInTheDocument();

    await userEvent.type(within(reviewPanel).getByRole("textbox", { name: "Tracked insertion anchor" }), "Let ");
    await userEvent.type(within(reviewPanel).getByRole("textbox", { name: "Tracked insertion text" }), "carefully ");
    await userEvent.click(within(reviewPanel).getByRole("button", { name: "Track insertion" }));

    expect(container.querySelectorAll(".ik-tracked-insert")).toHaveLength(1);
    expect(screen.getByLabelText("Google Docs-style document page")).toHaveTextContent("Let carefully v denote velocity");

    const acceptButtons = within(reviewPanel).getAllByRole("button", { name: "Accept" });
    await userEvent.click(acceptButtons[0]);

    expect(screen.getByLabelText("Google Docs-style document page")).toHaveTextContent("Let carefully v denote velocity");
    expect(container.querySelectorAll(".ik-tracked-insert")).toHaveLength(0);

    const rejectButtons = within(reviewPanel).getAllByRole("button", { name: "Reject" });
    await userEvent.click(rejectButtons[0]);

    expect(screen.getByLabelText("Google Docs-style document page")).toHaveTextContent("Let carefully v denote velocity");
    expect(container.querySelectorAll(".ik-tracked-delete")).toHaveLength(0);
    expect(within(reviewPanel).getByText("No tracked changes yet.")).toBeInTheDocument();
  });

  it("recompiles the PDF preview when the document changes while preview stays open", async () => {
    let responseIndex = 0;
    let resolveSecondResponse: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(async () => {
      responseIndex += 1;
      const previewSuffix = responseIndex === 1 ? "" : "2";
      const response = new Response(JSON.stringify({
        status: "compiled",
        artifactName: `fixture-restoration-foundation-preview-${responseIndex}.pdf`,
        pdfBase64: "JVBERi0xLjQ=",
        previewImageBase64: `iVBORw0KGgo${previewSuffix}=`,
        log: "compiled",
        diagnostics: [],
        extractedText: [
          "A Treatise on Motion",
          "Let v denote velocity and cite @newton1687.",
          "Uniform motion preserves proportional distance.",
          "s = vt",
        ].join("\n"),
      }), { status: 200, headers: { "content-type": "application/json" } });
      if (responseIndex === 2) {
        return await new Promise<Response>((resolve) => {
          resolveSecondResponse = resolve;
        });
      }
      return response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    await userEvent.click(screen.getByRole("button", { name: /pdf preview/i }));

    const previewPanel = screen.getByRole("complementary", { name: "PDF preview" });
    const previewImage = await screen.findByRole("img", { name: "Compiled PDF preview page" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstPreviewSrc = previewImage.getAttribute("src");
    const previewViewport = container.querySelector(".ik-pdf-page-scroll") as HTMLDivElement | null;
    expect(previewViewport).not.toBeNull();
    expect(within(previewPanel).getByRole("button", { name: "Zoom out PDF preview" })).toBeInTheDocument();
    expect(within(previewPanel).getByRole("button", { name: "Zoom in PDF preview" })).toBeInTheDocument();
    expect(within(previewPanel).getByText("100%")).toBeInTheDocument();

    Object.defineProperty(previewViewport, "scrollLeft", { configurable: true, writable: true, value: 0 });
    Object.defineProperty(previewViewport, "scrollTop", { configurable: true, writable: true, value: 0 });
    fireEvent.pointerDown(previewViewport as HTMLDivElement, { button: 0, clientX: 160, clientY: 180 });
    fireEvent.pointerMove(window, { clientX: 120, clientY: 130 });
    fireEvent.pointerUp(window);
    expect(previewViewport?.scrollLeft).toBe(40);
    expect(previewViewport?.scrollTop).toBe(50);

    await userEvent.click(within(previewPanel).getByRole("button", { name: "Zoom in PDF preview" }));
    expect(within(previewPanel).getByText("110%")).toBeInTheDocument();
    expect(previewImage).toHaveStyle("transform: scale(1.1)");

    await userEvent.click(screen.getByRole("button", { name: "Paste special" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Paste format" }), "latex");
    await userEvent.click(screen.getByRole("textbox", { name: "Paste source" }));
    await userEvent.paste("\\section{Preview Refresh}\nUpdated body.");
    await userEvent.click(screen.getByRole("button", { name: "Insert paste" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Preview Refresh" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Compiled PDF preview page" }).getAttribute("src")).toBe(firstPreviewSrc);
    expect(screen.queryByText("Compiling PDF preview")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Refreshing preview")).toBeInTheDocument();
    });

    if (resolveSecondResponse) {
      resolveSecondResponse(new Response(JSON.stringify({
        status: "compiled",
        artifactName: "fixture-restoration-foundation-preview-2.pdf",
        pdfBase64: "JVBERi0xLjQ=",
        previewImageBase64: "iVBORw0KGgo2=",
        log: "compiled",
        diagnostics: [],
        extractedText: [
          "A Treatise on Motion",
          "Preview Refresh",
          "Updated body.",
        ].join("\n"),
      }), { status: 200, headers: { "content-type": "application/json" } }));
    }

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByRole("button", { name: /^PDF preview$/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("complementary", { name: "PDF preview" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Compiled PDF preview page" }).getAttribute("src")).not.toBe(firstPreviewSrc);
    expect(screen.queryByText("Refreshing preview")).not.toBeInTheDocument();
  });

  it("refreshes the PDF preview and updates the document surface when the document class changes", async () => {
    let responseIndex = 0;
    const fetchMock = vi.fn(async () => {
      responseIndex += 1;
      const response = responseIndex === 1
        ? {
            status: "compiled",
            artifactName: "fixture-restoration-foundation-preview-book.pdf",
            pdfBase64: "JVBERi0xLjQ=",
            previewImageBase64: "iVBORw0KGgo-book=",
            log: "compiled",
            diagnostics: [],
            extractedText: [
              "A Treatise on Motion",
              "Let v denote velocity and cite @newton1687.",
            ].join("\n"),
          }
        : {
            status: "compiled",
            artifactName: "fixture-restoration-foundation-preview-beamer.pdf",
            pdfBase64: "JVBERi0xLjQ=",
            previewImageBase64: "iVBORw0KGgo-beamer=",
            log: "compiled",
            diagnostics: [],
            extractedText: [
              "A Treatise on Motion",
              "Let v denote velocity and cite @newton1687.",
            ].join("\n"),
          };
      return new Response(JSON.stringify(response), { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    await userEvent.click(screen.getByRole("button", { name: /pdf preview/i }));

    const firstPreviewImage = await screen.findByRole("img", { name: "Compiled PDF preview page" });
    const firstPreviewSrc = firstPreviewImage.getAttribute("src");
    expect(firstPreviewSrc).toContain("book");

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Document class" }), "beamer");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(container.querySelector(".ik-doc-page-stack")).toHaveAttribute("data-document-behavior", "beamer");
      expect(screen.getByRole("img", { name: "Compiled PDF preview page" }).getAttribute("src")).not.toBe(firstPreviewSrc);
    });
  });

  it("normalizes unsupported saved document classes to a PDF-renderable fallback", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      status: "compiled",
      artifactName: "fixture-restoration-foundation-preview-article.pdf",
      pdfBase64: "JVBERi0xLjQ=",
      previewImageBase64: "iVBORw0KGgo-article=",
      log: "compiled",
      diagnostics: [],
      extractedText: [
        "A Treatise on Motion",
        "Let v denote velocity and cite @newton1687.",
      ].join("\n"),
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    render(<EditorWorkspace initialDocument={{
      ...restorationFoundationFixture,
      settings: {
        ...restorationFoundationFixture.settings,
        documentClass: "acmart",
        template: "lyx-acmart",
        templateFamily: "Articles",
      },
    }} />);

    expect(screen.getByRole("combobox", { name: "Document class" })).toHaveValue("article");
    expect(screen.queryByRole("option", { name: "Association for Computing Machinery (ACM)" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Show source" }));
    expect(screen.getByRole("complementary", { name: "Generated LaTeX source" })).toHaveTextContent("\\documentclass{article}");

    await userEvent.click(screen.getByRole("button", { name: /pdf preview/i }));
    expect(await screen.findByRole("img", { name: "Compiled PDF preview page" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
    await userEvent.type(within(findDialog).getByRole("searchbox", { name: "Find text" }), "velocity");
    await userEvent.type(within(findDialog).getByRole("textbox", { name: "Replace with" }), "speed");
    await userEvent.click(within(findDialog).getByRole("button", { name: "Find next" }));
    await userEvent.click(within(findDialog).getByRole("button", { name: "Replace all" }));

    expect(await within(findDialog).findByText("1 replacement")).toBeInTheDocument();
    const editorPage = screen.getAllByLabelText("Google Docs-style document page").at(-1);
    expect(editorPage).toBeDefined();
    expect(editorPage).toHaveTextContent(
      "Let v denote speed and cite @newton1687.",
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

  it("resizes the left workspace with the drag handle", async () => {
    const { container } = render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    const workspace = container.querySelector(".ik-doc-workspace");
    const resizeHandle = screen.getByRole("separator", { name: "Resize left sidebar" });

    expect(workspace).toHaveStyle("--ik-left-sidebar-width: 268px");

    fireEvent.pointerDown(resizeHandle, { clientX: 268 });
    fireEvent.pointerMove(window, { clientX: 348 });
    fireEvent.pointerUp(window);

    await waitFor(() => {
      expect(workspace).toHaveStyle("--ik-left-sidebar-width: 348px");
    });

    resizeHandle.focus();
    fireEvent.keyDown(resizeHandle, { key: "ArrowLeft" });

    expect(workspace).toHaveStyle("--ik-left-sidebar-width: 332px");
  });

  it("shows version history and restores prior workspace states through undo and redo", async () => {
    render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Add document tab" }));
    expect(await screen.findByRole("tab", { name: "Tab 2" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Version history" }));

    const historyDialog = screen.getByRole("dialog", { name: "Version history" });
    expect(within(historyDialog).getByText("Restore recent workspace states, jump back to a known-good version, or step through your edit trail.")).toBeInTheDocument();
    expect(within(historyDialog).getByText(/2\s+of\s+2\s+versions/)).toBeInTheDocument();
    expect(within(historyDialog).getByRole("button", { name: "Added Tab 2" })).toBeInTheDocument();
    expect(within(historyDialog).getByRole("button", { name: "Undo last change" })).toBeEnabled();

    await userEvent.click(within(historyDialog).getByRole("button", { name: "Undo last change" }));

    expect(screen.queryByRole("tab", { name: "Tab 2" })).not.toBeInTheDocument();
    expect(within(historyDialog).getByRole("button", { name: "Redo last change" })).toBeEnabled();

    await userEvent.click(within(historyDialog).getByRole("button", { name: "Redo last change" }));

    expect(await screen.findByRole("tab", { name: "Tab 2" })).toBeInTheDocument();

    await userEvent.click(within(historyDialog).getByRole("button", { name: "Opened document" }));

    expect(screen.queryByRole("tab", { name: "Tab 2" })).not.toBeInTheDocument();
    expect(within(historyDialog).getByRole("button", { name: "Opened document" })).toHaveAttribute("aria-current", "true");
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

  it("persists and restores document tabs through canonical metadata", async () => {
    const savedDocuments: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body ?? "{}")) as { document: unknown };
      savedDocuments.push(payload.document);

      return new Response(JSON.stringify({ document: payload.document }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }));

    const { unmount } = render(<EditorWorkspace initialDocument={restorationFoundationFixture} />);

    await userEvent.click(screen.getByRole("button", { name: "Add document tab" }));
    await userEvent.click(screen.getByRole("button", { name: "Open paste special" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Paste format" }), "latex");
    await userEvent.click(screen.getByRole("textbox", { name: "Paste source" }));
    await userEvent.paste("\\section{Persisted Tab Section}\nPersisted tab body.");
    await userEvent.click(screen.getByRole("button", { name: "Insert paste" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Saved")).toBeInTheDocument();
    const savedDocument = savedDocuments.at(-1) as typeof restorationFoundationFixture;
    expect(savedDocument.metadata.workspace?.activeDocumentTabId).toBe("tab-2");
    expect(savedDocument.metadata.workspace?.documentTabs).toHaveLength(2);
    expect(JSON.stringify(savedDocument.metadata.workspace?.documentTabs[0].blocks)).toContain("A Treatise on Motion");
    expect(JSON.stringify(savedDocument.metadata.workspace?.documentTabs[1].blocks)).toContain("Persisted Tab Section");

    unmount();
    render(<EditorWorkspace initialDocument={savedDocument} />);

    const restoredTabList = screen.getByRole("tablist", { name: "Document tabs" });
    expect(within(restoredTabList).getByRole("tab", { name: "Tab 2" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { level: 1, name: "Persisted Tab Section" })).toBeInTheDocument();

    await userEvent.click(within(restoredTabList).getByRole("tab", { name: "Tab 1" }));

    expect(screen.getByRole("heading", { level: 1, name: "A Treatise on Motion" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Persisted Tab Section" })).not.toBeInTheDocument();
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
