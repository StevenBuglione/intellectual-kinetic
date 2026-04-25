---
name: Intellectual Kinetic
colors:
  surface: '#101415'
  surface-dim: '#101415'
  surface-bright: '#363a3b'
  surface-container-lowest: '#0b0f10'
  surface-container-low: '#191c1e'
  surface-container: '#1d2022'
  surface-container-high: '#272a2c'
  surface-container-highest: '#323537'
  on-surface: '#e0e3e5'
  on-surface-variant: '#c6c6cd'
  inverse-surface: '#e0e3e5'
  inverse-on-surface: '#2d3133'
  outline: '#909097'
  outline-variant: '#45464d'
  surface-tint: '#bec6e0'
  primary: '#bec6e0'
  on-primary: '#283044'
  primary-container: '#0f172a'
  on-primary-container: '#798098'
  inverse-primary: '#565e74'
  secondary: '#b9c7e0'
  on-secondary: '#233144'
  secondary-container: '#3c4a5e'
  on-secondary-container: '#abb9d2'
  tertiary: '#adc6ff'
  on-tertiary: '#002e6a'
  tertiary-container: '#00163a'
  on-tertiary-container: '#357df1'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#101415'
  on-background: '#e0e3e5'
  surface-variant: '#323537'
typography:
  h1:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.5rem
  sm: 1rem
  md: 1.5rem
  lg: 2.5rem
  xl: 4rem
  gutter: 24px
  max_width: 1280px
---

## Brand & Style

This design system is built on the principles of **Precision Minimalism** and **Corporate Modernism**, now optimized for a high-focus **Dark Mode** environment. It targets high-output professionals who require a tool that feels more like an extension of their intellect than a decorative application. The aesthetic prioritizes clarity, speed, and the reduction of cognitive load.

The interface leverages deep, dark surfaces to create a sense of concentration, ensuring that complex document conversion tasks feel manageable. Visual noise is aggressively eliminated, leaving only high-precision UI elements that communicate intent through subtle tonal shifts and highly approachable, pill-shaped geometry.

## Colors

The palette is anchored in a sophisticated **Deep Slate** (Primary) and **Muted Steel** (Secondary), now rendered in a native dark mode. These shades provide a professional foundation that suggests stability and technical prowess.

- **Primary (#0F172A):** The core background color for the workspace, providing a deep, non-distracting canvas.
- **Secondary (#334155):** Used for component containers, sidebars, and elevated UI elements to provide depth.
- **Neutral (#F8FAFC):** Used for typography and primary icons to ensure high legibility and "pop" against the dark background.
- **Accent (#3B82F6):** A refined Azure used sparingly for interactive highlights, focus states, and the AI processing indicator.

## Typography

This design system utilizes **Inter** for all text levels to ensure maximum legibility and a systematic, utilitarian feel. The hierarchy is established through drastic weight changes rather than decorative font pairings.

Headlines use tight tracking and heavy weights to appear structural, while body copy utilizes generous line-heights to support long-form reading during document review. Labels are kept small and capitalized with increased letter spacing to serve as clear technical signposts without distracting from the main content. Text colors are shifted to light neutrals (#F8FAFC) to ensure accessibility in dark mode.

## Layout & Spacing

The layout follows a **Fixed Grid** model for the core workspace, centering the document processing area to maintain focus. A 12-column system is used with a 24px gutter. 

Spacing is governed by an 8pt rhythm, ensuring vertical consistency. Large margins (4rem+) are used around the main editor and file upload zones to isolate the primary task from navigation and utility bars. Padding within components is generous, balancing the large corner radii.

## Elevation & Depth

In this dark theme, hierarchy is achieved through **Tonal Layers** rather than heavy shadows. The primary surface is the Deep Slate background. Secondary panels (like the editor sidebar or document properties) sit on higher tonal levels (#1E293B) with subtle 1px borders (#334155) to define boundaries.

When elevation is required (e.g., for dropdowns or modals), a deep, diffused ambient shadow is used to suggest height: `0px 10px 15px -3px rgba(0, 0, 0, 0.5)`. This creates a soft lift that feels natural and non-obstructive in a low-light environment.

## Shapes

The shape language is **Pill-shaped**. A 1.0rem (16px) base radius is applied to most UI components to create a soft, approachable, and modern feel. Larger components like the central file upload zone and the main rich text editor container use a 2.0rem (32px) or 3.0rem (48px) radius to emphasize their role as primary interaction points. This generous rounding creates a distinctive "modern tool" aesthetic that contrasts beautifully with the precise typography.

## Components

### File Upload Zone
The upload zone is a large, dashed-border container (#475569) with a 2rem radius. It features a centered icon and a primary action button. Micro-copy below the button specifies supported formats in the `label-md` style.

### Rich Text Editor (TipTap)
The editor is framed in a secondary surface container (#1E293B) with a 1px border and a 1.5rem radius. The toolbar is "sticky" at the top, using subtle icons without labels. Active states for buttons are indicated by a pill-shaped slate background (#334155).

### Action Buttons
- **Primary:** Full pill-shaped buttons using Azure (#3B82F6) with White text for high visibility.
- **Secondary:** Transparent background with a Slate border (#475569) and pill-shaped corners.
- **Ghost:** No background or border; used for utility actions using Neutral (#F8FAFC) text.

### AI Status Chips
Small, fully rounded-pill indicators that use the tertiary blue (#3B82F6) for "Processing" and green (#10B981) for "Converted." These use a low-opacity background of the color with high-contrast text for accessibility.