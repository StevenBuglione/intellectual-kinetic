"use client";

import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "next/link";
import {
  AlignLeft,
  BarChart3,
  Bold,
  Braces,
  CheckCircle2,
  ClipboardPaste,
  Code2,
  Columns3,
  FileCode2,
  FileText,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  Lock,
  MessageSquare,
  PanelLeftOpen,
  PanelRightOpen,
  Paintbrush,
  Printer,
  Redo2,
  Replace,
  Save,
  Search,
  SpellCheck,
  Star,
  Underline,
  Undo2,
  Video,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculateDocumentStatistics,
  pasteSpecialToCanonicalBlocks,
  replaceAllInCanonicalDocument,
  type PasteSpecialFormat,
} from "@/lib/editor-core/document-workflows";
import { canonicalBlockListsEqual, mergeCanonicalPatchBlocks } from "@/lib/editor-core/patch-merge";
import { compareCanonicalDocumentToPdfText } from "@/lib/editor-core/plaintext";
import type { CanonicalDocument, CanonicalInline } from "@/lib/editor-core/types";
import type { LatexCompileResult } from "@/lib/latex/compiler";
import { serializeCanonicalDocumentToLatex } from "@/lib/latex/serializer";
import { resolveEditorParitySurface } from "@/lib/layout/parity-surface";
import { createTexPageBoxesFromPreview, type TexPageBox } from "@/lib/layout/tex-page-boxes";
import { CanonicalDocumentAttributes, MathInline } from "@/lib/tiptap-adapter/extensions";
import {
  canonicalToTiptapDocument,
  tiptapDocumentToCanonicalPatch,
} from "@/lib/tiptap-adapter/projection";

type EditorWorkspaceProps = {
  initialDocument: CanonicalDocument;
};

export function EditorWorkspace({ initialDocument }: EditorWorkspaceProps) {
  const [document, setDocument] = useState(initialDocument);
  const documentRef = useRef(document);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [workflowPanel, setWorkflowPanel] = useState<"find" | "statistics" | "paste" | null>(null);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [replacementCount, setReplacementCount] = useState<number | null>(null);
  const [pasteFormat, setPasteFormat] = useState<PasteSpecialFormat>("latex");
  const [pasteSource, setPasteSource] = useState("");
  const [editorMountKey, setEditorMountKey] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [compileState, setCompileState] = useState<"idle" | "compiling" | "compiled" | "failed">("idle");
  const [compiledPreview, setCompiledPreview] = useState<LatexCompileResult | null>(null);
  const editorParitySurface = useMemo(() => resolveEditorParitySurface(document), [document]);
  const texEditorPageBoxes = useMemo(() => {
    if (editorParitySurface !== "tex-derived") {
      return [];
    }

    return createTexPageBoxesFromPreview(compiledPreview);
  }, [compiledPreview, editorParitySurface]);
  const usingTexDerivedEditorSurface = texEditorPageBoxes.length > 0;
  const latex = useMemo(() => serializeCanonicalDocumentToLatex(document), [document]);
  const documentStatistics = useMemo(() => calculateDocumentStatistics(document), [document]);
  const pdfTextVerification = useMemo(
    () => compareCanonicalDocumentToPdfText(document, compiledPreview?.extractedText),
    [compiledPreview?.extractedText, document],
  );

  useEffect(() => {
    const mountEditor = window.setTimeout(() => setEditorMountKey(1), 0);

    return () => window.clearTimeout(mountEditor);
  }, []);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      CanonicalDocumentAttributes,
      StarterKit,
      MathInline,
      Highlight,
      Placeholder.configure({
        placeholder: "Restore the document structure...",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: canonicalToTiptapDocument(document),
    editorProps: {
      attributes: {
        class: "ik-doc-editor-page",
        "aria-label": "Google Docs-style document page",
      },
    },
    onUpdate({ editor: activeEditor }) {
      const patch = tiptapDocumentToCanonicalPatch(activeEditor.getJSON());
      if (patch.blocks.length > 0) {
        const currentDocument = documentRef.current;
        const mergedBlocks = mergeCanonicalPatchBlocks(currentDocument.blocks, patch.blocks);

        if (canonicalBlockListsEqual(currentDocument.blocks, mergedBlocks)) {
          return;
        }

        const nextDocument = {
          ...currentDocument,
          blocks: mergedBlocks,
          updatedAt: new Date().toISOString(),
        };

        documentRef.current = nextDocument;
        setDocument(nextDocument);
        setCompiledPreview(null);
        setCompileState("idle");
      }
    },
  }, [editorMountKey]);

  async function saveDocument() {
    setSaveState("saving");
    const response = await fetch("/api/documents/default", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ document }),
    });

    if (response.ok) {
      const payload = (await response.json()) as { document: CanonicalDocument };
      setDocument(payload.document);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1600);
    } else {
      setSaveState("idle");
    }
  }

  const applyDocumentUpdate = useCallback((nextDocument: CanonicalDocument) => {
    documentRef.current = nextDocument;
    setDocument(nextDocument);
    editor?.commands.setContent(canonicalToTiptapDocument(nextDocument), { emitUpdate: false });
    setCompiledPreview(null);
    setCompileState("idle");
  }, [editor]);

  function replaceAllMatches() {
    const result = replaceAllInCanonicalDocument(documentRef.current, {
      find: findText,
      replaceWith: replaceText,
      matchCase: false,
    });

    setReplacementCount(result.replacementCount);
    if (result.replacementCount > 0) {
      applyDocumentUpdate(result.document);
    }
  }

  function insertPasteSpecial() {
    const pastedBlocks = pasteSpecialToCanonicalBlocks({
      format: pasteFormat,
      source: pasteSource,
    });

    if (pastedBlocks.length === 0) {
      return;
    }

    const pasteSessionId = Date.now().toString(36);
    const nextDocument = {
      ...documentRef.current,
      blocks: [
        ...documentRef.current.blocks,
        ...pastedBlocks.map((block, index) => ({
          ...block,
          id: `${block.id}-${pasteSessionId}-${index + 1}`,
        })),
      ],
      updatedAt: new Date().toISOString(),
    };

    setPasteSource("");
    applyDocumentUpdate(nextDocument);
  }

  const compilePdfPreview = useCallback(async () => {
    if (compiledPreview || compileState === "compiling" || typeof fetch === "undefined") {
      return;
    }

    setCompileState("compiling");
    try {
      const response = await fetch("/api/latex/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ document }),
      });
      const result = (await response.json()) as LatexCompileResult;
      setCompiledPreview(result);
      setCompileState(result.status === "compiled" ? "compiled" : "failed");
    } catch (error) {
      setCompiledPreview({
        status: "failed",
        artifactName: `${document.id}-preview.pdf`,
        log: error instanceof Error ? error.message : "Failed to compile PDF preview.",
        diagnostics: [
          {
            severity: "error",
            code: "preview-request-failed",
            message: "The browser could not request the PDF preview.",
          },
        ],
      });
      setCompileState("failed");
    }
  }, [compileState, compiledPreview, document]);

  async function openPdfPreview() {
    setPdfOpen(true);
    await compilePdfPreview();
  }

  useEffect(() => {
    if (!pdfOpen || compiledPreview || compileState !== "idle") {
      return;
    }

    const compileAfterEdit = window.setTimeout(() => {
      void compilePdfPreview();
    }, 450);

    return () => window.clearTimeout(compileAfterEdit);
  }, [compilePdfPreview, compileState, compiledPreview, pdfOpen]);

  const liveEditorContent = editor
    ? <EditorContent editor={editor} />
    : <CanonicalDocumentFallback document={document} />;

  return (
    <main className="ik-doc-shell">
      <header className="ik-doc-chrome">
        <div className="ik-doc-titlebar">
          <Link className="ik-doc-badge" href="/" aria-label="Docs home">
            <FileText size={22} />
          </Link>
          <div className="ik-doc-title-stack">
            <div className="ik-doc-title-line">
              <input aria-label="Document title" value={document.title} readOnly />
              <button className="ik-doc-title-icon" type="button" aria-label="Star">
                <Star size={17} />
              </button>
            </div>
            <nav aria-label="Document menu" role="menubar" className="ik-doc-menubar">
              {["File", "Edit", "View", "Insert", "Format", "Tools", "Extensions", "Help"].map((item) => (
                <button key={item} role="menuitem" type="button">
                  {item}
                </button>
              ))}
            </nav>
          </div>
          <div className="ik-doc-actions">
            <button className="ik-doc-icon ik-doc-top-icon" type="button" aria-label="Show all comments">
              <MessageSquare size={18} />
            </button>
            <button className="ik-doc-icon ik-doc-top-icon" type="button" aria-label="Join a call here">
              <Video size={18} />
            </button>
            <button className="ik-doc-share-button" type="button">
              <Lock size={16} />
              Share
            </button>
            <span className="ik-status-chip" aria-label="Persistence status">
              <CheckCircle2 size={16} />
              AST source of truth
            </span>
            {saveState !== "idle" ? (
              <span className="ik-save-state" aria-live="polite">
                {saveState === "saving" ? "Saving" : "Saved"}
              </span>
            ) : null}
            <button className="ik-doc-action-button" type="button" onClick={saveDocument}>
              <Save size={17} />
              Save
            </button>
          </div>
        </div>

        <div className="ik-doc-toolbar" role="toolbar" aria-label="Formatting toolbar">
          <label className="ik-doc-menu-search">
            <Search size={16} aria-hidden="true" />
            <input
              role="combobox"
              aria-label="Search the menus"
              aria-controls="ik-doc-menu-search-results"
              aria-expanded="false"
              readOnly
            />
            <span id="ik-doc-menu-search-results" role="listbox" hidden />
          </label>
          <button
            type="button"
            className="ik-doc-icon"
            aria-label="Find and replace"
            aria-pressed={workflowPanel === "find"}
            onClick={() => setWorkflowPanel((panel) => panel === "find" ? null : "find")}
          >
            <Replace size={16} />
          </button>
          <button type="button" className="ik-doc-icon" aria-label="Undo" onClick={() => editor?.chain().focus().undo().run()}>
            <Undo2 size={16} />
          </button>
          <button type="button" className="ik-doc-icon" aria-label="Redo" onClick={() => editor?.chain().focus().redo().run()}>
            <Redo2 size={16} />
          </button>
          <button type="button" className="ik-doc-icon" aria-label="Print">
            <Printer size={16} />
          </button>
          <button type="button" className="ik-doc-icon" aria-label="Spelling and grammar check">
            <SpellCheck size={16} />
          </button>
          <button
            type="button"
            className="ik-doc-icon"
            aria-label="Document statistics"
            aria-pressed={workflowPanel === "statistics"}
            onClick={() => setWorkflowPanel((panel) => panel === "statistics" ? null : "statistics")}
          >
            <BarChart3 size={16} />
          </button>
          <button type="button" className="ik-doc-icon" aria-label="Paint format">
            <Paintbrush size={16} />
          </button>
          <span className="ik-doc-divider" />
          <button type="button" className="ik-doc-select">
            100%
          </button>
          <button type="button" className="ik-doc-select">
            Normal text
          </button>
          <button type="button" className="ik-doc-select">
            Arial
          </button>
          <button type="button" className="ik-doc-icon" aria-label="Decrease font size">
            -
          </button>
          <button type="button" className="ik-doc-size">
            11
          </button>
          <button type="button" className="ik-doc-icon" aria-label="Increase font size">
            +
          </button>
          <span className="ik-doc-divider" />
          <button type="button" className="ik-doc-icon" onClick={() => editor?.chain().focus().toggleBold().run()} aria-label="Bold">
            <Bold size={16} />
          </button>
          <button type="button" className="ik-doc-icon" onClick={() => editor?.chain().focus().toggleItalic().run()} aria-label="Italic">
            <Italic size={16} />
          </button>
          <button type="button" className="ik-doc-icon" aria-label="Underline">
            <Underline size={16} />
          </button>
          <button type="button" className="ik-doc-icon" onClick={() => editor?.chain().focus().toggleHighlight?.().run()} aria-label="Highlight">
            <Highlighter size={16} />
          </button>
          <button type="button" className="ik-doc-icon" aria-label="Link">
            <LinkIcon size={16} />
          </button>
          <button type="button" className="ik-doc-icon" aria-label="Insert image">
            <ImageIcon size={16} />
          </button>
          <button
            type="button"
            className="ik-doc-icon"
            aria-label="Paste special"
            aria-pressed={workflowPanel === "paste"}
            onClick={() => setWorkflowPanel((panel) => panel === "paste" ? null : "paste")}
          >
            <ClipboardPaste size={16} />
          </button>
          <span className="ik-doc-divider" />
          <button type="button" className="ik-doc-icon" onClick={() => editor?.chain().focus().toggleBulletList().run()} aria-label="Bulleted list">
            <List size={16} />
          </button>
          <button type="button" className="ik-doc-icon" aria-label="Align left">
            <AlignLeft size={16} />
          </button>
          <button type="button" className="ik-doc-icon" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} aria-label="Math block">
            <Braces size={16} />
          </button>
          <button type="button" className="ik-doc-icon" onClick={() => editor?.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()} aria-label="Insert table">
            <Columns3 size={16} />
          </button>
          <span className="ik-doc-divider" />
          <button className="ik-doc-panel-button" type="button" aria-label="Editing mode">
            Editing
          </button>
          <button className="ik-doc-panel-button" type="button" aria-pressed={reviewOpen} onClick={() => setReviewOpen((open) => !open)}>
            <PanelLeftOpen size={16} />
            Review
          </button>
          <button className="ik-doc-panel-button" type="button" aria-pressed={pdfOpen} onClick={openPdfPreview}>
            <FileCode2 size={16} />
            PDF preview
          </button>
          <button className="ik-doc-panel-button" type="button" aria-pressed={sourceOpen} onClick={() => setSourceOpen((open) => !open)}>
            <PanelRightOpen size={16} />
            {sourceOpen ? "Hide source" : "Show source"}
          </button>
        </div>
      </header>

      <section
        className={[
          "ik-doc-workspace",
          reviewOpen ? "ik-doc-workspace-review-open" : "",
          pdfOpen ? "ik-doc-workspace-preview-open" : "",
          sourceOpen ? "ik-doc-workspace-source-open" : "",
        ].join(" ")}
      >
        <div className="ik-doc-left-stack">
          <aside className="ik-doc-tabs-rail" aria-label="Document tabs">
            <div className="ik-tabs-topline">
              <button type="button" aria-label="Hide tabs and outlines">
                ←
              </button>
              <span>+</span>
            </div>
            <h2>Document tabs</h2>
            <button className="ik-doc-tab-active" type="button" aria-current="true">
              <FileText size={16} />
              Tab 1
            </button>
            <p>Headings you add to the document will appear here.</p>
          </aside>

          {reviewOpen ? (
            <aside className="ik-doc-side-panel" aria-label="Source review">
              <div className="ik-panel-title">
                <FileText size={18} />
                Source regions
              </div>
              {document.blocks.map((block) => (
                <button className="ik-region" key={block.id} type="button">
                  <span>{block.provenance?.sourceRegionId ?? block.id}</span>
                  <strong>{Math.round((block.provenance?.confidence ?? 0.75) * 100)}%</strong>
                </button>
              ))}
            </aside>
          ) : null}
          {workflowPanel === "statistics" ? (
            <aside className="ik-doc-side-panel ik-workflow-panel" aria-label="Document statistics">
              <div className="ik-panel-title">
                <BarChart3 size={18} />
                Document statistics
              </div>
              <dl className="ik-stat-grid">
                <div><dt>Words</dt><dd>{documentStatistics.words} words</dd></div>
                <div><dt>Characters</dt><dd>{documentStatistics.characters} characters</dd></div>
                <div><dt>No spaces</dt><dd>{documentStatistics.charactersNoSpaces} characters</dd></div>
                <div><dt>Blocks</dt><dd>{documentStatistics.totalBlocks} blocks</dd></div>
                <div><dt>Headings</dt><dd>{documentStatistics.headings} headings</dd></div>
                <div><dt>Math</dt><dd>{documentStatistics.mathBlocks} math blocks</dd></div>
              </dl>
            </aside>
          ) : null}
          {workflowPanel === "paste" ? (
            <aside className="ik-doc-side-panel ik-workflow-panel" aria-label="Paste special">
              <div className="ik-panel-title">
                <ClipboardPaste size={18} />
                Paste special
              </div>
              <label>
                <span>Format</span>
                <select
                  aria-label="Paste format"
                  value={pasteFormat}
                  onChange={(event) => setPasteFormat(event.target.value as PasteSpecialFormat)}
                >
                  <option value="latex">LaTeX</option>
                  <option value="html">HTML</option>
                  <option value="plain-text">Plain text</option>
                </select>
              </label>
              <label>
                <span>Source</span>
                <textarea
                  aria-label="Paste source"
                  value={pasteSource}
                  onChange={(event) => setPasteSource(event.target.value)}
                />
              </label>
              <button className="ik-doc-action-button" type="button" onClick={insertPasteSpecial}>
                Insert paste
              </button>
            </aside>
          ) : null}
        </div>

        {workflowPanel === "find" ? (
          <section className="ik-find-dialog" role="dialog" aria-label="Find and replace">
            <div className="ik-find-dialog-title">
              <Replace size={16} />
              Find and replace
            </div>
            <label>
              <span>Find</span>
              <input
                type="search"
                aria-label="Find text"
                value={findText}
                onChange={(event) => {
                  setFindText(event.target.value);
                  setReplacementCount(null);
                }}
              />
            </label>
            <label>
              <span>Replace</span>
              <input
                type="text"
                aria-label="Replace with"
                value={replaceText}
                onChange={(event) => setReplaceText(event.target.value)}
              />
            </label>
            <div className="ik-find-dialog-actions">
              <button className="ik-doc-panel-button" type="button" onClick={() => setWorkflowPanel(null)}>
                Close
              </button>
              <button className="ik-doc-action-button" type="button" onClick={replaceAllMatches}>
                Replace all
              </button>
            </div>
            {replacementCount !== null ? (
              <p className="ik-workflow-status" aria-live="polite">
                {replacementCount} replacements
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="ik-doc-canvas" aria-label="Document editor">
          <div className="ik-doc-vertical-ruler" aria-label="Vertical ruler">
            {["1", "2", "3", "4", "5", "6", "7"].map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
          <div className="ik-doc-ruler" aria-label="Document ruler">
            {["1", "2", "3", "4", "5", "6", "7"].map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
          {usingTexDerivedEditorSurface ? (
            <TexPageBoxEditorSurface
              editorContent={liveEditorContent}
              pageBoxes={texEditorPageBoxes}
            />
          ) : liveEditorContent}
        </section>

        {pdfOpen ? (
          <aside className="ik-doc-side-panel ik-doc-pdf-panel" aria-label="PDF preview">
            <div className="ik-panel-title">
              <FileCode2 size={18} />
              PDF preview
            </div>
            {compileState === "compiled" && compiledPreview?.previewImageBase64 ? (
              <div className="ik-pdf-page-scroll">
                {/* The preview is a data URI generated from the compiled PDF, so next/image cannot optimize it. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="ik-pdf-rendered-page"
                  alt="Compiled PDF preview page"
                  src={`data:image/png;base64,${compiledPreview.previewImageBase64}`}
                />
              </div>
            ) : (
              <div className="ik-pdf-placeholder">
                <FileCode2 size={28} />
                <p>{compileState === "compiling" ? "Compiling PDF preview" : "Compile PDF preview"}</p>
                {compileState === "failed" ? <span>Compilation diagnostics are available below.</span> : null}
              </div>
            )}
            <p className="ik-diagnostic-count">
              {(compiledPreview?.diagnostics.length ?? latex.diagnostics.length)} diagnostics
            </p>
            {compiledPreview?.status === "compiled" && pdfTextVerification.verified ? (
              <div className="ik-pdf-verification" aria-label="PDF text verification">
                <CheckCircle2 size={16} />
                <span>PDF text matches editor</span>
              </div>
            ) : compiledPreview?.status === "compiled" && compiledPreview.extractedText ? (
              <div className="ik-pdf-verification ik-pdf-verification-warning" aria-label="PDF text verification">
                <span>PDF text differs from editor</span>
              </div>
            ) : null}
          </aside>
        ) : null}

        {sourceOpen ? (
          <aside className="ik-doc-side-panel ik-source-panel" aria-label="Generated LaTeX source">
            <div className="ik-panel-title">
              <Code2 size={18} />
              Generated LaTeX
            </div>
            <pre>
              {latex.source.split("\n").map((line, index) => (
                <span key={`${line}-${index}`}>{line || " "}</span>
              ))}
            </pre>
            <p className="ik-diagnostic-count">{latex.diagnostics.length} diagnostics</p>
          </aside>
        ) : null}
      </section>
    </main>
  );
}

function TexPageBoxEditorSurface({
  editorContent,
  pageBoxes,
}: {
  editorContent: ReactNode;
  pageBoxes: TexPageBox[];
}) {
  return (
    <section className="ik-tex-editor-surface" aria-label="TeX page box editor surface">
      {pageBoxes.map((pageBox, index) => (
        <article
          className="ik-tex-page-box"
          key={`${pageBox.backgroundImageBase64.slice(0, 12)}-${pageBox.pageNumber}`}
          style={{ width: pageBox.widthPx, height: pageBox.heightPx }}
        >
          {/* The page background is the rasterized PDF page produced by pdftoppm. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`TeX page box background ${pageBox.pageNumber}`}
            className="ik-tex-editor-page"
            src={`data:image/png;base64,${pageBox.backgroundImageBase64}`}
          />
          {index === 0 ? (
            <div className="ik-tex-page-live-layer" aria-label="Live Tiptap layer inside TeX page box">
              {editorContent}
            </div>
          ) : null}
        </article>
      ))}
    </section>
  );
}

function CanonicalDocumentFallback({ document }: { document: CanonicalDocument }) {
  return (
    <article className="ik-doc-editor-page" aria-label="Google Docs-style document page">
      {document.blocks.map((block) => {
        if (block.type === "heading") {
          const HeadingTag = `h${block.level}` as "h1" | "h2" | "h3";
          return <HeadingTag key={block.id}>{block.children.map(renderInlineFallback)}</HeadingTag>;
        }

        if (block.type === "paragraph") {
          return <p key={block.id}>{block.children.map(renderInlineFallback)}</p>;
        }

        if (block.type === "math_display") {
          return (
            <pre key={block.id}>
              <code className="language-latex">{block.tex}</code>
            </pre>
          );
        }

        if (block.type === "theorem") {
          return <blockquote key={block.id}>{block.children.map(renderInlineFallback)}</blockquote>;
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag key={block.id}>
              {block.items.map((item) => (
                <li key={item.id}>{item.children.map(renderInlineFallback)}</li>
              ))}
            </ListTag>
          );
        }

        if (block.type === "table") {
          return (
            <figure key={block.id} className="ik-doc-table-figure">
              {block.caption ? <figcaption>{block.caption.map(renderInlineFallback)}</figcaption> : null}
              <table>
                <tbody>
                  {block.rows.map((row) => (
                    <tr key={row.id}>
                      {row.cells.map((cell) => {
                        const CellTag = cell.header ? "th" : "td";
                        return <CellTag key={cell.id}>{cell.children.map(renderInlineFallback)}</CellTag>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </figure>
          );
        }

        if (block.type === "figure") {
          return (
            <figure key={block.id} className="ik-doc-figure-placeholder">
              <div>{block.altText}</div>
              {block.caption ? <figcaption>{block.caption.map(renderInlineFallback)}</figcaption> : null}
            </figure>
          );
        }

        if (block.type === "page_break") {
          return <hr key={block.id} className="ik-doc-page-break" />;
        }

        return null;
      })}
    </article>
  );
}

function renderInlineFallback(child: CanonicalInline, index: number) {
  if (child.type === "text") {
    return child.text;
  }

  if (child.type === "math_inline") {
    return (
      <code className="ik-math-inline" key={`${child.tex}-${index}`}>
        {child.tex}
      </code>
    );
  }

  if (child.type === "citation") {
    return `@${child.key}`;
  }

  if (child.type === "reference") {
    return `[[${child.target}]]`;
  }

  return null;
}
