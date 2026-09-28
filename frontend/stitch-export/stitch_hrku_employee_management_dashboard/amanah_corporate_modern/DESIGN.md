---
name: Amanah Corporate Modern
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0dbed'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fc'
  surface-container-highest: '#d9e3f6'
  on-surface: '#121c2a'
  on-surface-variant: '#434653'
  inverse-surface: '#27313f'
  inverse-on-surface: '#eaf1ff'
  outline: '#737784'
  outline-variant: '#c3c6d5'
  surface-tint: '#2259bf'
  primary: '#094cb2'
  on-primary: '#ffffff'
  primary-container: '#3366cc'
  on-primary-container: '#e7ebff'
  inverse-primary: '#b1c5ff'
  secondary: '#535f71'
  on-secondary: '#ffffff'
  secondary-container: '#d4e0f5'
  on-secondary-container: '#586375'
  tertiary: '#4c535c'
  on-tertiary: '#ffffff'
  tertiary-container: '#656b74'
  on-tertiary-container: '#e6ecf7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b1c5ff'
  on-primary-fixed: '#001946'
  on-primary-fixed-variant: '#00419d'
  secondary-fixed: '#d7e3f8'
  secondary-fixed-dim: '#bbc7dc'
  on-secondary-fixed: '#101c2b'
  on-secondary-fixed-variant: '#3c4858'
  tertiary-fixed: '#dde3ee'
  tertiary-fixed-dim: '#c1c7d1'
  on-tertiary-fixed: '#161c24'
  on-tertiary-fixed-variant: '#414750'
  background: '#f8f9ff'
  on-background: '#121c2a'
  surface-variant: '#d9e3f6'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system embodies a modern, minimalist corporate aesthetic tailored specifically for high-efficiency Indonesian administrative and workforce workflows. It prioritizes clarity, structural order, and psychological safety. 

Key attributes:
- **Tone:** Professional, reliable, structured, and tranquil.
- **Visual Style:** Modern Corporate Minimalism. The interface utilizes structured data density balanced with generous breathing room, crisp white containers against soft tinted canvases, and clear state indicators.
- **Cultural Adaptability:** Optimized for Indonesian administrative terminology (e.g., *Pegawai Tetap*, *PKWT/Kontrak*, *Magang*, *Cuti*, *BPJS*), accommodating localized date conventions, bilingual data density, and currency notations without visual clutter.

## Colors
The palette balances institutional stability with fresh administrative utility.

- **Primary Canvas (`#F5F8FF`):** A cool, low-saturation blue-gray tint serving as the default application canvas, reducing ocular fatigue during extended shifts.
- **Card & Sheet Surfaces (`#FFFFFF`):** Pure stark white to isolate functional contexts and provide stark contrast against the backdrop.
- **Interactive Primary (`#3366CC`):** The primary blue used for focused interactions, primary actions, and navigational anchors.
- **Tonal Tints:**
  - Light tint (`#EAF0FB`): Used for subtle selections, hovered table rows, and secondary backgrounds.
  - Medium tint (`#D6E2F7`): Used for active navigational states, secondary button borders, and selected badges.
- **Text & Neutral Hierarchy:**
  - Primary Dark (`#1F2937`): High-legibility text for labels, table content, and headers.
  - Muted Gray (`#6B7280`): Secondary metadata, placeholder texts, and supporting icons.
  - Border Gray (`#E5E7EB`): Structural dividers, subtle cell borders, and field edges.
- **Status & Employment Tokens:**
  - *Tetap (Permanent):* Background `#ECFDF5` (Emerald-50), Text `#047857` (Emerald-700).
  - *Kontrak (Contract):* Background `#FFFBEB` (Amber-50), Text `#B45309` (Amber-700).
  - *Magang (Intern):* Background `#F1F5F9` (Slate-100), Text `#334155` (Slate-700).

## Typography
The system standardizes entirely on **Inter** to ensure geometric neutrality, reliable tabular figures, and uniform legibility across complex administrative datasets.

- **Tabular Figures:** All numeric displays (salary figures, employee counts, dates, NIK/NPWP numbers) must enforce monospace/tabular numbers (`font-variant-numeric: tabular-nums`) to prevent horizontal jitter during filtering or real-time calculations.
- **Vertical Rhythm:** Fixed line-height multiples ensure dense data grids remain strictly aligned across data columns.
- **Hierarchy:** Primary emphasis is driven by weight (`600` vs `400`) rather than drastic scale shifts, preventing oversized typographic elements on compact screens.

## Layout & Spacing
The layout leverages a fluid 12-column grid system anchored by a fixed 260px administrative sidebar on desktop configurations.

- **Desktop (1024px+):** 12-column grid, 24px (`gutter`) gutters, 32px (`margin`) canvas margin around workspaces. Inner cards utilize `space-lg` (24px) internal padding.
- **Tablet (768px - 1023px):** 8-column layout with collapsing sidebar into a persistent bottom sheet or slide-over drawer; 16px (`gutter-sm`) gutters and 16px margins.
- **Mobile (<768px):** 4-column layout; card padding decreases to `space-md` (16px), preserving usable horizontal width for detailed table rows and inputs.
- **Spacing Rhythm:** Standard spacing scales strictly follow an 8pt/4pt sub-grid. Tight element alignment (labels to inputs) must strictly use `space-xs` (4px) or `space-sm` (8px). Structural section partitions enforce `space-xl` (32px).

## Elevation & Depth
Elevation in this design system avoids heavy shadows, adopting soft ambient depth combined with clean perimeter boundaries.

- **Level 0 (Flat):** Used for baseline tables, flat inner containers, and canvas elements. Outlined with a 1px border of `#E5E7EB`.
- **Level 1 (Surface Cards):** Pure `#FFFFFF` surfaces sitting on `#F5F8FF`. Defined by a 1px border (`#E5E7EB`) coupled with a soft blue-tinted ambient drop shadow: `0 1px 3px 0 rgba(31, 41, 55, 0.04), 0 1px 2px -1px rgba(31, 41, 55, 0.02)`.
- **Level 2 (Hover & Popovers):** Active hover states, interactive table rows, search dropdowns: `0 4px 6px -1px rgba(51, 102, 204, 0.06), 0 2px 4px -2px rgba(31, 41, 55, 0.04)`.
- **Level 3 (Modals & Drawers):** Critical employee detail drawers and dialog overlays: `0 20px 25px -5px rgba(31, 41, 55, 0.08), 0 8px 10px -6px rgba(31, 41, 55, 0.04)`.

## Shapes
The visual geometry sits at the threshold of soft-rounded and professional structural form:
- **Base Surfaces & Cards:** Standardized on `8px` (`rounded-md`) to `12px` (`rounded-lg`) corner radii to maintain a clean, organized appearance.
- **Form Controls:** Text inputs, dropdown selectors, and button groups use `8px` corner radiuses for consistent thumb-reach alignment.
- **Badges & Tags:** Micro status elements utilize full-pill styling (`rounded-full` / `9999px`) or `6px` soft curvature to contrast clearly against rectangular layout grids.

## Components

### Buttons
- **Primary:** Filled `#3366CC` background, white text, 8px radius. Active state darkens slightly; hover introduces a faint primary shadow. Minimum height 40px (desktop), 44px (touch).
- **Secondary:** Surface `#FFFFFF`, border 1px solid `#E5E7EB`, text `#1F2937`. On hover, background transitions to `#EAF0FB` with border `#D6E2F7`.
- **Ghost/Tertiary:** No border, transparent background, text `#3366CC`. Used in table inline actions.

### Employment Status Chips & Badges
- **Dimensions:** Height 24px, horizontal padding 8px, font-size 12px, weight 500, border radius 9999px (pill-shaped).
- **Tetap:** Surface `#ECFDF5`, Text `#047857`, 1px border `#A7F3D0`.
- **Kontrak:** Surface `#FFFBEB`, Text `#B45309`, 1px border `#FDE68A`.
- **Magang:** Surface `#F1F5F9`, Text `#334155`, 1px border `#E2E8F0`.

### Form Fields & Inputs
- **Base Style:** 1px border `#E5E7EB`, surface `#FFFFFF`, text `#1F2937`, border radius 8px, padding 10px 14px.
- **Focus State:** 1px border `#3366CC` combined with a 3px outer glow ring of `rgba(51, 102, 204, 0.15)`.
- **Helper & Error Text:** Set in `body-sm` (12px); errors shift the border to crimson red `#DC2626`.

### Checkboxes & Radio Buttons
- **Unchecked:** 1px solid `#E5E7EB`, pure white center, 4px radius (checkbox) or circular (radio).
- **Checked:** Solid `#3366CC` fill with white checkmark glyph. Focus rings conform to primary focus styles.

### Data Tables
- **Container:** Wrapped in a pure white `#FFFFFF` card with 12px border radius, subtle outer border `#E5E7EB`.
- **Headers:** Background `#F5F8FF` or pure `#FFFFFF`, text `#6B7280`, uppercase tracking, font size 12px, weight 600. Bottom border 1px solid `#E5E7EB`.
- **Rows:** Alternating hover state with `#EAF0FB` at 50% opacity. Clean 1px separator lines between entries. Cell padding 14px 16px.

### Metric / KPI Cards
- **Structure:** Pure white card (`#FFFFFF`), 12px border radius, 20px padding.
- **Layout:** Top row holds metric title in `body-sm` (`#6B7280`) accompanied by a subtle tinted circular icon container (`#EAF0FB` with `#3366CC` icon). Large metric number rendered in `headline-md` (`#1F2937`), with subtext highlighting monthly growth or head-count distribution.