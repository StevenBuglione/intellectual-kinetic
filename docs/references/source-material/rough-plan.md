# Complete Plan: AI-Assisted PDF-to-LaTeX Restoration Workbench

## 1. Product Goal

Build a **local-first desktop/web application** that takes a PDF or scanned book and converts it into a clean, editable, LaTeX-backed document using:

```text
Original PDF/page image review
+ OCR/layout extraction
+ LLM correction and reasoning
+ image restoration
+ Tiptap-based modern editor
+ LyX-inspired semantic document controls
+ deterministic LaTeX generation
+ compiled PDF preview
```

The application should feel like:

```text
ABBYY FineReader side-by-side review
+ Google Docs-style editing
+ LyX-style structured LaTeX control
+ AI-powered OCR/layout/image restoration
```

The main purpose is to go beyond traditional OCR by preserving multiple evidence layers per page and allowing both AI agents and the user to produce a highly accurate final LaTeX/PDF document.

---

# 2. Core Product Concept

The main editing screen should have:

```text
┌───────────────────────────────┬────────────────────────────────┐
│ Original PDF/Page View         │ Tiptap Editor View              │
│                               │                                │
│ - Original rendered page       │ - Editable text blocks          │
│ - Bounding boxes               │ - Headings                      │
│ - OCR regions                  │ - Paragraphs                    │
│ - Image regions                │ - Figures/captions              │
│ - AI confidence highlights     │ - Footnotes                     │
│                               │ - Tables                        │
│                               │ - LaTeX-aware semantic blocks   │
├───────────────────────────────┴────────────────────────────────┤
│ Layers / OCR candidates / AI suggestions / LaTeX preview         │
└────────────────────────────────────────────────────────────────┘
```

The left side shows the original page.

The right side shows the editable reconstructed document.

Clicking a region on the left highlights the corresponding editable block on the right.

Clicking a block on the right highlights the source region on the left.

The user can edit text manually, accept AI corrections, regenerate a section, restore an image, or inspect the LaTeX output.

---

# 3. Main Design Principle

The system should not treat OCR text as the final truth.

Instead, each page should have multiple layers:

```text
Original image
Cleaned image
Layout boxes
OCR candidates
Vision model transcription
LLM-corrected text
Semantic document structure
Tiptap editable blocks
LaTeX serialization
Compiled PDF preview
User-approved final layer
```

The final LaTeX should be generated from a **canonical semantic document model**, not directly from raw OCR or free-form LLM output.

The LLM should suggest corrections and structure.

The deterministic serializer should generate the actual LaTeX.

---

# 4. Role of Tiptap

Tiptap is the main modern editing UI.

It should provide the in-app Google Docs-like editing experience.

Tiptap should support:

```text
Rich text editing
Headings
Paragraphs
Tables
Images
Captions
Footnotes
Comments
AI suggestions
Custom OCR-region blocks
Page breaks
Raw LaTeX blocks
Semantic document nodes
```

Tiptap should not be treated as the permanent document truth.

It is the visual editing layer over the internal canonical document model.

The flow should be:

```text
Tiptap Editor UI
→ Tiptap JSON
→ Canonical Document AST
→ LaTeX serializer
→ PDF compiler
```

---

# 5. Role of LyX

LyX should not be embedded directly as the main editor.

Instead, LyX should serve as the **capability blueprint**.

The rule is:

```text
If LyX exposes a LaTeX capability as a user-editable document feature,
our app should eventually support that capability as a first-class structured feature.
```

LyX gives us the mature model for visual LaTeX document authoring.

Our app should copy the idea of structured semantic editing:

```text
User chooses “section,” “caption,” “footnote,” “figure,” “reference,” etc.
The system generates the correct LaTeX.
```

LyX can also be used as an optional external advanced review/export companion.

The main pipeline should be:

```text
Tiptap → Canonical AST → LaTeX → PDF
```

Not:

```text
Tiptap → LyX → LaTeX → PDF
```

LyX is a reference model and optional external tool, not the core runtime engine.

---

# 6. Canonical Document Model

The application should have its own internal document model.

This model should be independent of Tiptap and LaTeX.

It should represent the real document structure.

```text
Project
  Document
    FrontMatter
    Chapter[]
    Page[]
    Section[]
    Block[]
    Asset[]
    EvidenceLayer[]
    ExportSettings
```

The canonical AST should include:

```text
document class
paper size
margins
font settings
headers/footers
page numbering
chapters
sections
paragraphs
figures
captions
footnotes
tables
labels
references
citations
index entries
raw LaTeX
OCR evidence
layout regions
AI suggestions
user approvals
```

Tiptap is a UI representation of this model.

LaTeX is an export/render representation of this model.

---

# 7. Page-Layer Model

Each imported PDF page should become a structured object with layered evidence.

Example:

```text
Page 001
  Layer 0: Original rendered page image
  Layer 1: Cleaned/restored page image
  Layer 2: Layout detection boxes
  Layer 3: OCR text candidates
  Layer 4: Vision LLM transcription
  Layer 5: LLM-corrected text
  Layer 6: Semantic structure classification
  Layer 7: Tiptap editable blocks
  Layer 8: LaTeX mapping
  Layer 9: Compiled PDF preview
  Layer 10: User-approved final content
```

Each region should preserve:

```text
region ID
page number
bounding box
region type
reading order
source image crop
OCR candidate texts
LLM correction
confidence score
linked Tiptap block
linked LaTeX output
review status
```

Example region object:

```json
{
  "region_id": "page-001-region-004",
  "page": 1,
  "bbox": [112, 421, 815, 612],
  "type": "paragraph",
  "reading_order": 4,
  "candidates": [
    {
      "source": "surya_ocr",
      "text": "The calendar of saints begins...",
      "confidence": 0.91
    },
    {
      "source": "tesseract",
      "text": "The caiendar of saints begins...",
      "confidence": 0.82
    },
    {
      "source": "vision_llm",
      "text": "The calendar of saints begins...",
      "confidence": 0.95
    }
  ],
  "approved_text": "The calendar of saints begins...",
  "status": "approved"
}
```

---

# 8. Ingest Pipeline

When the user imports a PDF, the app should run this pipeline:

```text
1. Import PDF
2. Render each page as high-resolution image
3. Run image preprocessing
4. Detect layout regions
5. Crop each detected region
6. OCR each region
7. Run one or more vision/LLM transcription passes
8. Compare OCR candidates
9. Classify semantic structure
10. Build initial canonical AST
11. Generate initial Tiptap document
12. Generate LaTeX
13. Compile PDF preview
14. Mark uncertain areas for review
```

Recommended render quality:

```text
300 DPI minimum
600 DPI for difficult scans, small text, old books, or decorative pages
```

---

# 9. Layout Detection

The layout engine should identify page regions such as:

```text
title
chapter heading
section heading
paragraph
drop cap
decorative initial
image
caption
footnote
margin note
page number
header
footer
table
border
ornament
rubric text
verse block
prayer block
two-column text
```

The layout model should output bounding boxes, reading order, region type, and confidence.

The layout result should be editable by the user.

The user should be able to:

```text
merge regions
split regions
change region type
reorder regions
delete noise regions
mark handwritten/stamped text as artifact
assign a region to an image/figure/caption
```

---

# 10. OCR Strategy

OCR should be treated as only one source of evidence.

The app should support multiple OCR engines and compare their outputs.

Possible OCR/layout engines:

```text
Surya
Tesseract
PaddleOCR
Mistral OCR or other cloud OCR if enabled
Google Document AI if enabled
Vision LLM transcription if enabled
```

Each OCR output should be stored separately.

The system should not overwrite competing readings.

The user and AI agent should be able to inspect alternatives.

The OCR comparison agent should produce:

```text
best candidate text
uncertain words
confidence score
possible corrections
reason for correction
source evidence
```

---

# 11. LLM Strategy

The app should support pluggable LLM providers.

Possible providers:

```text
local OpenAI-compatible endpoint
OpenAI
Anthropic Claude
Google Gemini
Mistral
OpenRouter
custom local models
```

The system should use LLMs for:

```text
OCR correction
layout reasoning
reading order verification
semantic classification
caption detection
footnote reconstruction
table reconstruction
LaTeX mapping suggestions
missing text detection
spell correction
old typography normalization
comparison against original page
quality-control review
```

The LLM should not directly write the final full LaTeX document freely.

Instead:

```text
LLM suggests semantic changes
→ user or verifier approves
→ canonical AST is updated
→ deterministic serializer generates LaTeX
```

This prevents random LaTeX inconsistencies.

---

# 12. Image Restoration Strategy

Text and images should be handled separately.

The system should not rely on AI-generated page images for final body text.

Final text should be real selectable text generated from the canonical document model.

Images should be extracted, cleaned, restored, and placed back as assets.

For each image region, preserve:

```text
original crop
cleaned crop
AI-restored version
mask
crop coordinates
scale
rotation
caption
placement settings
selected final asset
```

The user should be able to:

```text
use original image
use cleaned image
use AI-restored image
mask/remove stamp
remove handwriting
remove stains
restore color
increase contrast
crop tighter
center image
set width
set figure placement
regenerate image
```

Image restoration should apply mainly to:

```text
illustrations
decorative borders
ornaments
icons
drop caps
figures
scanned artwork
```

Not body text.

---

# 13. Tiptap Editor Design

The Tiptap editor should have custom document nodes.

Core nodes:

```text
Document
Chapter
Page
Section
Subsection
Paragraph
QuoteBlock
VerseBlock
PrayerBlock
ImageFigure
Caption
Footnote
MarginNote
Table
PageBreak
ColumnBreak
DropCap
DecorativeInitial
OCRRegion
RawLatexBlock
MathBlock
Comment
AISuggestion
```

Each node should store source provenance.

Example:

```json
{
  "type": "paragraph",
  "attrs": {
    "page": 12,
    "source_region_id": "page-012-region-006",
    "confidence": 0.94,
    "status": "needs_review"
  },
  "content": [
    {
      "type": "text",
      "text": "This is the corrected paragraph text."
    }
  ]
}
```

The editor should support:

```text
inline corrections
AI suggestions
confidence highlights
source-region linking
block-level review status
semantic block conversion
LaTeX preview per block
raw LaTeX escape hatches
```

---

# 14. LyX-Inspired Capability Set

The app should eventually support the same major categories of control that make LyX powerful.

## 14.1 Document Class and Layout

Support:

```text
book
article
report
letter
custom template
prayer book
missal-style page
scanned book reconstruction
```

Document settings should include:

```text
paper size
margins
font family
font size
line spacing
paragraph indentation
headers
footers
page numbering
two-sided layout
chapter numbering
section numbering
table of contents
list of figures
list of tables
```

## 14.2 Semantic Block Styles

Support:

```text
chapter title
section heading
subsection heading
paragraph
quote
verse
prayer
caption
footnote
margin note
table
figure
raw LaTeX
page break
column break
```

The user should choose semantic meaning, not just visual style.

## 14.3 Character Styles

Support:

```text
bold
italic
emphasis
strong
small caps
superscript
subscript
monospace
rubric red text
foreign-language text
Latin text
Greek text
proper-name style
liturgical response style
```

## 14.4 Math

Support:

```text
inline math
display math
numbered equations
equation arrays
matrices
theorem
lemma
definition
proof
custom math macros
```

Browser preview should use KaTeX or MathJax.

LaTeX export should preserve raw math syntax.

## 14.5 Figures and Images

Support:

```text
image source
restored image source
crop box
mask
rotation
scale
width
height
placement
caption
label
wrap mode
subfigure grouping
full-width figure
inline image
decorative image
```

## 14.6 Tables

Support:

```text
basic tables
merged cells
alignment
column widths
caption
label
longtable
booktabs style
OCR table reconstruction
```

## 14.7 Labels and References

Support:

```text
labels
cross-references
page references
figure references
table references
section references
equation references
```

## 14.8 Citations and Bibliography

Support:

```text
BibTeX/BibLaTeX entries
citation insertion
bibliography generation
source metadata
manual source notes
```

## 14.9 Index and Glossary

Support:

```text
index entries
glossary entries
nomenclature entries
```

## 14.10 Raw LaTeX Escape Hatch

Support:

```text
raw LaTeX inline
raw LaTeX block
raw preamble block
custom package includes
custom environment definitions
```

Raw LaTeX blocks should be clearly marked as expert-only.

## 14.11 Notes, Branches, and Review

Support:

```text
user notes
AI notes
reviewer comments
accepted changes
rejected changes
alternative readings
OCR variants
branch/version variants
change history
```

This is especially important for uncertain OCR and LLM corrections.

## 14.12 Flow Control

Support:

```text
page break
clear page
column break
line break
no indent
hard space
soft hyphen
non-breaking space
keep with next
prevent page break here
start new recto page
start new verso page
```

## 14.13 Special Characters and Languages

Support:

```text
ellipsis
em dash
en dash
thin space
non-breaking space
smart quotes
language-specific quotes
ligature control
Latin
Greek
Hebrew
CJK
right-to-left text
```

---

# 15. LaTeX Generation Strategy

LaTeX should be generated deterministically from the canonical AST.

The LLM should not directly write the whole final `.tex` file.

The serializer should map semantic nodes to LaTeX.

Examples:

```text
ChapterTitle → \chapter{...}
SectionHeading → \section{...}
SubsectionHeading → \subsection{...}
Paragraph → escaped paragraph text
Footnote → \footnote{...}
ImageFigure → figure environment
Caption → \caption{...}
PageBreak → \newpage
RawLatexBlock → raw LaTeX passthrough
```

Example figure serialization:

```latex
\begin{figure}[h]
\centering
\includegraphics[width=0.75\textwidth]{assets/page-012-figure-001.png}
\caption{The Annunciation}
\label{fig:annunciation}
\end{figure}
```

The serializer should support templates.

Template examples:

```text
simple article
academic paper
book
scanned book restoration
religious/prayer book
two-column layout
image-heavy facsimile
```

---

# 16. PDF Compilation

The app should compile LaTeX locally.

Primary compiler options:

```text
Tectonic
latexmk
TeX Live
MiKTeX
```

Recommended default:

```text
Tectonic for simple local compilation
latexmk for advanced multi-pass projects
```

The app should capture and display compiler errors.

Compiler errors should map back to document blocks when possible.

Example:

```text
LaTeX error in page 12, paragraph region page-012-region-006
```

The app should provide:

```text
PDF preview
LaTeX source view
compile log
block-to-LaTeX trace
error diagnostics
```

---

# 17. PDF Preview

Use PDF.js inside the app.

The preview should support:

```text
full document preview
single-page preview
side-by-side original vs generated page
visual diff
text selection check
zoom
page navigation
highlight generated block
highlight original source region
```

The verification view should compare:

```text
original page image
generated PDF page
OCR layer
Tiptap content
LaTeX output
```

---

# 18. AI Agent Workflow

Use specialized agents instead of one giant agent.

## 18.1 Layout Agent

Input:

```text
page image
layout boxes
OCR hints
```

Output:

```text
region types
reading order
relationships between blocks
figure-caption links
header/footer detection
artifact detection
```

## 18.2 OCR Comparison Agent

Input:

```text
OCR candidates
vision transcription
source crop
language settings
```

Output:

```text
best text
uncertain words
confidence
alternative readings
correction rationale
```

## 18.3 Semantic Structure Agent

Input:

```text
approved/candidate text
layout regions
page context
neighboring pages
```

Output:

```text
chapter heading
section heading
paragraph
caption
footnote
quote
table
prayer block
verse block
rubric
```

## 18.4 Image Restoration Agent

Input:

```text
source image crop
mask
user instruction
style constraints
```

Output:

```text
restored image asset
restoration notes
quality score
```

## 18.5 LaTeX Mapping Agent

Input:

```text
semantic document blocks
template settings
page layout goals
```

Output:

```text
recommended node attributes
figure placement
page break suggestions
layout warnings
```

The actual LaTeX should still be emitted by the deterministic serializer.

## 18.6 Verification Agent

Input:

```text
original page
generated PDF page
Tiptap document
OCR candidates
LaTeX output
```

Output:

```text
missing text warnings
wrong reading order warnings
bad image placement warnings
caption mismatch warnings
uncertain OCR warnings
overflow warnings
formatting mismatch warnings
```

---

# 19. Human Review Workflow

The user should be able to work page-by-page.

For each page:

```text
1. View original page on the left
2. View editable reconstruction on the right
3. See uncertain regions highlighted
4. Click uncertain text
5. Compare OCR candidates
6. Accept AI suggestion or manually edit
7. Adjust image/figure placement
8. Regenerate LaTeX preview
9. Approve page
```

Review statuses:

```text
unprocessed
processed
needs review
reviewed
approved
exported
```

Region statuses:

```text
low confidence
AI corrected
user edited
approved
ignored
artifact
image-only
raw LaTeX
```

---

# 20. UI Commands

The user should be able to select a region/block and run commands such as:

```text
Retranscribe this region
Compare OCR candidates
Ask LLM to verify text
Fix spelling only
Preserve original spelling
Normalize old spelling
Mark as heading
Mark as paragraph
Mark as caption
Mark as footnote
Mark as table
Mark as image
Mark as artifact
Remove handwriting/stamp
Restore this image
Crop image tighter
Use original image
Use restored image
Insert page break
Insert raw LaTeX
Generate LaTeX for this page
Compare generated page to original
Approve this page
```

---

# 21. Local Technical Stack

## Frontend

```text
Vite
React
Tiptap
PDF.js
Tailwind CSS
shadcn-style components
Zustand or Redux for UI state
TanStack Query for backend communication
```

## Desktop Shell

```text
Tauri preferred
Electron acceptable
```

Tauri is preferred for a lighter local desktop app.

## Backend

Option A:

```text
Python FastAPI
SQLite
filesystem project storage
OCR/layout/image processing in Python
```

Option B:

```text
Node.js/Fastify
SQLite
filesystem project storage
Python worker subprocesses for OCR/layout
```

Recommended:

```text
Python FastAPI backend
React/Tiptap frontend
Tauri desktop shell
```

## Storage

```text
SQLite for project metadata
filesystem for page images, crops, assets, LaTeX, PDFs
JSON files for inspectable layers
```

## OCR/Layout

```text
Surya
Tesseract fallback
PaddleOCR optional
cloud OCR adapters optional
```

## LLM Connectors

```text
OpenAI-compatible local endpoint
OpenAI
Claude
Gemini
Mistral
OpenRouter
custom providers
```

## Image Processing

```text
OpenCV
Pillow
ImageMagick
optional AI image generation/restoration adapters
```

## LaTeX

```text
Tectonic
latexmk
TeX Live/MiKTeX
```

## Preview

```text
PDF.js
image diff tools
text extraction verification
```

---

# 22. Project Folder Structure

Each project should be stored as a normal folder.

Example:

```text
my-book-project/
  project.json
  document.db

  source/
    original.pdf

  pages/
    page-001.png
    page-002.png
    page-003.png

  cleaned/
    page-001.cleaned.png
    page-002.cleaned.png

  crops/
    page-001-region-001.png
    page-001-region-002.png

  layers/
    page-001.layout.json
    page-001.ocr.json
    page-001.vision.json
    page-001.semantic.json
    page-001.review.json

  assets/
    page-001-figure-001.original.png
    page-001-figure-001.cleaned.png
    page-001-figure-001.restored.png

  editor/
    document.tiptap.json
    document.ast.json

  latex/
    main.tex
    preamble.tex
    style.sty
    chapters/
      chapter-001.tex
    images/

  output/
    preview.pdf
    final.pdf

  logs/
    ingest.log
    ocr.log
    latex.log
    verification.log
```

This makes the project:

```text
inspectable
versionable
recoverable
portable
agent-friendly
```

---

# 23. Database Model

SQLite tables:

```text
projects
documents
pages
regions
ocr_candidates
layout_boxes
assets
editor_blocks
semantic_blocks
latex_blocks
ai_suggestions
review_comments
compile_runs
verification_results
settings
```

Important relationships:

```text
page → regions
region → OCR candidates
region → source crop
region → editor block
editor block → semantic block
semantic block → LaTeX block
asset → source region
page → compiled preview
```

---

# 24. Evidence Registry

Every generated/editable item should preserve provenance.

Each final block should know:

```text
which PDF page it came from
which bounding box it came from
which OCR engines contributed
which LLM corrected it
whether user edited it
whether user approved it
which LaTeX block it generated
```

Example:

```json
{
  "block_id": "block-00042",
  "type": "paragraph",
  "approved_text": "The Calendar of Saints begins...",
  "source": {
    "page": 12,
    "region_id": "page-012-region-006",
    "bbox": [120, 300, 820, 430]
  },
  "evidence": {
    "ocr_sources": ["surya", "tesseract"],
    "vision_sources": ["gpt-vision"],
    "user_approved": true
  },
  "latex_id": "latex-block-00042"
}
```

---

# 25. MVP Scope

The first version should be small and functional.

## MVP Features

```text
Import PDF
Render pages
Run layout detection
Run OCR
Show original page left
Show Tiptap editor right
Link regions to editor blocks
Allow manual text correction
Allow block type changes
Support paragraphs/headings/images/captions/footnotes/page breaks
Generate LaTeX
Compile PDF
Show PDF preview
Export .tex and PDF
```

## MVP LyX-Inspired Controls

```text
document class: book/article
paper size
margins
font choice
chapter/section/subsection
paragraph
bold/italic/small caps
figure
caption
footnote
basic table
page break
raw LaTeX block
PDF preview
```

## MVP AI Features

```text
OCR correction
region retranscription
semantic block classification
uncertain word highlighting
basic page verification
```

## MVP Image Features

```text
extract image regions
crop image
clean image
replace image asset
place image in LaTeX
```

---

# 26. Phase 2 Features

Add stronger document restoration capabilities.

```text
multiple OCR engine comparison
vision LLM transcription
AI layout repair
AI reading-order verification
advanced image restoration
side-by-side generated PDF comparison
visual diff
tables with merged cells
labels and references
bibliography support
index entries
comments
change tracking
AI suggestions panel
block-level confidence scores
batch page approval
custom templates
```

---

# 27. Phase 3 Features

Add advanced publishing and LyX-level control.

```text
wrapped figures
subfigures
longtable
booktabs
theorem environments
math macros
glossary
nomenclature
advanced headers/footers
two-sided book layouts
recto/verso control
multilingual text
RTL support
custom LaTeX package manager
preamble editor
template marketplace/local template library
LyX-compatible export investigation
DOCX export
EPUB export
mdBook export
```

---

# 28. Long-Term Goal

The final system should become a full **AI document restoration workbench**.

It should support:

```text
scanned books
religious books
academic PDFs
historical documents
illustrated books
two-column layouts
image-heavy pages
OCR correction
LaTeX reconstruction
human approval
print-quality PDF export
```

The final document should be:

```text
real selectable text
clean images
proper LaTeX structure
exportable source
print-ready PDF
auditable evidence
human-approved
```

---

# 29. Critical Rules

## Rule 1

Do not use AI-generated full-page images as the final document.

Final text must be real selectable text.

## Rule 2

Do not trust one OCR result.

Always preserve multiple evidence candidates.

## Rule 3

Do not let the LLM freely own the final LaTeX.

Use deterministic serializers.

## Rule 4

Use LyX as the capability model.

If LyX supports a structured document control, the system should eventually support it.

## Rule 5

Keep every layer inspectable.

No black-box conversion.

## Rule 6

Make user approval first-class.

The final document should have explicit reviewed/approved state.

## Rule 7

Treat images and text differently.

Text becomes structured editable content.

Images become restored assets.

## Rule 8

Every final block should trace back to the original page region.

---

# 30. Final Architecture Summary

```text
PDF Import
  ↓
Page Rendering
  ↓
Image Preprocessing
  ↓
Layout Detection
  ↓
Region Cropping
  ↓
OCR + Vision Transcription
  ↓
OCR Candidate Comparison
  ↓
LLM Correction
  ↓
Semantic Structure Classification
  ↓
Canonical Document AST
  ↓
Tiptap Editing UI
  ↓
LyX-Inspired Semantic Controls
  ↓
Deterministic LaTeX Serialization
  ↓
Local LaTeX Compilation
  ↓
PDF Preview
  ↓
Human Review and Approval
  ↓
Final PDF + LaTeX Export
```

---

# 31. Final Product Definition

The application is:

```text
A local-first AI-assisted PDF-to-LaTeX restoration workbench
that combines ABBYY-style side-by-side review,
Tiptap-based modern editing,
LyX-inspired semantic LaTeX control,
multi-layer OCR/LLM evidence,
image restoration,
and deterministic LaTeX/PDF export.