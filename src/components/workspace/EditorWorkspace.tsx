"use client";

import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import { Extension, type Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, Selection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
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
  SearchCheck,
  SpellCheck,
  Star,
  Underline,
  Undo2,
  Video,
} from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  acceptTrackedChange,
  calculateDocumentStatistics,
  ensureChangeTrackingAuthor,
  listTrackedChanges,
  pasteSpecialToCanonicalBlocks,
  rejectTrackedChange,
  replaceAllInCanonicalDocument,
  trackBlockDeletion,
  trackBlockInsertion,
  type PasteSpecialFormat,
  type TrackedChangeSummary,
} from "@/lib/editor-core/document-workflows";
import { canonicalBlockListsEqual, mergeCanonicalPatchBlocks } from "@/lib/editor-core/patch-merge";
import { compareCanonicalDocumentToPdfText } from "@/lib/editor-core/plaintext";
import { findSpellingIssues, lookupThesaurusSuggestions, type SpellingIssue } from "@/lib/editor-core/spellcheck";
import type {
  CanonicalDocument,
  CanonicalInline,
  CanonicalPageLayoutSettings,
  CanonicalWorkspaceDocumentTab,
} from "@/lib/editor-core/types";
import {
  coerceLyxDocumentClassToPdfPreviewable,
  pdfPreviewableLyxDocumentClassesByCategory,
} from "@/lib/lyx/document-classes";
import type { LatexCompileResult } from "@/lib/latex/compiler";
import { serializeCanonicalDocumentToLatex } from "@/lib/latex/serializer";
import { resolvePageLayoutMetrics } from "@/lib/layout/page-layout-contract";
import { resolveEditorParitySurface } from "@/lib/layout/parity-surface";
import { createTexPageBoxesFromPreview, type TexPageBox } from "@/lib/layout/tex-page-boxes";
import {
  CanonicalDocumentAttributes,
  MathInline,
  TrackedDelete,
  TrackedInsert,
} from "@/lib/tiptap-adapter/extensions";
import {
  canonicalToTiptapDocument,
  tiptapDocumentToCanonicalPatch,
} from "@/lib/tiptap-adapter/projection";

type EditorWorkspaceProps = {
  initialDocument: CanonicalDocument;
};

type DocumentOutlineHeading = {
  id: string;
  level: 1 | 2 | 3;
  title: string;
};

type DocumentTab = CanonicalWorkspaceDocumentTab;

type LeftWorkspacePanel = "outline" | "review" | "statistics" | "paste";
type WorkflowPanel = "find" | "history" | "spellcheck" | null;
type WorkspaceHistoryEntry = {
  id: string;
  label: string;
  document: CanonicalDocument;
};
type LeftSidebarResizeState = {
  startClientX: number;
  startWidth: number;
};

type FindHighlightState = {
  decorations: DecorationSet;
};

type SpellcheckHighlightState = {
  decorations: DecorationSet;
};

type SpellcheckContextMenu = {
  word: string;
  suggestion: string;
  originalText: string;
  replacementText: string;
  from: number;
  to: number;
  top: number;
  left: number;
};

type RulerDragState =
  | { kind: "top"; startClient: number; startValue: number }
  | { kind: "left"; startClient: number; startValue: number }
  | { kind: "right"; startClient: number; startValue: number };

type PdfPreviewPanState = {
  startClientX: number;
  startClientY: number;
  startScrollLeft: number;
  startScrollTop: number;
};

const horizontalRulerDivisions = Array.from({ length: 69 }, (_value, index) => {
  const left = index * 12;
  if (index % 8 === 0) {
    return {
      kind: "number" as const,
      left,
      label: String(index / 8),
    };
  }

  return {
    kind: index % 4 === 0 ? "major" as const : "minor" as const,
    left,
  };
});

const verticalRulerDivisions = Array.from({ length: 89 }, (_value, index) => {
  const top = index * 12;
  if (index % 8 === 0) {
    return {
      kind: "number" as const,
      top,
      label: String(index / 8),
    };
  }

  return {
    kind: index % 4 === 0 ? "major" as const : "minor" as const,
    top,
  };
});

const findHighlightPluginKey = new PluginKey<FindHighlightState>("ikFindHighlights");
const spellcheckHighlightPluginKey = new PluginKey<SpellcheckHighlightState>("ikSpellcheckHighlights");
const DEFAULT_LEFT_SIDEBAR_WIDTH = 268;
const MIN_LEFT_SIDEBAR_WIDTH = 248;
const MAX_LEFT_SIDEBAR_WIDTH = 520;
const FindHighlightExtension = Extension.create({
  name: "findHighlightDecorations",
  addProseMirrorPlugins() {
    return [
      new Plugin<FindHighlightState>({
        key: findHighlightPluginKey,
        state: {
          init: () => ({ decorations: DecorationSet.empty }),
          apply(transaction, previous) {
            const ranges = transaction.getMeta(findHighlightPluginKey) as FindHighlightRange[] | undefined;
            if (ranges) {
              return {
                decorations: DecorationSet.create(
                  transaction.doc,
                  ranges.map((range) => Decoration.inline(range.from, range.to, {
                    class: range.current ? "ik-find-highlight ik-find-highlight-current" : "ik-find-highlight",
                    "data-find-highlight": range.current ? "current" : "match",
                  })),
                ),
              };
            }

            if (transaction.docChanged) {
              return { decorations: previous.decorations.map(transaction.mapping, transaction.doc) };
            }

            return previous;
          },
        },
        props: {
          decorations(state) {
            return findHighlightPluginKey.getState(state)?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});

const SpellcheckHighlightExtension = Extension.create({
  name: "spellcheckHighlightDecorations",
  addProseMirrorPlugins() {
    return [
      new Plugin<SpellcheckHighlightState>({
        key: spellcheckHighlightPluginKey,
        state: {
          init: () => ({ decorations: DecorationSet.empty }),
          apply(transaction, previous) {
            const ranges = transaction.getMeta(spellcheckHighlightPluginKey) as SpellcheckRange[] | undefined;
            if (ranges) {
              return {
                decorations: DecorationSet.create(
                  transaction.doc,
                  ranges.map((range, index) => Decoration.inline(range.from, range.to, {
                    class: "ik-spellcheck-highlight",
                    "data-spellcheck-word": range.word,
                    "data-spellcheck-suggestion": range.suggestion,
                    "data-spellcheck-match-index": String(index),
                  })),
                ),
              };
            }

            if (transaction.docChanged) {
              return { decorations: previous.decorations.map(transaction.mapping, transaction.doc) };
            }

            return previous;
          },
        },
        props: {
          decorations(state) {
            return spellcheckHighlightPluginKey.getState(state)?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});

export function EditorWorkspace({ initialDocument }: EditorWorkspaceProps) {
  const [initialDocumentSnapshot] = useState(() => cloneCanonicalDocument(initialDocument));
  const initialTabs = restoreDocumentTabs(initialDocumentSnapshot);
  const initialWorkspaceDocument = activateWorkspaceDocument(initialDocumentSnapshot);
  const [document, setDocument] = useState(() => initialWorkspaceDocument);
  const documentRef = useRef(document);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [workflowPanel, setWorkflowPanel] = useState<WorkflowPanel>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [leftPanel, setLeftPanel] = useState<LeftWorkspacePanel>("outline");
  const [documentTabs, setDocumentTabs] = useState<DocumentTab[]>(() => initialTabs.tabs);
  const [activeDocumentTabId, setActiveDocumentTabId] = useState(() => initialTabs.activeDocumentTabId);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [findStatus, setFindStatus] = useState<{ activeIndex: number; total: number } | null>(null);
  const [findCursor, setFindCursor] = useState(-1);
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [replacementCount, setReplacementCount] = useState<number | null>(null);
  const [pasteFormat, setPasteFormat] = useState<PasteSpecialFormat>("latex");
  const [pasteSource, setPasteSource] = useState("");
  const [reviewAuthorName, setReviewAuthorName] = useState(() => currentTrackedAuthorName(initialWorkspaceDocument));
  const [reviewBlockId, setReviewBlockId] = useState(() => firstReviewableBlockId(initialWorkspaceDocument));
  const [reviewDeletionText, setReviewDeletionText] = useState("");
  const [reviewInsertionText, setReviewInsertionText] = useState("");
  const [reviewInsertAfterText, setReviewInsertAfterText] = useState("");
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [thesaurusQuery, setThesaurusQuery] = useState("");
  const [spellcheckMenu, setSpellcheckMenu] = useState<SpellcheckContextMenu | null>(null);
  const [ignoredSpellcheckWords, setIgnoredSpellcheckWords] = useState<string[]>([]);
  const [personalDictionaryWords, setPersonalDictionaryWords] = useState<string[]>([]);
  const [autoCorrectEntries, setAutoCorrectEntries] = useState<Record<string, string>>({});
  const [draftPageLayout, setDraftPageLayout] = useState<CanonicalPageLayoutSettings | null>(null);
  const [rulerDragState, setRulerDragState] = useState<RulerDragState | null>(null);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(DEFAULT_LEFT_SIDEBAR_WIDTH);
  const [leftSidebarResizeState, setLeftSidebarResizeState] = useState<LeftSidebarResizeState | null>(null);
  const [editorMountKey, setEditorMountKey] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [compileState, setCompileState] = useState<"idle" | "compiling" | "compiled" | "failed">("idle");
  const [compiledPreview, setCompiledPreview] = useState<LatexCompileResult | null>(null);
  const [latestPreviewResult, setLatestPreviewResult] = useState<LatexCompileResult | null>(null);
  const [previewDirty, setPreviewDirty] = useState(true);
  const [previewScale, setPreviewScale] = useState(100);
  const [pdfPreviewPanning, setPdfPreviewPanning] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<WorkspaceHistoryEntry[]>(() => [{
    id: "history-opened-document",
    label: "Opened document",
    document: snapshotWorkspaceDocument(
      initialWorkspaceDocument,
      initialTabs.tabs,
      initialTabs.activeDocumentTabId,
    ),
  }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyEntriesRef = useRef(historyEntries);
  const historyIndexRef = useRef(historyIndex);
  const pendingHistoryLabelRef = useRef<string | null>(null);
  const ignoreEditorUpdatesRef = useRef(true);
  const historySequenceRef = useRef(1);
  const pasteSequenceRef = useRef(1);
  const undoHistoryRef = useRef<() => void>(() => undefined);
  const redoHistoryRef = useRef<() => void>(() => undefined);
  const editorRef = useRef<Editor | null>(null);
  const spellcheckRangesRef = useRef<SpellcheckRange[]>([]);
  const pdfPreviewViewportRef = useRef<HTMLDivElement | null>(null);
  const pdfPreviewPanStateRef = useRef<PdfPreviewPanState | null>(null);
  const editorParitySurface = useMemo(() => resolveEditorParitySurface(document), [document]);
  const texEditorPageBoxes = useMemo(() => {
    if (editorParitySurface !== "tex-derived") {
      return [];
    }

    return createTexPageBoxesFromPreview(compiledPreview);
  }, [compiledPreview, editorParitySurface]);
  const usingTexDerivedEditorSurface = texEditorPageBoxes.length > 0;
  const effectivePageLayoutSettings = draftPageLayout ?? document.settings.pageLayout;
  const pageLayoutMetrics = useMemo(
    () => resolvePageLayoutMetrics(effectivePageLayoutSettings),
    [effectivePageLayoutSettings],
  );
  const pageLayoutStyle = useMemo<CSSProperties>(() => ({
    "--ik-doc-page-width": `${pageLayoutMetrics.widthPx}px`,
    "--ik-doc-page-height": `${pageLayoutMetrics.heightPx}px`,
    "--ik-doc-top-margin": `${pageLayoutMetrics.topMarginPx}px`,
    "--ik-doc-left-margin": `${pageLayoutMetrics.leftMarginPx}px`,
    "--ik-doc-right-margin": `${pageLayoutMetrics.rightMarginPx}px`,
    "--ik-doc-bottom-padding": `${pageLayoutMetrics.bottomPaddingPx}px`,
  }) as CSSProperties, [pageLayoutMetrics]);
  const latex = useMemo(() => serializeCanonicalDocumentToLatex(document), [document]);
  const documentStatistics = useMemo(() => calculateDocumentStatistics(document), [document]);
  const acceptedSpellcheckWords = useMemo(
    () => [...new Set([...ignoredSpellcheckWords, ...personalDictionaryWords])],
    [ignoredSpellcheckWords, personalDictionaryWords],
  );
  const spellingIssues = useMemo(
    () => findSpellingIssues(document, { acceptedWords: acceptedSpellcheckWords }),
    [acceptedSpellcheckWords, document],
  );
  const thesaurusSuggestions = useMemo(() => lookupThesaurusSuggestions(thesaurusQuery), [thesaurusQuery]);
  const trackedChanges = useMemo(() => listTrackedChanges(document), [document]);
  const currentDocumentClassOption = useMemo(
    () => coerceLyxDocumentClassToPdfPreviewable(document.settings.documentClass),
    [document.settings.documentClass],
  );
  const currentDocumentClassBehavior = currentDocumentClassOption?.behavior ?? "article";
  const reviewableBlocks = useMemo(() => document.blocks
    .filter((block): block is Extract<CanonicalDocument["blocks"][number], { children: CanonicalInline[] }> => "children" in block)
    .map((block) => ({
      id: block.id,
      label: inlineTextContent(block.children) || block.id,
    })), [document.blocks]);
  const activeReviewBlockId = reviewableBlocks.some((block) => block.id === reviewBlockId)
    ? reviewBlockId
    : (reviewableBlocks[0]?.id ?? "");
  const documentOutlineHeadings = useMemo<DocumentOutlineHeading[]>(() => document.blocks
    .filter((block): block is Extract<CanonicalDocument["blocks"][number], { type: "heading" }> => block.type === "heading")
    .map((block) => ({
      id: block.id,
      level: block.level,
      title: inlineTextContent(block.children) || "Untitled heading",
    })), [document.blocks]);
  const currentOutlineHeadingId = useMemo(() => {
    if (documentOutlineHeadings.some((heading) => heading.id === activeHeadingId)) {
      return activeHeadingId;
    }

    return documentOutlineHeadings[0]?.id ?? null;
  }, [activeHeadingId, documentOutlineHeadings]);
  const pdfTextVerification = useMemo(
    () => compareCanonicalDocumentToPdfText(document, latestPreviewResult?.extractedText ?? compiledPreview?.extractedText),
    [compiledPreview?.extractedText, document, latestPreviewResult?.extractedText],
  );
  const reviewPanelSelected = leftPanel === "review";
  const reviewOpen = leftSidebarOpen && leftPanel === "review";
  const statisticsOpen = leftSidebarOpen && leftPanel === "statistics";
  const pasteOpen = leftSidebarOpen && leftPanel === "paste";
  const resolvedLeftSidebarWidth = clampLeftSidebarWidth(leftSidebarWidth);
  const workspaceStyle = useMemo<CSSProperties>(() => ({
    "--ik-left-sidebar-width": `${resolvedLeftSidebarWidth}px`,
  }) as CSSProperties, [resolvedLeftSidebarWidth]);
  const editingModeActive = !reviewPanelSelected && !pdfOpen && !sourceOpen;
  const canUndoHistory = historyIndex > 0;
  const canRedoHistory = historyIndex < historyEntries.length - 1;
  const previewImageScale = previewScale / 100;
  const activePreviewResult = latestPreviewResult ?? compiledPreview;
  const pdfPreviewImageSrc = activePreviewResult?.status === "compiled" && activePreviewResult.previewImageBase64
    ? `data:image/png;base64,${activePreviewResult.previewImageBase64}`
    : null;
  const hasRenderedPdfPreview = pdfPreviewImageSrc !== null;
  const scaledPreviewWidth = pageLayoutMetrics.widthPx * previewImageScale;
  const scaledPreviewHeight = pageLayoutMetrics.heightPx * previewImageScale;
  const historyTimeline = useMemo(
    () => historyEntries.map((entry, index) => ({ ...entry, index })).slice().reverse(),
    [historyEntries],
  );
  const currentHistoryEntry = historyEntries[historyIndex] ?? historyEntries[0] ?? null;

  useEffect(() => {
    historyEntriesRef.current = historyEntries;
  }, [historyEntries]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  function openLeftPanel(panel: LeftWorkspacePanel) {
    setLeftPanel(panel);
    setLeftSidebarOpen(true);
  }

  function closeLeftPanel(panel: LeftWorkspacePanel, fallbackPanel: LeftWorkspacePanel = "outline") {
    setLeftPanel((currentPanel) => currentPanel === panel ? fallbackPanel : currentPanel);
  }

  function exitAuxiliaryModes() {
    setPdfOpen(false);
    setSourceOpen(false);
    closeLeftPanel("review");
  }

  function toggleReviewPanel() {
    if (reviewOpen) {
      closeLeftPanel("review");
      return;
    }

    openLeftPanel("review");
  }

  function beginLeftSidebarResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (!leftSidebarOpen) {
      return;
    }

    event.preventDefault();
    setLeftSidebarResizeState({
      startClientX: event.clientX,
      startWidth: resolvedLeftSidebarWidth,
    });
  }

  function resizeLeftSidebarBy(delta: number) {
    setLeftSidebarWidth((currentWidth) => clampLeftSidebarWidth(currentWidth + delta));
  }

  function handleLeftSidebarResizeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!leftSidebarOpen) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      resizeLeftSidebarBy(-16);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      resizeLeftSidebarBy(16);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setLeftSidebarWidth(MIN_LEFT_SIDEBAR_WIDTH);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setLeftSidebarWidth(MAX_LEFT_SIDEBAR_WIDTH);
    }
  }

  function changeDocumentClass(nextDocumentClass: string) {
    if (nextDocumentClass === documentRef.current.settings.documentClass) {
      return;
    }

    const nextClassOption = coerceLyxDocumentClassToPdfPreviewable(nextDocumentClass);
    const nextDocument = {
      ...documentRef.current,
      updatedAt: new Date().toISOString(),
      settings: {
        ...documentRef.current.settings,
        documentClass: nextClassOption.value,
        template: nextClassOption.template,
        templateFamily: nextClassOption.templateFamily,
      },
    };

    pendingHistoryLabelRef.current = `Changed document class to ${nextClassOption.label}`;
    applyDocumentUpdate(nextDocument);
  }

  const recordHistoryEntry = useCallback((
    label: string,
    nextDocument: CanonicalDocument,
    nextTabs = documentTabs,
    nextActiveTabId = activeDocumentTabId,
  ) => {
    const nextEntry = {
      id: `history-${historySequenceRef.current}`,
      label,
      document: snapshotWorkspaceDocument(nextDocument, nextTabs, nextActiveTabId),
    };
    historySequenceRef.current += 1;
    const nextEntries = [...historyEntriesRef.current.slice(0, historyIndexRef.current + 1), nextEntry].slice(-40);
    const nextIndex = nextEntries.length - 1;

    historyEntriesRef.current = nextEntries;
    historyIndexRef.current = nextIndex;
    setHistoryEntries(nextEntries);
    setHistoryIndex(nextIndex);
  }, [activeDocumentTabId, documentTabs]);

  const resetTransientWorkspaceState = useCallback(() => {
    updateFindHighlights(editorRef.current, [], -1);
    setSpellcheckMenu(null);
    if (pdfOpen) {
      setPreviewDirty(true);
      setLatestPreviewResult(compiledPreview);
    } else {
      setCompiledPreview(null);
      setLatestPreviewResult(null);
      setPreviewDirty(true);
    }
    setCompileState("idle");
    setFindCursor(-1);
    setFindStatus(null);
    setActiveHeadingId(null);
  }, [
    compiledPreview,
    pdfOpen,
    setActiveHeadingId,
    setCompiledPreview,
    setCompileState,
    setFindCursor,
    setFindStatus,
    setLatestPreviewResult,
    setPreviewDirty,
    setSpellcheckMenu,
  ]);

  function applyHistoryDocument(historyDocument: CanonicalDocument) {
    const nextDocument = activateWorkspaceDocument(historyDocument);
    const restoredTabs = restoreDocumentTabs(historyDocument);

    documentRef.current = nextDocument;
    setDocument(nextDocument);
    setDocumentTabs(restoredTabs.tabs);
    setActiveDocumentTabId(restoredTabs.activeDocumentTabId);
    editorRef.current?.commands.setContent(canonicalToTiptapDocument(nextDocument), { emitUpdate: false });
    setEditorMountKey((key) => key + 1);
    resetTransientWorkspaceState();
  }

  function restoreHistoryEntry(nextIndex: number) {
    const entry = historyEntriesRef.current[nextIndex];
    if (!entry) {
      return;
    }

    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    applyHistoryDocument(entry.document);
  }

  function undoHistory() {
    if (historyIndexRef.current <= 0) {
      return;
    }

    restoreHistoryEntry(historyIndexRef.current - 1);
  }

  function redoHistory() {
    if (historyIndexRef.current >= historyEntriesRef.current.length - 1) {
      return;
    }

    restoreHistoryEntry(historyIndexRef.current + 1);
  }

  useEffect(() => {
    undoHistoryRef.current = undoHistory;
    redoHistoryRef.current = redoHistory;
  });

  function addDocumentTab() {
    const nextTabNumber = documentTabs.length + 1;
    const nextTab = {
      id: `tab-${nextTabNumber}`,
      label: `Tab ${nextTabNumber}`,
      blocks: createEmptyTabBlocks(nextTabNumber),
    };
    const nextTabs = [...documentTabs, nextTab];

    loadDocumentTabBlocks(nextTab.blocks, {
      tabs: nextTabs,
      activeTabId: nextTab.id,
      historyLabel: `Added ${nextTab.label}`,
    });
  }

  function selectDocumentTab(tabId: string) {
    if (tabId === activeDocumentTabId) {
      return;
    }

    const nextTab = documentTabs.find((tab) => tab.id === tabId);
    if (!nextTab) {
      return;
    }

    loadDocumentTabBlocks(nextTab.blocks, {
      activeTabId: tabId,
      historyLabel: `Switched to ${nextTab.label}`,
    });
  }

  function deleteDocumentTab(tabId: string) {
    if (documentTabs.length <= 1) {
      return;
    }

    const nextTabs = documentTabs.filter((tab) => tab.id !== tabId);
    const nextActiveTab = activeDocumentTabId === tabId
      ? (nextTabs[0] ?? null)
      : (nextTabs.find((tab) => tab.id === activeDocumentTabId) ?? nextTabs[0] ?? null);

    if (nextActiveTab) {
      const deletedTab = documentTabs.find((tab) => tab.id === tabId);
      loadDocumentTabBlocks(nextActiveTab.blocks, {
        tabs: nextTabs,
        activeTabId: nextActiveTab.id,
        historyLabel: `Deleted ${deletedTab?.label ?? "document tab"}`,
      });
    }
  }

  useEffect(() => {
    const mountEditor = window.setTimeout(() => setEditorMountKey(1), 0);

    return () => window.clearTimeout(mountEditor);
  }, []);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  useEffect(() => {
    function openFindFromShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "f") {
        event.preventDefault();
        setWorkflowPanel("find");
        window.setTimeout(() => findInputRef.current?.focus(), 0);
      }
    }

    window.addEventListener("keydown", openFindFromShortcut);

    return () => window.removeEventListener("keydown", openFindFromShortcut);
  }, []);

  useEffect(() => {
    if (workflowPanel === "find") {
      window.setTimeout(() => findInputRef.current?.focus(), 0);
    }
  }, [workflowPanel]);

  useEffect(() => {
    function openSpellcheckFromShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLocaleLowerCase() === "x") {
        event.preventDefault();
        setWorkflowPanel("spellcheck");
      }
    }

    window.addEventListener("keydown", openSpellcheckFromShortcut);

    return () => window.removeEventListener("keydown", openSpellcheckFromShortcut);
  }, []);

  useEffect(() => {
    if (!rulerDragState) {
      return;
    }
    const activeDrag = rulerDragState;

    function handlePointerMove(event: PointerEvent) {
      const delta = (activeDrag.kind === "top" ? event.clientY : event.clientX) - activeDrag.startClient;
      const currentLayout = resolvePageLayoutMetrics(documentRef.current.settings.pageLayout);
      const nextPageLayout: CanonicalPageLayoutSettings = {
        topMarginPx: currentLayout.topMarginPx,
        leftMarginPx: currentLayout.leftMarginPx,
        rightMarginPx: currentLayout.rightMarginPx,
      };

      if (activeDrag.kind === "top") {
        nextPageLayout.topMarginPx = activeDrag.startValue + delta;
      } else if (activeDrag.kind === "left") {
        nextPageLayout.leftMarginPx = activeDrag.startValue + delta;
      } else {
        nextPageLayout.rightMarginPx = activeDrag.startValue - delta;
      }

      setDraftPageLayout({
        topMarginPx: resolvePageLayoutMetrics(nextPageLayout).topMarginPx,
        leftMarginPx: resolvePageLayoutMetrics(nextPageLayout).leftMarginPx,
        rightMarginPx: resolvePageLayoutMetrics(nextPageLayout).rightMarginPx,
      });
    }

    function handlePointerUp() {
      if (draftPageLayout) {
        const currentPageLayout = documentRef.current.settings.pageLayout ?? {};
        const layoutChanged = currentPageLayout.topMarginPx !== draftPageLayout.topMarginPx
          || currentPageLayout.leftMarginPx !== draftPageLayout.leftMarginPx
          || currentPageLayout.rightMarginPx !== draftPageLayout.rightMarginPx;
        if (layoutChanged) {
          const nextDocument = {
            ...documentRef.current,
            updatedAt: new Date().toISOString(),
            settings: {
              ...documentRef.current.settings,
              pageLayout: draftPageLayout,
            },
          };
          documentRef.current = nextDocument;
          setDocument(nextDocument);
          resetTransientWorkspaceState();
          recordHistoryEntry("Adjusted document margins", nextDocument, documentTabs, activeDocumentTabId);
        }
      }
      setDraftPageLayout(null);
      setRulerDragState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [activeDocumentTabId, documentTabs, draftPageLayout, recordHistoryEntry, resetTransientWorkspaceState, rulerDragState]);

  useEffect(() => {
    if (!leftSidebarResizeState) {
      return;
    }
    const activeResize = leftSidebarResizeState;

    function handlePointerMove(event: PointerEvent) {
      setLeftSidebarWidth(clampLeftSidebarWidth(activeResize.startWidth + (event.clientX - activeResize.startClientX)));
    }

    function handlePointerUp() {
      setLeftSidebarResizeState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [leftSidebarResizeState]);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      CanonicalDocumentAttributes,
      StarterKit,
      MathInline,
      TrackedInsert,
      TrackedDelete,
      FindHighlightExtension,
      SpellcheckHighlightExtension,
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
        spellcheck: "false",
        autocorrect: "off",
        autocapitalize: "off",
      },
      handleDOMEvents: {
        contextmenu: (_view, event) => {
          event.preventDefault();
          const target = event.target;
          const element = target instanceof HTMLElement ? target : target instanceof Text ? target.parentElement : null;
          const eventPath = typeof event.composedPath === "function" ? event.composedPath() : [];
          const pathElement = eventPath.find((node): node is HTMLElement => node instanceof HTMLElement);
          const pointerElement = typeof window !== "undefined" && typeof window.document.elementFromPoint === "function"
            ? window.document.elementFromPoint(event.clientX, event.clientY)
            : null;
          const spellcheckElement = [
            element,
            pathElement,
            pointerElement instanceof HTMLElement ? pointerElement : null,
          ].reduce<HTMLElement | null>((match, candidate) => {
            if (match) {
              return match;
            }

            return candidate?.closest<HTMLElement>("[data-spellcheck-word]") ?? null;
          }, null);
          if (!spellcheckElement) {
            setSpellcheckMenu(null);
            return true;
          }

          const word = spellcheckElement.getAttribute("data-spellcheck-word");
          const suggestion = spellcheckElement.getAttribute("data-spellcheck-suggestion");
          const matchIndex = Number(spellcheckElement.getAttribute("data-spellcheck-match-index"));
          const match = Number.isFinite(matchIndex) ? spellcheckRangesRef.current[matchIndex] : null;
          if (!word || !suggestion || !match) {
            return true;
          }

          const originalText = spellcheckElement.textContent?.trim() || word;
          const replacementText = formatSpellcheckReplacement(originalText, suggestion);
          const position = clampSpellcheckMenuPosition(event.clientX, event.clientY);

          setSpellcheckMenu({
            word,
            suggestion,
            originalText,
            replacementText,
            from: match.from,
            to: match.to,
            top: position.top,
            left: position.left,
          });
          return true;
        },
      },
    },
    onUpdate({ editor: activeEditor }) {
      if (ignoreEditorUpdatesRef.current) {
        return;
      }
      syncDocumentFromEditor(activeEditor);
    },
  }, [editorMountKey]);

  useEffect(() => {
    editorRef.current = editor ?? null;
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    ignoreEditorUpdatesRef.current = true;
    const readyTimer = window.setTimeout(() => {
      ignoreEditorUpdatesRef.current = false;
    }, 0);

    return () => window.clearTimeout(readyTimer);
  }, [editor]);

  useEffect(() => {
    const nextSpellcheckRanges = findEditorSpellcheckMatches(editor, spellingIssues);
    spellcheckRangesRef.current = nextSpellcheckRanges;
    updateSpellcheckHighlights(editor, nextSpellcheckRanges);
  }, [editor, spellingIssues]);

  useEffect(() => {
    function handleHistoryShortcuts(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
        return;
      }

      if (!(event.ctrlKey || event.metaKey) || event.altKey) {
        return;
      }

      const key = event.key.toLocaleLowerCase();
      const wantsUndo = key === "z" && !event.shiftKey;
      const wantsRedo = (key === "z" && event.shiftKey) || key === "y";
      if (!wantsUndo && !wantsRedo) {
        return;
      }

      event.preventDefault();
      if (wantsUndo) {
        undoHistoryRef.current();
      } else {
        redoHistoryRef.current();
      }
    }

    window.addEventListener("keydown", handleHistoryShortcuts);

    return () => window.removeEventListener("keydown", handleHistoryShortcuts);
  }, []);

  useEffect(() => {
    function closeSpellcheckMenu(event: MouseEvent) {
      const target = event.target;
      const element = target instanceof HTMLElement ? target : target instanceof Text ? target.parentElement : null;
      if (element?.closest(".ik-spellcheck-context-menu")) {
        return;
      }

      setSpellcheckMenu(null);
    }

    function closeSpellcheckMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSpellcheckMenu(null);
      }
    }

    window.addEventListener("mousedown", closeSpellcheckMenu);
    window.addEventListener("keydown", closeSpellcheckMenuOnEscape);

    return () => {
      window.removeEventListener("mousedown", closeSpellcheckMenu);
      window.removeEventListener("keydown", closeSpellcheckMenuOnEscape);
    };
  }, []);

  function syncDocumentFromEditor(activeEditor: Editor) {
    const patch = tiptapDocumentToCanonicalPatch(activeEditor.getJSON());
    if (patch.blocks.length === 0) {
      return false;
    }

    const currentDocument = documentRef.current;
    const mergedBlocks = mergeCanonicalPatchBlocks(currentDocument.blocks, patch.blocks);

    if (canonicalBlockListsEqual(currentDocument.blocks, mergedBlocks)) {
      return false;
    }

    const nextDocument = applyConfiguredAutoCorrections({
      ...currentDocument,
      blocks: mergedBlocks,
      updatedAt: new Date().toISOString(),
    });

    documentRef.current = nextDocument;
    setDocument(nextDocument);
    const nextTabs = documentTabs.map((tab) => (
      tab.id === activeDocumentTabId ? { ...tab, blocks: nextDocument.blocks } : tab
    ));
    setDocumentTabs(nextTabs);
    resetTransientWorkspaceState();
    recordHistoryEntry(pendingHistoryLabelRef.current ?? "Edited document", nextDocument, nextTabs, activeDocumentTabId);
    pendingHistoryLabelRef.current = null;
    return true;
  }

  async function saveDocument() {
    const documentToSave = documentWithWorkspaceTabs(documentRef.current, documentTabs, activeDocumentTabId);
    setSaveState("saving");
    const response = await fetch("/api/documents/default", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ document: documentToSave }),
    });

    if (response.ok) {
      const payload = (await response.json()) as { document: CanonicalDocument };
      const nextDocument = activateWorkspaceDocument(payload.document);
      const restoredTabs = restoreDocumentTabs(payload.document);
      documentRef.current = nextDocument;
      setDocument(nextDocument);
      setDocumentTabs(restoredTabs.tabs);
      setActiveDocumentTabId(restoredTabs.activeDocumentTabId);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1600);
    } else {
      setSaveState("idle");
    }
  }

  function applyDocumentUpdate(nextDocument: CanonicalDocument) {
    documentRef.current = nextDocument;
    setDocument(nextDocument);
    const nextTabs = documentTabs.map((tab) => (
      tab.id === activeDocumentTabId ? { ...tab, blocks: nextDocument.blocks } : tab
    ));
    setDocumentTabs(nextTabs);
    editor?.commands.setContent(canonicalToTiptapDocument(nextDocument), { emitUpdate: false });
    resetTransientWorkspaceState();
    recordHistoryEntry(pendingHistoryLabelRef.current ?? "Edited document", nextDocument, nextTabs, activeDocumentTabId);
    pendingHistoryLabelRef.current = null;
  }

  function applyTrackedDeletion() {
    if (!activeReviewBlockId || !reviewDeletionText.trim()) {
      setReviewStatus("Choose a block and enter text to delete.");
      return;
    }

    const authorResult = ensureChangeTrackingAuthor(documentRef.current, reviewAuthorName);
    const nextDocument = trackBlockDeletion(authorResult.document, {
      blockId: activeReviewBlockId,
      text: reviewDeletionText,
      authorId: authorResult.author.id,
      authorName: authorResult.author.name,
    });
    if (nextDocument === authorResult.document) {
      setReviewStatus("Could not find that text in the selected block.");
      return;
    }

    pendingHistoryLabelRef.current = `Tracked deletion by ${authorResult.author.name}`;
    applyDocumentUpdate(nextDocument);
    setReviewDeletionText("");
    setReviewStatus("Tracked deletion recorded.");
  }

  function applyTrackedInsertion() {
    if (!activeReviewBlockId || !reviewInsertionText.trim()) {
      setReviewStatus("Choose a block and enter text to insert.");
      return;
    }

    const authorResult = ensureChangeTrackingAuthor(documentRef.current, reviewAuthorName);
    const nextDocument = trackBlockInsertion(authorResult.document, {
      blockId: activeReviewBlockId,
      insertAfterText: reviewInsertAfterText,
      text: reviewInsertionText,
      authorId: authorResult.author.id,
      authorName: authorResult.author.name,
    });
    if (nextDocument === authorResult.document) {
      setReviewStatus("Could not find the insertion anchor in the selected block.");
      return;
    }

    pendingHistoryLabelRef.current = `Tracked insertion by ${authorResult.author.name}`;
    applyDocumentUpdate(nextDocument);
    setReviewInsertionText("");
    setReviewInsertAfterText("");
    setReviewStatus("Tracked insertion recorded.");
  }

  function resolveReviewChange(change: TrackedChangeSummary, resolution: "accept" | "reject") {
    const nextDocument = resolution === "accept"
      ? acceptTrackedChange(documentRef.current, change.id)
      : rejectTrackedChange(documentRef.current, change.id);
    if (nextDocument === documentRef.current) {
      setReviewStatus("That tracked change could not be resolved.");
      return;
    }

    pendingHistoryLabelRef.current = `${resolution === "accept" ? "Accepted" : "Rejected"} change by ${change.authorName}`;
    applyDocumentUpdate(nextDocument);
    setReviewStatus(`${resolution === "accept" ? "Accepted" : "Rejected"} tracked ${change.kind === "tracked_insert" ? "insertion" : "deletion"}.`);
  }

  function beginRulerDrag(event: ReactPointerEvent<HTMLButtonElement>, kind: RulerDragState["kind"], startValue: number) {
    event.preventDefault();
    setRulerDragState({
      kind,
      startClient: kind === "top" ? event.clientY : event.clientX,
      startValue,
    });
  }

  function loadDocumentTabBlocks(
    blocks: CanonicalDocument["blocks"],
    options?: {
      tabs?: DocumentTab[];
      activeTabId?: string;
      historyLabel?: string;
    },
  ) {
    const nextTabs = options?.tabs ?? documentTabs;
    const nextActiveTabId = options?.activeTabId ?? activeDocumentTabId;
    const nextDocument = {
      ...documentRef.current,
      blocks,
      updatedAt: new Date().toISOString(),
    };

    documentRef.current = nextDocument;
    setDocument(nextDocument);
    setDocumentTabs(nextTabs);
    setActiveDocumentTabId(nextActiveTabId);
    editor?.commands.setContent(canonicalToTiptapDocument(nextDocument), { emitUpdate: false });
    setEditorMountKey((key) => key + 1);
    resetTransientWorkspaceState();
    if (options?.historyLabel) {
      recordHistoryEntry(options.historyLabel, nextDocument, nextTabs, nextActiveTabId);
    }
  }

  function selectFindMatch(direction: "next" | "previous" = "next") {
    if (!editor || findText.length === 0) {
      updateFindHighlights(editor, [], -1);
      setFindCursor(-1);
      setFindStatus({ activeIndex: 0, total: 0 });
      return;
    }

    const matches = findEditorTextMatches(editor, findText, { matchCase, wholeWord });
    if (matches.length === 0) {
      updateFindHighlights(editor, [], -1);
      setFindCursor(-1);
      setFindStatus({ activeIndex: 0, total: 0 });
      return;
    }

    const step = direction === "next" ? 1 : -1;
    const nextIndex = findCursor < 0
      ? direction === "next" ? 0 : matches.length - 1
      : (findCursor + step + matches.length) % matches.length;
    const match = matches[nextIndex];

    updateFindHighlights(editor, matches, nextIndex);
    editor.view.dispatch(editor.state.tr.setSelection(Selection.near(editor.state.doc.resolve(match.to), 1)));
    editor.view.focus();
    setFindCursor(nextIndex);
    setFindStatus({ activeIndex: nextIndex + 1, total: matches.length });
    setReplacementCount(null);
  }

  function replaceAllMatches() {
    if (findText.length === 0) {
      updateFindHighlights(editor, [], -1);
      setReplacementCount(0);
      setFindStatus({ activeIndex: 0, total: 0 });
      return;
    }

    const matches = editor ? findEditorTextMatches(editor, findText, { matchCase, wholeWord }) : [];
    if (matches.length > 0 && editor) {
      setReplacementCount(matches.length);
      pendingHistoryLabelRef.current = "Replaced all matches";
      replaceEditorTextRanges(editor, matches, replaceText);
      syncDocumentFromEditor(editor);
      updateFindHighlights(editor, [], -1);
      setFindCursor(-1);
      setFindStatus(null);
      return;
    }

    const result = replaceAllInCanonicalDocument(documentRef.current, {
      find: findText,
      replaceWith: replaceText,
      matchCase,
    });
    setReplacementCount(result.replacementCount);
    if (result.replacementCount > 0) {
      pendingHistoryLabelRef.current = "Replaced all matches";
      applyDocumentUpdate(result.document);
      updateFindHighlights(editor, [], -1);
      setFindCursor(-1);
      setFindStatus(null);
    }
  }

  function replaceCurrentMatch() {
    if (!editor || findText.length === 0) {
      updateFindHighlights(editor, [], -1);
      setReplacementCount(0);
      setFindStatus({ activeIndex: 0, total: 0 });
      return;
    }

    const matches = findEditorTextMatches(editor, findText, { matchCase, wholeWord });
    if (matches.length === 0) {
      updateFindHighlights(editor, [], -1);
      setReplacementCount(0);
      setFindCursor(-1);
      setFindStatus({ activeIndex: 0, total: 0 });
      return;
    }

    const selectedMatch = matches[findCursor] ?? matches[0];
    pendingHistoryLabelRef.current = "Replaced current match";
    replaceEditorTextRanges(editor, [selectedMatch], replaceText);
    syncDocumentFromEditor(editor);
    updateFindHighlights(editor, [], -1);
    setReplacementCount(1);
    setFindCursor(-1);
    setFindStatus(null);
  }

  function closeFindDialog() {
    updateFindHighlights(editor, [], -1);
    setFindCursor(-1);
    setFindStatus(null);
    setReplacementCount(null);
    setWorkflowPanel(null);
  }

  function insertPasteSpecial() {
    const pastedBlocks = pasteSpecialToCanonicalBlocks({
      format: pasteFormat,
      source: pasteSource,
    });

    if (pastedBlocks.length === 0) {
      return;
    }

    const pasteSessionId = `paste-${pasteSequenceRef.current}`;
    pasteSequenceRef.current += 1;
    const nextDocument = applyConfiguredAutoCorrections({
      ...documentRef.current,
      blocks: [
        ...documentRef.current.blocks,
        ...pastedBlocks.map((block, index) => ({
          ...block,
          id: `${block.id}-${pasteSessionId}-${index + 1}`,
        })),
      ],
      updatedAt: new Date().toISOString(),
    });

    setPasteSource("");
    pendingHistoryLabelRef.current = `Pasted ${humanizePasteFormat(pasteFormat)}`;
    applyDocumentUpdate(nextDocument);
    openLeftPanel("outline");
  }

  function applySpellingIssue(issue: SpellingIssue) {
    const result = replaceAllInCanonicalDocument(documentRef.current, {
      find: issue.word,
      replaceWith: issue.suggestion,
      transformReplacement: (matchedText) => formatSpellcheckReplacement(matchedText, issue.suggestion),
    });
    if (result.replacementCount === 0) {
      return;
    }

    pendingHistoryLabelRef.current = `Corrected ${issue.word} spelling`;
    applyDocumentUpdate(result.document);
  }

  function applySpellcheckContextSuggestion() {
    if (!spellcheckMenu || !editorRef.current) {
      return;
    }

    pendingHistoryLabelRef.current = `Corrected ${spellcheckMenu.originalText} spelling`;
    setSpellcheckMenu(null);
    replaceEditorTextRanges(editorRef.current, [{
      from: spellcheckMenu.from,
      to: spellcheckMenu.to,
    }], spellcheckMenu.replacementText);
  }

  function ignoreAllSpellingIssues(word: string) {
    setSpellcheckMenu(null);
    setIgnoredSpellcheckWords((currentWords) => currentWords.includes(word) ? currentWords : [...currentWords, word]);
  }

  function addWordToPersonalDictionary(word: string) {
    setSpellcheckMenu(null);
    setPersonalDictionaryWords((currentWords) => currentWords.includes(word) ? currentWords : [...currentWords, word]);
  }

  function handleSpellcheckMenuMouseDown(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function enableAlwaysCorrect(word: string, suggestion: string) {
    setSpellcheckMenu(null);
    setAutoCorrectEntries((currentEntries) => ({ ...currentEntries, [word]: suggestion }));
    applySpellingIssue({
      word,
      suggestion,
      occurrences: 0,
      context: "",
    });
  }

  function applyConfiguredAutoCorrections(nextDocument: CanonicalDocument): CanonicalDocument {
    let correctedDocument = nextDocument;

    for (const [word, suggestion] of Object.entries(autoCorrectEntries)) {
      const result = replaceAllInCanonicalDocument(correctedDocument, {
        find: word,
        replaceWith: suggestion,
        transformReplacement: (matchedText) => formatSpellcheckReplacement(matchedText, suggestion),
      });
      correctedDocument = result.document;
    }

    return correctedDocument;
  }

  function focusOutlineHeading(headingId: string) {
    setActiveHeadingId(headingId);

    const headingElement = findCanonicalElement(headingId);
    if (typeof headingElement?.scrollIntoView === "function") {
      headingElement.scrollIntoView({ block: "center", behavior: "smooth" });
    }

    if (!editor) {
      return;
    }

    let blockPosition: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.attrs?.canonicalId === headingId || node.attrs?.["data-canonical-id"] === headingId) {
        blockPosition = pos;
        return false;
      }

      return true;
    });

    if (blockPosition !== null) {
      editor.view.dispatch(editor.state.tr.setSelection(Selection.near(editor.state.doc.resolve(blockPosition + 1), 1)));
      editor.view.focus();
    }
  }

  const compilePdfPreview = useCallback(async () => {
    if (compileState === "compiling" || typeof fetch === "undefined") {
      return;
    }

    setCompileState("compiling");
    setLatestPreviewResult(compiledPreview);
    try {
      const response = await fetch("/api/latex/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ document: documentRef.current }),
      });
      const result = (await response.json()) as LatexCompileResult;
      setLatestPreviewResult(result);
      if (result.status === "compiled" && result.previewImageBase64) {
        setCompiledPreview(result);
      } else if (!compiledPreview) {
        setCompiledPreview(result);
      }
      setPreviewDirty(false);
      setCompileState(result.status === "compiled" ? "compiled" : "failed");
    } catch (error) {
      const failedResult = {
        status: "failed",
        artifactName: `${documentRef.current.id}-preview.pdf`,
        log: error instanceof Error ? error.message : "Failed to compile PDF preview.",
        diagnostics: [
          {
            severity: "error",
            code: "preview-request-failed",
            message: "The browser could not request the PDF preview.",
          },
        ],
      } satisfies LatexCompileResult;
      setLatestPreviewResult(failedResult);
      if (!compiledPreview) {
        setCompiledPreview(failedResult);
      }
      setPreviewDirty(false);
      setCompileState("failed");
    }
  }, [compileState, compiledPreview]);

  async function togglePdfPreview() {
    if (pdfOpen) {
      setPdfOpen(false);
      return;
    }

    setPdfOpen(true);
    setPreviewDirty(true);
    await compilePdfPreview();
  }

  useEffect(() => {
    if (!pdfOpen || !previewDirty || compileState !== "idle") {
      return;
    }

    const compileAfterEdit = window.setTimeout(() => {
      void compilePdfPreview();
    }, 450);

    return () => window.clearTimeout(compileAfterEdit);
  }, [compilePdfPreview, compileState, pdfOpen, previewDirty]);

  useEffect(() => {
    if (!pdfPreviewPanning) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      const viewport = pdfPreviewViewportRef.current;
      const panState = pdfPreviewPanStateRef.current;
      if (!viewport || !panState) {
        return;
      }

      viewport.scrollLeft = panState.startScrollLeft - (event.clientX - panState.startClientX);
      viewport.scrollTop = panState.startScrollTop - (event.clientY - panState.startClientY);
    }

    function handlePointerUp() {
      pdfPreviewPanStateRef.current = null;
      setPdfPreviewPanning(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [pdfPreviewPanning]);

  function adjustPreviewScale(direction: -1 | 1) {
    setPreviewScale((currentScale) => Math.max(50, Math.min(200, currentScale + direction * 10)));
  }

  function beginPdfPreviewPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (!hasRenderedPdfPreview || event.button !== 0) {
      return;
    }

    const viewport = pdfPreviewViewportRef.current;
    if (!viewport) {
      return;
    }

    event.preventDefault();
    pdfPreviewPanStateRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startScrollLeft: viewport.scrollLeft,
      startScrollTop: viewport.scrollTop,
    };
    setPdfPreviewPanning(true);
  }

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
              <input aria-label="Document title" name="document-title" value={document.title} readOnly />
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
              name="menu-search"
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
            onClick={() => {
              if (workflowPanel === "find") {
                closeFindDialog();
              } else {
                setWorkflowPanel("find");
              }
            }}
          >
            <Replace size={16} />
          </button>
          <button
            type="button"
            className="ik-doc-icon"
            aria-label="Undo"
            disabled={!canUndoHistory}
            onClick={undoHistory}
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className="ik-doc-icon"
            aria-label="Redo"
            disabled={!canRedoHistory}
            onClick={redoHistory}
          >
            <Redo2 size={16} />
          </button>
          <button
            type="button"
            className="ik-doc-panel-button"
            aria-label="Version history"
            aria-pressed={workflowPanel === "history"}
            onClick={() => setWorkflowPanel((panel) => panel === "history" ? null : "history")}
          >
            <FileText size={16} />
            History
          </button>
          <button type="button" className="ik-doc-icon" aria-label="Print">
            <Printer size={16} />
          </button>
          <button
            type="button"
            className="ik-doc-icon"
            aria-label="Spelling and grammar check"
            aria-pressed={workflowPanel === "spellcheck"}
            onClick={() => setWorkflowPanel((panel) => panel === "spellcheck" ? null : "spellcheck")}
          >
            <SpellCheck size={16} />
          </button>
          <button
            type="button"
            className="ik-doc-icon"
            aria-label="Document statistics"
            aria-pressed={statisticsOpen}
            onClick={() => openLeftPanel("statistics")}
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
          <label className="ik-doc-select-control">
            <select
              aria-label="Document class"
              name="document-class"
              value={currentDocumentClassOption.value}
              onChange={(event) => changeDocumentClass(event.target.value)}
            >
              {pdfPreviewableLyxDocumentClassesByCategory.map((group) => (
                <optgroup key={group.category} label={group.category}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
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
            aria-pressed={pasteOpen}
            onClick={() => openLeftPanel("paste")}
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
          <button
            className="ik-doc-panel-button"
            type="button"
            aria-label="Editing mode"
            aria-pressed={editingModeActive}
            onClick={exitAuxiliaryModes}
          >
            Editing
          </button>
          <button className="ik-doc-panel-button" type="button" aria-pressed={reviewOpen} onClick={toggleReviewPanel}>
            <PanelLeftOpen size={16} />
            Review
          </button>
          <button className="ik-doc-panel-button" type="button" aria-pressed={pdfOpen} onClick={togglePdfPreview}>
            <FileCode2 size={16} />
            PDF preview
          </button>
          <button
            className="ik-doc-panel-button"
            type="button"
            aria-label="Show source"
            aria-pressed={sourceOpen}
            onClick={() => setSourceOpen((open) => !open)}
          >
            <PanelRightOpen size={16} />
            Show source
          </button>
        </div>
      </header>

      <section
        className={[
          "ik-doc-workspace",
          leftSidebarOpen ? "" : "ik-doc-workspace-left-collapsed",
          reviewOpen ? "ik-doc-workspace-review-open" : "",
          pdfOpen ? "ik-doc-workspace-preview-open" : "",
          sourceOpen ? "ik-doc-workspace-source-open" : "",
        ].join(" ")}
        style={workspaceStyle}
      >
        <aside
          className={`ik-doc-left-stack${leftSidebarOpen ? "" : " ik-doc-left-stack-collapsed"}`}
          aria-label="Left workspace"
        >
          <nav className="ik-left-rail" aria-label="Left workspace panels">
            <button
              className="ik-left-rail-button"
              type="button"
              aria-label={leftSidebarOpen ? "Collapse left sidebar" : "Expand left sidebar"}
              aria-expanded={leftSidebarOpen}
              onClick={() => setLeftSidebarOpen((open) => !open)}
            >
              <PanelLeftOpen size={18} />
            </button>
            <button
              className="ik-left-rail-button"
              type="button"
              aria-label="Open document outline"
              aria-pressed={leftSidebarOpen && leftPanel === "outline"}
              onClick={() => openLeftPanel("outline")}
            >
              <List size={18} />
            </button>
            <button
              className="ik-left-rail-button"
              type="button"
              aria-label="Open source review"
              aria-pressed={reviewOpen}
              onClick={() => openLeftPanel("review")}
            >
              <FileText size={18} />
            </button>
            <button
              className="ik-left-rail-button"
              type="button"
              aria-label="Open document statistics"
              aria-pressed={statisticsOpen}
              onClick={() => openLeftPanel("statistics")}
            >
              <BarChart3 size={18} />
            </button>
            <button
              className="ik-left-rail-button"
              type="button"
              aria-label="Open paste special"
              aria-pressed={pasteOpen}
              onClick={() => openLeftPanel("paste")}
            >
              <ClipboardPaste size={18} />
            </button>
          </nav>

          {leftSidebarOpen ? (
            <div className="ik-left-panel" id="ik-left-sidebar-panel">
              <section className="ik-doc-tabs-rail" aria-label="Document tabs">
                <div className="ik-tabs-topline">
                  <h2>Document tabs</h2>
                  <button type="button" aria-label="Add document tab" onClick={addDocumentTab}>
                    +
                  </button>
                </div>
                <div className="ik-doc-tab-list" role="tablist" aria-label="Document tabs">
                  {documentTabs.map((tab) => (
                    <div className="ik-doc-tab-row" key={tab.id}>
                      <button
                        className="ik-doc-tab-active"
                        type="button"
                        role="tab"
                        aria-selected={activeDocumentTabId === tab.id}
                        onClick={() => selectDocumentTab(tab.id)}
                      >
                        <FileText size={16} />
                        {tab.label}
                      </button>
                      <button
                        className="ik-doc-tab-delete"
                        type="button"
                        aria-label={`Delete ${tab.label}`}
                        disabled={documentTabs.length <= 1}
                        onClick={() => deleteDocumentTab(tab.id)}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {leftPanel === "outline" ? (
                <nav className="ik-doc-outline" aria-label="Document outline">
                  <h3>Outline</h3>
                  {documentOutlineHeadings.length > 0 ? (
                    documentOutlineHeadings.map((heading) => (
                      <button
                        className={`ik-doc-outline-item ik-doc-outline-level-${heading.level}`}
                        key={heading.id}
                        type="button"
                        aria-current={currentOutlineHeadingId === heading.id ? "true" : undefined}
                        onClick={() => focusOutlineHeading(heading.id)}
                      >
                        {heading.title}
                      </button>
                    ))
                  ) : (
                    <p>Headings you add to the document will appear here.</p>
                  )}
                </nav>
              ) : null}

              {reviewOpen ? (
                <aside className="ik-doc-side-panel" aria-label="Source review">
                  <div className="ik-panel-title">
                    <MessageSquare size={18} />
                    Review changes
                  </div>
                  <div className="ik-review-panel">
                    <label>
                      <span>Review author</span>
                      <input
                        aria-label="Review author"
                        name="review-author"
                        value={reviewAuthorName}
                        onChange={(event) => setReviewAuthorName(event.target.value)}
                      />
                    </label>

                    <label>
                      <span>Target block</span>
                      <select
                        aria-label="Review target block"
                        name="review-target-block"
                        value={activeReviewBlockId}
                        onChange={(event) => setReviewBlockId(event.target.value)}
                      >
                        {reviewableBlocks.map((block) => (
                          <option key={block.id} value={block.id}>
                            {truncateReviewLabel(block.label)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <section className="ik-review-composer" aria-label="Track deletion">
                      <h3>Track deletion</h3>
                      <label>
                        <span>Text to delete</span>
                        <input
                          aria-label="Tracked deletion text"
                          name="tracked-deletion-text"
                          value={reviewDeletionText}
                          onChange={(event) => setReviewDeletionText(event.target.value)}
                        />
                      </label>
                      <button className="ik-doc-action-button" type="button" onClick={applyTrackedDeletion}>
                        Track deletion
                      </button>
                    </section>

                    <section className="ik-review-composer" aria-label="Track insertion">
                      <h3>Track insertion</h3>
                      <label>
                        <span>Insert after</span>
                        <input
                          aria-label="Tracked insertion anchor"
                          name="tracked-insertion-anchor"
                          value={reviewInsertAfterText}
                          onChange={(event) => setReviewInsertAfterText(event.target.value)}
                          placeholder="Leave blank to append at the end"
                        />
                      </label>
                      <label>
                        <span>Inserted text</span>
                        <input
                          aria-label="Tracked insertion text"
                          name="tracked-insertion-text"
                          value={reviewInsertionText}
                          onChange={(event) => setReviewInsertionText(event.target.value)}
                        />
                      </label>
                      <button className="ik-doc-action-button" type="button" onClick={applyTrackedInsertion}>
                        Track insertion
                      </button>
                    </section>

                    {reviewStatus ? <p className="ik-workflow-status">{reviewStatus}</p> : null}

                    <section className="ik-review-composer" aria-label="Pending tracked changes">
                      <h3>Pending changes</h3>
                      {trackedChanges.length > 0 ? (
                        <div className="ik-review-change-list">
                          {trackedChanges.map((change) => (
                            <div className="ik-review-change" key={change.id}>
                              <div className="ik-review-change-copy">
                                <strong>{change.kind === "tracked_insert" ? "Insertion" : "Deletion"}</strong>
                                <span>{change.authorName}</span>
                                <p>{change.text}</p>
                              </div>
                              <div className="ik-review-change-actions">
                                <button type="button" className="ik-doc-panel-button" onClick={() => resolveReviewChange(change, "reject")}>
                                  Reject
                                </button>
                                <button type="button" className="ik-doc-action-button" onClick={() => resolveReviewChange(change, "accept")}>
                                  Accept
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No tracked changes yet.</p>
                      )}
                    </section>

                    <section className="ik-review-composer" aria-label="Source regions">
                      <h3>Source regions</h3>
                      {document.blocks.map((block) => (
                        <button className="ik-region" key={block.id} type="button">
                          <span>{block.provenance?.sourceRegionId ?? block.id}</span>
                          <strong>{Math.round((block.provenance?.confidence ?? 0.75) * 100)}%</strong>
                        </button>
                      ))}
                    </section>
                  </div>
                </aside>
              ) : null}

              {statisticsOpen ? (
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

              {pasteOpen ? (
                <aside className="ik-doc-side-panel ik-workflow-panel" aria-label="Paste special">
                  <div className="ik-panel-title">
                    <ClipboardPaste size={18} />
                    Paste special
                  </div>
                  <label>
                    <span>Format</span>
                    <select
                      aria-label="Paste format"
                      name="paste-format"
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
                      name="paste-source"
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
          ) : null}
          {leftSidebarOpen ? (
            <div
              className={`ik-left-sidebar-resizer${leftSidebarResizeState ? " ik-left-sidebar-resizer-active" : ""}`}
              role="separator"
              tabIndex={0}
              aria-label="Resize left sidebar"
              aria-orientation="vertical"
              aria-controls="ik-left-sidebar-panel"
              aria-valuemin={MIN_LEFT_SIDEBAR_WIDTH}
              aria-valuemax={MAX_LEFT_SIDEBAR_WIDTH}
              aria-valuenow={resolvedLeftSidebarWidth}
              onPointerDown={beginLeftSidebarResize}
              onKeyDown={handleLeftSidebarResizeKeyDown}
            />
          ) : null}
        </aside>

        {workflowPanel === "find" ? (
          <section className="ik-find-dialog" role="dialog" aria-label="Find and replace">
            <div className="ik-find-dialog-title">
              <Replace size={16} />
              Find and replace
            </div>
            <label>
              <span>Find</span>
              <input
                ref={findInputRef}
                type="search"
                aria-label="Find text"
                name="find-text"
                value={findText}
                onChange={(event) => {
                  setFindText(event.target.value);
                  setReplacementCount(null);
                  setFindCursor(-1);
                  setFindStatus(null);
                  updateFindHighlights(editor, [], -1);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    selectFindMatch(event.shiftKey ? "previous" : "next");
                  }
                }}
              />
            </label>
            <div className="ik-find-dialog-find-row">
              <button className="ik-doc-panel-button" type="button" onClick={() => selectFindMatch("previous")}>
                Previous
              </button>
              <button className="ik-doc-action-button" type="button" onClick={() => selectFindMatch("next")}>
                <SearchCheck size={15} />
                Find next
              </button>
              {findStatus ? (
                <span className="ik-find-count" aria-live="polite">
                  {findStatus.total > 0 ? `${findStatus.activeIndex} of ${findStatus.total}` : "No results"}
                </span>
              ) : null}
            </div>
            <div className="ik-find-options">
              <label>
                <input
                  type="checkbox"
                  name="find-match-case"
                  checked={matchCase}
                  onChange={(event) => {
                    setMatchCase(event.target.checked);
                    setFindCursor(-1);
                    setFindStatus(null);
                    setReplacementCount(null);
                    updateFindHighlights(editor, [], -1);
                  }}
                />
                <span>Match case</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  name="find-whole-word"
                  checked={wholeWord}
                  onChange={(event) => {
                    setWholeWord(event.target.checked);
                    setFindCursor(-1);
                    setFindStatus(null);
                    setReplacementCount(null);
                    updateFindHighlights(editor, [], -1);
                  }}
                />
                <span>Whole word</span>
              </label>
            </div>
            <label>
              <span>Replace</span>
                <input
                  type="text"
                  aria-label="Replace with"
                  name="replace-text"
                  value={replaceText}
                  onChange={(event) => setReplaceText(event.target.value)}
                />
            </label>
            <div className="ik-find-dialog-actions">
              <button className="ik-doc-panel-button" type="button" onClick={closeFindDialog}>
                Close
              </button>
              <button className="ik-doc-panel-button" type="button" onClick={replaceCurrentMatch}>
                Replace
              </button>
              <button className="ik-doc-action-button" type="button" onClick={replaceAllMatches}>
                Replace all
              </button>
            </div>
            {replacementCount !== null ? (
              <p className="ik-workflow-status" aria-live="polite">
                {replacementCount} {replacementCount === 1 ? "replacement" : "replacements"}
              </p>
            ) : null}
          </section>
        ) : null}

        {workflowPanel === "history" ? (
          <section className="ik-history-dialog" role="dialog" aria-label="Version history">
            <div className="ik-history-header">
              <div className="ik-find-dialog-title">
                <Undo2 size={16} />
                Version history
              </div>
              <p className="ik-history-subtitle">
                Restore recent workspace states, jump back to a known-good version, or step through your edit trail.
              </p>
            </div>
            <div className="ik-history-summary" aria-label="Version history summary">
              <article className="ik-history-summary-card">
                <span>Current version</span>
                <strong>{currentHistoryEntry?.label ?? "Opened document"}</strong>
                <small>{historyIndex + 1} of {historyEntries.length} versions</small>
              </article>
              <article className="ik-history-summary-card">
                <span>Available restores</span>
                <strong>{Math.max(historyEntries.length - 1, 0)}</strong>
                <small>{canUndoHistory ? "Undo is ready" : "No earlier versions yet"}</small>
              </article>
            </div>
            <div className="ik-history-actions">
              <button
                className="ik-doc-panel-button"
                type="button"
                aria-label="Undo last change"
                disabled={!canUndoHistory}
                onClick={undoHistory}
              >
                Undo
              </button>
              <button
                className="ik-doc-panel-button"
                type="button"
                aria-label="Redo last change"
                disabled={!canRedoHistory}
                onClick={redoHistory}
              >
                Redo
              </button>
            </div>
            <div className="ik-history-section-label">
              <span>Timeline</span>
              <span>{historyEntries.length} saved states</span>
            </div>
            <div className="ik-history-list" role="list" aria-label="Version history entries">
              {historyTimeline.map((entry) => (
                <button
                  key={entry.id}
                  className="ik-history-entry"
                  type="button"
                  aria-label={entry.label}
                  aria-current={entry.index === historyIndex ? "true" : undefined}
                  onClick={() => restoreHistoryEntry(entry.index)}
                >
                  <span className="ik-history-entry-sequence">V{entry.index + 1}</span>
                  <span className="ik-history-entry-copy">
                    <strong>{entry.label}</strong>
                    <span>{entry.index === historyIndex ? "Current version" : "Restore this version"}</span>
                  </span>
                  <span className="ik-history-entry-meta">
                    {entry.index === historyIndex ? "Current" : "Restore"}
                  </span>
                </button>
              ))}
            </div>
            <div className="ik-find-dialog-actions">
              <button className="ik-doc-panel-button" type="button" onClick={() => setWorkflowPanel(null)}>
                Close
              </button>
            </div>
          </section>
        ) : null}

        {workflowPanel === "spellcheck" ? (
          <section className="ik-spellcheck-dialog" role="dialog" aria-label="Spelling and grammar check">
            <div className="ik-find-dialog-title">
              <SpellCheck size={16} />
              Spelling and grammar check
            </div>
            <p className="ik-spellcheck-provider">
              Providers: IK spellcheck and IK thesaurus
            </p>
            <section className="ik-spellcheck-section" aria-label="Spelling suggestions">
              <h3>Spelling suggestions</h3>
              {spellingIssues.length > 0 ? (
                <div className="ik-spellcheck-issue-list">
                  {spellingIssues.map((issue) => (
                    <article className="ik-spellcheck-issue" key={issue.word}>
                      <div>
                        <strong>{issue.word}</strong>
                        <p>{issue.context}</p>
                        <span>{issue.occurrences} match{issue.occurrences === 1 ? "" : "es"}</span>
                      </div>
                      <button
                        className="ik-doc-action-button"
                        type="button"
                        onClick={() => applySpellingIssue(issue)}
                      >
                        Replace all with {issue.suggestion}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="ik-workflow-status">No spelling suggestions.</p>
              )}
            </section>
            <section className="ik-spellcheck-section" aria-label="Thesaurus lookup">
              <label>
                <span>Lookup word</span>
                <input
                  type="text"
                  aria-label="Thesaurus lookup"
                  value={thesaurusQuery}
                  onChange={(event) => setThesaurusQuery(event.target.value)}
                />
              </label>
              {thesaurusQuery.trim().length > 0 ? (
                thesaurusSuggestions.length > 0 ? (
                  <div className="ik-thesaurus-list" role="list" aria-label="Thesaurus suggestions">
                    {thesaurusSuggestions.map((suggestion) => (
                      <span className="ik-thesaurus-chip" key={suggestion} role="listitem">
                        {suggestion}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="ik-workflow-status">No thesaurus suggestions.</p>
                )
              ) : (
                <p className="ik-workflow-status">Enter a word to see synonym suggestions.</p>
              )}
            </section>
            <div className="ik-find-dialog-actions">
              <button className="ik-doc-panel-button" type="button" onClick={() => setWorkflowPanel(null)}>
                Close
              </button>
            </div>
          </section>
        ) : null}

        {spellcheckMenu ? (
          <section
            className="ik-spellcheck-context-menu"
            role="menu"
            aria-label="Spelling suggestions"
            style={{ top: spellcheckMenu.top, left: spellcheckMenu.left }}
          >
            <p className="ik-spellcheck-context-caption">Did you mean:</p>
            <button
              className="ik-spellcheck-context-action"
              type="button"
              role="menuitem"
              aria-label={`${spellcheckMenu.replacementText}, spelling suggestion`}
              onMouseDown={handleSpellcheckMenuMouseDown}
              onClick={applySpellcheckContextSuggestion}
            >
              <span className="ik-spellcheck-context-label">{spellcheckMenu.replacementText}</span>
            </button>
            <div className="ik-spellcheck-context-separator" role="separator" />
            <button
              className="ik-spellcheck-context-action"
              type="button"
              role="menuitem"
              onMouseDown={handleSpellcheckMenuMouseDown}
              onClick={() => ignoreAllSpellingIssues(spellcheckMenu.word)}
            >
              <span className="ik-spellcheck-context-label">Ignore all</span>
            </button>
            <button
              className="ik-spellcheck-context-action"
              type="button"
              role="menuitem"
              onMouseDown={handleSpellcheckMenuMouseDown}
              onClick={() => enableAlwaysCorrect(spellcheckMenu.word, spellcheckMenu.suggestion)}
            >
              <span className="ik-spellcheck-context-label">
                Always correct to &quot;{spellcheckMenu.replacementText}&quot;
              </span>
            </button>
            <button
              className="ik-spellcheck-context-action"
              type="button"
              role="menuitem"
              onMouseDown={handleSpellcheckMenuMouseDown}
              onClick={() => addWordToPersonalDictionary(spellcheckMenu.word)}
            >
              <span className="ik-spellcheck-context-label">Add to personal dictionary</span>
            </button>
            <div className="ik-spellcheck-context-separator" role="separator" />
            <button
              className="ik-spellcheck-context-action"
              type="button"
              role="menuitem"
              aria-label="Spelling and grammar check Ctrl+Alt+X"
              onMouseDown={handleSpellcheckMenuMouseDown}
              onClick={() => {
                setSpellcheckMenu(null);
                setWorkflowPanel("spellcheck");
              }}
            >
              <span className="ik-spellcheck-context-label">Spelling and grammar check</span>
              <span className="ik-spellcheck-context-shortcut">Ctrl+Alt+X</span>
            </button>
          </section>
        ) : null}

        <section className="ik-doc-canvas" aria-label="Document editor">
          <div className="ik-doc-page-frame">
            <div className="ik-doc-vertical-ruler" aria-label="Vertical ruler" style={pageLayoutStyle}>
              <div className="ik-doc-vertical-ruler-track">
                <div
                  className="ik-doc-vertical-ruler-margin-zone"
                  style={{ height: `${pageLayoutMetrics.topMarginPx}px` }}
                />
                {verticalRulerDivisions.map((division) => (
                  division.kind === "number" ? (
                      <span
                        key={`vertical-number-${division.top}`}
                        className={`ik-doc-vertical-ruler-number${division.label === "0" ? " ik-doc-vertical-ruler-number-origin" : ""}`}
                        style={{ top: `${division.top}px` }}
                      >
                        {division.label}
                    </span>
                  ) : (
                    <span
                      key={`vertical-${division.kind}-${division.top}`}
                      className={`ik-doc-vertical-ruler-division ik-doc-vertical-ruler-division-${division.kind}`}
                      style={{ top: `${division.top}px` }}
                    />
                  )
                ))}
                <button
                  className="ik-doc-ruler-handle ik-doc-ruler-handle-vertical"
                  type="button"
                  aria-label="Adjust top document margin"
                  style={{ top: `${pageLayoutMetrics.topMarginPx}px` }}
                  onPointerDown={(event) => beginRulerDrag(event, "top", pageLayoutMetrics.topMarginPx)}
                >
                  <span aria-hidden="true" />
                </button>
              </div>
            </div>
            <div
              className="ik-doc-page-stack"
              style={pageLayoutStyle}
              data-document-class={document.settings.documentClass}
              data-document-behavior={currentDocumentClassBehavior}
            >
              <div className="ik-doc-ruler" aria-label="Document ruler">
                <div className="ik-doc-ruler-track">
                  <div
                    className="ik-doc-ruler-margin-zone ik-doc-ruler-margin-zone-left"
                    style={{ width: `${pageLayoutMetrics.leftMarginPx}px` }}
                  />
                  <div
                    className="ik-doc-ruler-margin-zone ik-doc-ruler-margin-zone-right"
                    style={{ width: `${pageLayoutMetrics.rightMarginPx}px` }}
                  />
                  {horizontalRulerDivisions.map((division) => (
                    division.kind === "number" ? (
                      <span
                        key={`number-${division.left}`}
                        className={`ik-doc-ruler-number${division.label === "0" ? " ik-doc-ruler-number-origin" : ""}`}
                        style={{ left: `${division.left}px` }}
                      >
                        {division.label}
                      </span>
                    ) : (
                      <span
                        key={`${division.kind}-${division.left}`}
                        className={`ik-doc-ruler-division ik-doc-ruler-division-${division.kind}`}
                        style={{ left: `${division.left}px` }}
                      />
                    )
                  ))}
                  <button
                    className="ik-doc-ruler-handle ik-doc-ruler-handle-left"
                    type="button"
                    aria-label="Adjust left document margin"
                    style={{ left: `${pageLayoutMetrics.leftMarginPx}px` }}
                    onPointerDown={(event) => beginRulerDrag(event, "left", pageLayoutMetrics.leftMarginPx)}
                  >
                    <span aria-hidden="true" />
                  </button>
                  <button
                    className="ik-doc-ruler-handle ik-doc-ruler-handle-right"
                    type="button"
                    aria-label="Adjust right document margin"
                    style={{ left: `${pageLayoutMetrics.widthPx - pageLayoutMetrics.rightMarginPx}px` }}
                    onPointerDown={(event) => beginRulerDrag(event, "right", pageLayoutMetrics.rightMarginPx)}
                  >
                    <span aria-hidden="true" />
                  </button>
                </div>
              </div>
              {usingTexDerivedEditorSurface ? (
                <TexPageBoxEditorSurface
                  editorContent={liveEditorContent}
                  pageBoxes={texEditorPageBoxes}
                />
              ) : liveEditorContent}
            </div>
          </div>
        </section>

        {pdfOpen ? (
          <aside className="ik-doc-side-panel ik-doc-pdf-panel" aria-label="PDF preview" style={pageLayoutStyle}>
            {hasRenderedPdfPreview ? (
              <div
                ref={pdfPreviewViewportRef}
                className={`ik-pdf-page-scroll${pdfPreviewPanning ? " ik-pdf-page-scroll-panning" : ""}`}
                onPointerDown={beginPdfPreviewPan}
              >
                {compileState === "compiling" ? (
                  <div className="ik-pdf-refresh-chip" aria-live="polite">
                    Refreshing preview
                  </div>
                ) : null}
                <div
                  className="ik-pdf-page-stage"
                  style={{ width: `${scaledPreviewWidth}px`, height: `${scaledPreviewHeight}px` }}
                >
                  {/* The preview is a data URI generated from the compiled PDF, so next/image cannot optimize it. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="ik-pdf-rendered-page"
                    alt="Compiled PDF preview page"
                    src={pdfPreviewImageSrc}
                    style={{
                      width: `${pageLayoutMetrics.widthPx}px`,
                      height: `${pageLayoutMetrics.heightPx}px`,
                      transform: `scale(${previewImageScale})`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="ik-pdf-placeholder">
                <FileCode2 size={28} />
                <p>{compileState === "compiling" ? "Compiling PDF preview" : "Compile PDF preview"}</p>
                {compileState === "failed" ? (
                  <>
                    <span>{activePreviewResult?.diagnostics[0]?.message ?? "The selected document class could not be rendered in the PDF preview."}</span>
                    <span>Compilation diagnostics are available below.</span>
                  </>
                ) : null}
              </div>
            )}
            <div className="ik-pdf-preview-footer">
              <div className="ik-pdf-preview-toolbar" aria-label="PDF preview controls">
                <button
                  className="ik-pdf-zoom-button"
                  type="button"
                  aria-label="Zoom out PDF preview"
                  onClick={() => adjustPreviewScale(-1)}
                >
                  -
                </button>
                <span className="ik-pdf-zoom-label" aria-live="polite">
                  {previewScale}%
                </span>
                <button
                  className="ik-pdf-zoom-button"
                  type="button"
                  aria-label="Zoom in PDF preview"
                  onClick={() => adjustPreviewScale(1)}
                >
                  +
                </button>
              </div>
              {activePreviewResult?.status === "compiled" && pdfTextVerification.verified ? (
                <span
                  className="ik-pdf-verification"
                  role="status"
                  aria-label="PDF preview verified"
                  title="PDF preview verified"
                >
                  <CheckCircle2 size={18} />
                </span>
              ) : null}
            </div>
            <p className="ik-diagnostic-count">
              {(activePreviewResult?.diagnostics.length ?? latex.diagnostics.length)} diagnostics
            </p>
            {activePreviewResult?.status === "compiled" && !pdfTextVerification.verified && activePreviewResult.extractedText ? (
              <div className="ik-pdf-verification ik-pdf-verification-warning" aria-label="PDF text verification">
                <span>PDF text differs from editor</span>
              </div>
            ) : activePreviewResult?.status === "failed" ? (
              <div className="ik-pdf-verification ik-pdf-verification-warning" aria-label="PDF text verification">
                <span>Preview refresh failed</span>
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

type EditorTextMatch = {
  from: number;
  to: number;
};

type FindHighlightRange = EditorTextMatch & {
  current: boolean;
};

type SpellcheckRange = EditorTextMatch & {
  word: string;
  suggestion: string;
};

type SearchCharacter = {
  value: string;
  from: number;
  to: number;
};

type FindOptions = {
  matchCase: boolean;
  wholeWord: boolean;
};

function findEditorTextMatches(editor: Editor, query: string, options: FindOptions): EditorTextMatch[] {
  const normalizedQuery = options.matchCase ? query : query.toLocaleLowerCase();
  if (normalizedQuery.length === 0) {
    return [];
  }

  const matches: EditorTextMatch[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isTextblock) {
      return true;
    }

    const characters = textblockSearchCharacters(node, pos);
    const visibleText = characters.map((character) => character.value).join("");
    const haystack = options.matchCase ? visibleText : visibleText.toLocaleLowerCase();
    let searchFrom = 0;
    let index = haystack.indexOf(normalizedQuery, searchFrom);
    while (index >= 0) {
      const endIndex = index + normalizedQuery.length - 1;
      const from = characters[index]?.from;
      const to = characters[endIndex]?.to;
      if (
        typeof from === "number"
        && typeof to === "number"
        && to > from
        && (!options.wholeWord || isWholeWordMatch(characters, index, endIndex))
      ) {
        matches.push({ from, to });
      }

      searchFrom = index + normalizedQuery.length;
      index = haystack.indexOf(normalizedQuery, searchFrom);
    }

    return false;
  });

  return matches;
}

function isWholeWordMatch(characters: SearchCharacter[], startIndex: number, endIndex: number): boolean {
  const previous = characters[startIndex - 1]?.value ?? "";
  const next = characters[endIndex + 1]?.value ?? "";

  return !isWordCharacter(previous) && !isWordCharacter(next);
}

function isWordCharacter(value: string): boolean {
  return /^[\p{L}\p{N}_]$/u.test(value);
}

function updateFindHighlights(editor: Editor | null, matches: EditorTextMatch[], currentIndex: number) {
  if (!editor) {
    return;
  }

  const ranges = matches.map((match, index) => ({
    ...match,
    current: index === currentIndex,
  }));

  editor.view.dispatch(editor.state.tr.setMeta(findHighlightPluginKey, ranges));
}

function findEditorSpellcheckMatches(editor: Editor | null, issues: SpellingIssue[]): SpellcheckRange[] {
  if (!editor) {
    return [];
  }

  return issues.flatMap((issue) => (
    findEditorTextMatches(editor, issue.word, { matchCase: false, wholeWord: true }).map((match) => ({
      ...match,
      word: issue.word,
      suggestion: issue.suggestion,
    }))
  ));
}

function updateSpellcheckHighlights(editor: Editor | null, matches: SpellcheckRange[]) {
  if (!editor) {
    return;
  }

  editor.view.dispatch(editor.state.tr.setMeta(spellcheckHighlightPluginKey, matches));
}

function replaceEditorTextRanges(editor: Editor, matches: EditorTextMatch[], replaceWith: string) {
  const sortedMatches = [...matches].sort((first, second) => second.from - first.from);
  let transaction = editor.state.tr;

  for (const match of sortedMatches) {
    transaction = replaceWith.length > 0
      ? transaction.replaceWith(match.from, match.to, editor.state.schema.text(replaceWith))
      : transaction.delete(match.from, match.to);
  }

  editor.view.dispatch(transaction);
}

function formatSpellcheckReplacement(originalText: string, suggestion: string): string {
  if (originalText.toUpperCase() === originalText) {
    return suggestion.toUpperCase();
  }

  if (originalText[0]?.toUpperCase() === originalText[0] && originalText.slice(1).toLowerCase() === originalText.slice(1)) {
    return `${suggestion[0]?.toUpperCase() ?? ""}${suggestion.slice(1)}`;
  }

  return suggestion;
}

function clampSpellcheckMenuPosition(left: number, top: number): { left: number; top: number } {
  if (typeof window === "undefined") {
    return { left, top };
  }

  const menuWidth = 280;
  const menuHeight = 170;
  const horizontalPadding = 12;
  const verticalPadding = 12;

  return {
    left: Math.min(Math.max(left, horizontalPadding), window.innerWidth - menuWidth - horizontalPadding),
    top: Math.min(Math.max(top, verticalPadding), window.innerHeight - menuHeight - verticalPadding),
  };
}

function inlineTextContent(children: CanonicalInline[]): string {
  return children.map((child) => {
    if (child.type === "text") {
      return child.text;
    }

    if (child.type === "math_inline") {
      return child.tex;
    }

    if (child.type === "citation") {
      return `@${child.key}`;
    }

    if (child.type === "reference") {
      return child.target;
    }

    if (child.type === "footnote" || child.type === "language_span" || child.type === "comment") {
      return inlineTextContent(child.children);
    }

    if (child.type === "tracked_insert" || child.type === "tracked_delete") {
      return child.text;
    }

    return "";
  }).join("").trim();
}

function currentTrackedAuthorName(document: CanonicalDocument): string {
  const changeTracking = document.metadata.changeTracking;
  if (!changeTracking) {
    return "Editor";
  }

  return changeTracking.authors.find((author) => author.id === changeTracking.currentAuthorId)?.name
    ?? changeTracking.authors[0]?.name
    ?? "Editor";
}

function firstReviewableBlockId(document: CanonicalDocument): string {
  return document.blocks.find((block) => "children" in block)?.id ?? "";
}

function truncateReviewLabel(value: string): string {
  return value.length > 52 ? `${value.slice(0, 49)}...` : value;
}

function clampLeftSidebarWidth(width: number): number {
  return Math.min(MAX_LEFT_SIDEBAR_WIDTH, Math.max(MIN_LEFT_SIDEBAR_WIDTH, width));
}

function cloneCanonicalDocument(document: CanonicalDocument): CanonicalDocument {
  return JSON.parse(JSON.stringify(document)) as CanonicalDocument;
}

function snapshotWorkspaceDocument(
  document: CanonicalDocument,
  tabs: DocumentTab[],
  activeDocumentTabId: string,
): CanonicalDocument {
  return JSON.parse(JSON.stringify(documentWithWorkspaceTabs(document, tabs, activeDocumentTabId))) as CanonicalDocument;
}

function humanizePasteFormat(format: PasteSpecialFormat): string {
  if (format === "plain-text") {
    return "plain text";
  }

  if (format === "html") {
    return "HTML";
  }

  return "LaTeX";
}

function restoreDocumentTabs(document: CanonicalDocument): {
  activeDocumentTabId: string;
  tabs: DocumentTab[];
} {
  const workspace = document.metadata.workspace;
  if (workspace && workspace.documentTabs.length > 0) {
    const activeDocumentTabId = workspace.documentTabs.some((tab) => tab.id === workspace.activeDocumentTabId)
      ? workspace.activeDocumentTabId
      : workspace.documentTabs[0].id;

    return {
      activeDocumentTabId,
      tabs: workspace.documentTabs.map((tab) => ({
        id: tab.id,
        label: tab.label,
        blocks: tab.blocks,
      })),
    };
  }

  return {
    activeDocumentTabId: "tab-1",
    tabs: [{
      id: "tab-1",
      label: "Tab 1",
      blocks: document.blocks,
    }],
  };
}

function activateWorkspaceDocument(document: CanonicalDocument): CanonicalDocument {
  const { activeDocumentTabId, tabs } = restoreDocumentTabs(document);
  const activeTab = tabs.find((tab) => tab.id === activeDocumentTabId);
  const supportedDocumentClass = coerceLyxDocumentClassToPdfPreviewable(document.settings.documentClass);
  const normalizedDocument = {
    ...document,
    settings: {
      ...document.settings,
      documentClass: supportedDocumentClass.value,
      template: supportedDocumentClass.template,
      templateFamily: supportedDocumentClass.templateFamily,
    },
  };

  if (!activeTab) {
    return normalizedDocument;
  }

  return {
    ...normalizedDocument,
    blocks: activeTab.blocks,
    metadata: {
      ...normalizedDocument.metadata,
      workspace: {
        activeDocumentTabId,
        documentTabs: tabs,
      },
    },
  };
}

function documentWithWorkspaceTabs(
  document: CanonicalDocument,
  tabs: DocumentTab[],
  activeDocumentTabId: string,
): CanonicalDocument {
  const documentTabs = tabs.map((tab) => ({
    ...tab,
    blocks: tab.id === activeDocumentTabId ? document.blocks : tab.blocks,
  }));
  const activeTab = documentTabs.find((tab) => tab.id === activeDocumentTabId) ?? documentTabs[0];
  if (!activeTab) {
    return document;
  }

  return {
    ...document,
    blocks: activeTab.blocks,
    metadata: {
      ...document.metadata,
      workspace: {
        activeDocumentTabId: activeTab.id,
        documentTabs,
      },
    },
  };
}

function createEmptyTabBlocks(tabNumber: number): CanonicalDocument["blocks"] {
  return [
    {
      id: `tab-${tabNumber}-title`,
      type: "heading",
      level: 1,
      children: [{ type: "text", text: `Untitled tab ${tabNumber}` }],
      reviewState: "needs_review",
    },
    {
      id: `tab-${tabNumber}-body`,
      type: "paragraph",
      children: [],
      reviewState: "needs_review",
    },
  ];
}

function findCanonicalElement(canonicalId: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>("[data-canonical-id], [canonicalid]");

  return Array.from(candidates).find((candidate) => (
    candidate.getAttribute("data-canonical-id") === canonicalId
    || candidate.getAttribute("canonicalid") === canonicalId
  )) ?? null;
}

function textblockSearchCharacters(node: ProseMirrorNode, blockPosition: number): SearchCharacter[] {
  const characters: SearchCharacter[] = [];
  node.content.forEach((child, offset) => {
    const from = blockPosition + 1 + offset;
    if (child.isText && child.text) {
      for (let index = 0; index < child.text.length; index += 1) {
        characters.push({
          value: child.text[index],
          from: from + index,
          to: from + index + 1,
        });
      }
      return;
    }

    const leafText = typeof child.attrs?.tex === "string"
      ? child.attrs.tex
      : typeof child.attrs?.text === "string"
        ? child.attrs.text
        : child.textContent;
    for (const value of leafText) {
      characters.push({
        value,
        from,
        to: from + child.nodeSize,
      });
    }
  });

  return characters;
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
