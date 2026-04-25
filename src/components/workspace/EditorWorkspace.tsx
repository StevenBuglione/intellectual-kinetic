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
  Braces,
  CheckCircle2,
  Code2,
  Columns3,
  FileText,
  Highlighter,
  PanelRightOpen,
  Save,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { CanonicalDocument, CanonicalInline } from "@/lib/editor-core/types";
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
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
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
        class: "ik-editor-prose",
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

  return (
    <main className="ik-shell">
      <header className="ik-topbar">
        <div>
          <p className="ik-kicker">Intellectual Kinetic</p>
          <h1>{document.title}</h1>
        </div>
        <div className="ik-topbar-actions">
          <span className="ik-status-chip">
            <CheckCircle2 size={16} />
            AST source of truth
          </span>
          {saveState !== "idle" ? (
            <span className="ik-save-state" aria-live="polite">
              {saveState === "saving" ? "Saving" : "Saved"}
            </span>
          ) : null}
          <button className="ik-icon-button" type="button" onClick={saveDocument} aria-label="Save document">
            <Save size={18} />
          </button>
          <button
            className="ik-secondary-button"
            type="button"
            onClick={() => setSourceOpen((open) => !open)}
          >
            <PanelRightOpen size={17} />
            {sourceOpen ? "Hide source" : "Show source"}
          </button>
        </div>
      </header>

      <section className={sourceOpen ? "ik-workspace ik-workspace-source-open" : "ik-workspace"}>
        <aside className="ik-source-review" aria-label="Source review">
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

        <section className="ik-document-column" aria-label="Document editor">
          <div className="ik-toolbar" aria-label="Editor toolbar">
            <button type="button" className="ik-tool" onClick={() => editor?.chain().focus().toggleBold().run()} aria-label="Bold">
              <strong>B</strong>
            </button>
            <button type="button" className="ik-tool" onClick={() => editor?.chain().focus().toggleItalic().run()} aria-label="Italic">
              <em>I</em>
            </button>
            <button type="button" className="ik-tool" onClick={() => editor?.chain().focus().toggleHighlight?.().run()} aria-label="Highlight">
              <Highlighter size={17} />
            </button>
            <button type="button" className="ik-tool" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} aria-label="Math block">
              <Braces size={17} />
            </button>
            <button type="button" className="ik-tool" onClick={() => editor?.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()} aria-label="Insert table">
              <Columns3 size={17} />
            </button>
          </div>
          <div className="ik-editor-surface">
            <EditorContent editor={editor} />
          </div>
        </section>

        <aside className="ik-preview-panel" aria-label="Live LaTeX preview">
          <div className="ik-panel-title">
            <Code2 size={18} />
            Live preview
          </div>
          <div className="ik-preview-page">
            {document.blocks.map((block) => {
              if (block.type === "heading") {
                return <h2 key={block.id}>{plainText(block.children)}</h2>;
              }

              if (block.type === "theorem") {
                return (
                  <blockquote key={block.id}>
                    <strong>{block.theoremKind}.</strong> {plainText(block.children)}
                  </blockquote>
                );
              }

              if (block.type === "math_display") {
                return <pre key={block.id}>{block.tex}</pre>;
              }

              return <p key={block.id}>{plainText(block.children)}</p>;
            })}
          </div>
          <p className="ik-diagnostic-count">{latex.diagnostics.length} diagnostics</p>
        </aside>

        {sourceOpen ? (
          <aside className="ik-source-panel" aria-label="Generated LaTeX source">
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

function plainText(children: CanonicalInline[]) {
  return children
    .map((child) => {
      if (child.type === "text") return child.text;
      if (child.type === "math_inline") return `(${child.tex})`;
      if (child.type === "citation") return `@${child.key}`;
      return child.target;
    })
    .join("");
}
