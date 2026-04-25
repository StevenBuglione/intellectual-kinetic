# Visual Validation Fixture Matrix

| fixture_family | capability_targets | validation_layers | release_blocking | notes |
| --- | --- | --- | --- | --- |
| document hierarchy fixtures | headings, sections, front matter | editing UX, rendered document, golden-output | yes | Proves structural editing and exported hierarchy survive together. |
| math and theorem fixtures | inline math, display math, theorem-like environments, numbering | editing UX, rendered document, source/debug, golden-output | yes | High-risk parity area requiring both semantic and visual checks. |
| table and float fixtures | tables, captions, figures, labels, references | editing UX, rendered document, golden-output | yes | Must prove structural editing and output fidelity for layout-sensitive content. |
| citation and reference fixtures | citations, labels, cross-references, bibliography surfaces | editing UX, source/debug, golden-output | yes | Must catch broken numbering, unresolved references, and serializer drift. |
| multilingual fixtures | language settings, local overrides, RTL/CJK-sensitive content | rendered document, golden-output | yes | Validates encoding and language-sensitive output paths. |
| source-linking fixtures | source regions, editor blocks, review overlays | editing UX, source/debug | yes | Required for restoration workflow trust and provenance inspection. |
| source-panel fixtures | generated LaTeX panel, diagnostics display | source/debug | no | Secondary UX surface, but still important for debugging and trust. |
| styling fixtures | editor shell, toolbars, chips, panels | editing UX | no | Validates conformance to `docs/references/design/design-system.md`. |
