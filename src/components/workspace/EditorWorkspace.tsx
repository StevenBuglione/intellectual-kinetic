"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignLeft,
  Bold,
  Braces,
  CheckCircle2,
  Code2,
  Columns3,
  FileCode2,
  FileText,
  Highlighter,
  Italic,
  Link,
  List,
  PanelLeftOpen,
  PanelRightOpen,
  Printer,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { CanonicalDocument } from "@/lib/editor-core/types";
import type { LatexCompileResult } from "@/lib/latex/compiler";
import { serializeCanonicalDocumentToLatex } from "@/lib/latex/serializer";
import {
  canonicalToTiptapDocument,
  tiptapDocumentToCanonicalPatch,
} from "@/lib/tiptap-adapter/projection";

type EditorWorkspaceProps = {
  initialDocument: CanonicalDocument;
};

const MathInline = Node.create({
  name: "math_inline",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      tex: { default: "" },
      "data-canonical-kind": { default: "math_inline" },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: "ik-math-inline" }),
      `\\(${HTMLAttributes.tex}\\)`,
    ];
  },
});

export function EditorWorkspace({ initialDocument }: EditorWorkspaceProps) {
  const [document, setDocument] = useState(initialDocument);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [compileState, setCompileState] = useState<"idle" | "compiling" | "compiled" | "failed">("idle");
  const [compiledPreview, setCompiledPreview] = useState<LatexCompileResult | null>(null);
  const latex = useMemo(() => serializeCanonicalDocumentToLatex(document), [document]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
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
        setDocument((current) => ({
          ...current,
          blocks: patch.blocks,
          updatedAt: new Date().toISOString(),
        }));
        setCompiledPreview(null);
        setCompileState("idle");
      }
    },
  });

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

  async function openPdfPreview() {
    setPdfOpen(true);
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
  }

  return (
    <main className="ik-doc-shell">
      <header className="ik-doc-chrome">
        <div className="ik-doc-titlebar">
          <div className="ik-doc-badge">
            <FileText size={22} />
          </div>
          <div className="ik-doc-title-stack">
            <input aria-label="Document title" value={document.title} readOnly />
            <nav aria-label="Document menu" role="menubar" className="ik-doc-menubar">
              {["File", "Edit", "View", "Insert", "Format", "Tools", "Review", "Help"].map((item) => (
                <button key={item} role="menuitem" type="button">
                  {item}
                </button>
              ))}
            </nav>
          </div>
          <div className="ik-doc-actions">
            <span className="ik-status-chip">
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
          <button type="button" className="ik-doc-icon" aria-label="Undo" onClick={() => editor?.chain().focus().undo().run()}>
            <Undo2 size={16} />
          </button>
          <button type="button" className="ik-doc-icon" aria-label="Redo" onClick={() => editor?.chain().focus().redo().run()}>
            <Redo2 size={16} />
          </button>
          <button type="button" className="ik-doc-icon" aria-label="Print">
            <Printer size={16} />
          </button>
          <span className="ik-doc-divider" />
          <button type="button" className="ik-doc-select">
            100%
          </button>
          <button type="button" className="ik-doc-select">
            Normal text
          </button>
          <button type="button" className="ik-doc-select">
            Inter
          </button>
          <button type="button" className="ik-doc-size">
            11
          </button>
          <span className="ik-doc-divider" />
          <button type="button" className="ik-doc-icon" onClick={() => editor?.chain().focus().toggleBold().run()} aria-label="Bold">
            <Bold size={16} />
          </button>
          <button type="button" className="ik-doc-icon" onClick={() => editor?.chain().focus().toggleItalic().run()} aria-label="Italic">
            <Italic size={16} />
          </button>
          <button type="button" className="ik-doc-icon" onClick={() => editor?.chain().focus().toggleHighlight?.().run()} aria-label="Highlight">
            <Highlighter size={16} />
          </button>
          <button type="button" className="ik-doc-icon" aria-label="Link">
            <Link size={16} />
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
          <button className="ik-doc-panel-button" type="button" onClick={() => setReviewOpen((open) => !open)}>
            <PanelLeftOpen size={16} />
            Review
          </button>
          <button className="ik-doc-panel-button" type="button" onClick={openPdfPreview}>
            <FileCode2 size={16} />
            PDF preview
          </button>
          <button className="ik-doc-panel-button" type="button" onClick={() => setSourceOpen((open) => !open)}>
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

        <section className="ik-doc-canvas" aria-label="Document editor">
          <div className="ik-doc-ruler" aria-label="Document ruler">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <EditorContent editor={editor} />
        </section>

        {pdfOpen ? (
          <aside className="ik-doc-side-panel ik-doc-pdf-panel" aria-label="PDF preview">
            <div className="ik-panel-title">
              <FileCode2 size={18} />
              PDF preview
            </div>
            {compileState === "compiled" && compiledPreview?.pdfBase64 ? (
              <iframe
                title="Compiled PDF preview"
                src={`data:application/pdf;base64,${compiledPreview.pdfBase64}`}
              />
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
