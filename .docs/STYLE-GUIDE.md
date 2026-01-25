# Challenge Run Collective - Style Guide

This document defines the visual design language and CSS conventions for the Challenge Run Collective website.

---

## 🎨 Color System

### Core Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--accent` | `#3BC36E` | Primary brand color, links, buttons |
| `--bg` | `#0f0f0f` | Page background |
| `--fg` | `#ffffff` | Primary text |
| `--surface` | `#0b0b0b` | Elevated surfaces |
| `--panel` | `rgba(255,255,255,0.04)` | Card backgrounds |

### Text Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--fg` | `#ffffff` | Primary text |
| `--text-muted` | `rgba(255,255,255,0.78)` | Secondary text |
| `--text-dim` | `rgba(255,255,255,0.75)` | Tertiary text |
| `--placeholder` | `rgba(255,255,255,0.6)` | Input placeholders |

### Status Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--status-verified` | `#10b981` | Approved, success |
| `--status-pending` | `#f59e0b` | Waiting, warning |
| `--status-rejected` | `#ef4444` | Denied, error |

### Theme Colors

Users can select their preferred accent color:

| Theme | Accent | CSS Variable |
|-------|--------|--------------|
| Default | Green `#3BC36E` | `[data-theme=""]` |
| Pink | `#E91E8C` | `[data-theme="pink"]` |
| Blue | `#3B82F6` | `[data-theme="blue"]` |
| Purple | `#8B5CF6` | `[data-theme="purple"]` |
| Red | `#EF4444` | `[data-theme="red"]` |

---

## 📐 Spacing Scale

Based on a 4px base unit:

| Token | Value | Pixels |
|-------|-------|--------|
| `--space-1` | `0.35rem` | ~5.6px |
| `--space-2` | `0.5rem` | 8px |
| `--space-3` | `0.75rem` | 12px |
| `--space-4` | `1rem` | 16px |
| `--space-5` | `1.25rem` | 20px |
| `--space-6` | `1.5rem` | 24px |

### Layout Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--gutter` | `1.5rem` | Page side padding |
| `--section-pad-y` | `3rem` | Vertical section padding |
| `--page-max` | `960px` | Maximum content width |

---

## 🔘 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `10px` | Buttons, inputs |
| `--radius-md` | `12px` | Cards, panels |
| `--radius-lg` | `14px` | Large cards |
| `--radius-xl` | `16px` | Hero sections |
| `--radius` | `var(--radius-md)` | Default alias |

---

## 🔤 Typography

### Font Stack

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

### Font Sizes

| Class | Size | Usage |
|-------|------|-------|
| `.text-sm` | `0.875rem` | Small text, captions |
| `.text-base` | `1rem` | Body text |
| `.text-lg` | `1.125rem` | Subheadings |
| `.text-xl` | `1.25rem` | Section titles |

### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `.font-normal` | `400` | Body text |
| `.font-medium` | `500` | Labels, nav |
| `.font-bold` | `700` | Headings, emphasis |

---

## 🧩 Components

### Buttons

```html
<!-- Default -->
<button class="btn">Button</button>

<!-- Primary (accent color) -->
<button class="btn btn--primary">Primary</button>

<!-- Outline -->
<button class="btn btn--outline">Outline</button>

<!-- Ghost (minimal) -->
<button class="btn btn--ghost">Ghost</button>

<!-- Sizes -->
<button class="btn btn--sm">Small</button>
<button class="btn btn--lg">Large</button>
```

### Tags & Pills

```html
<!-- Basic tag -->
<span class="tag">Category</span>

<!-- Interactive tag -->
<button class="tag-chip">Filter</button>
<button class="tag-chip is-active">Active</button>

<!-- Removable filter chip -->
<span class="filter-chip">
  Filter
  <button class="filter-chip__remove">×</button>
</span>

<!-- Status variants -->
<span class="tag tag--verified">Verified</span>
<span class="tag tag--pending">Pending</span>
<span class="tag tag--rejected">Rejected</span>
```

### Cards

```html
<!-- Basic card -->
<div class="card">
  <div class="card-content">Content</div>
</div>

<!-- Game card -->
<a href="#" class="game-card">
  <div class="game-card__image">
    <img src="..." alt="...">
  </div>
  <div class="game-card__body">
    <h3 class="game-card__title">Game Title</h3>
    <span class="game-card__meta">10 runs</span>
  </div>
</a>

<!-- Tier card -->
<a href="#" class="tier-card">
  <h3 class="tier-card__title">Full Runs</h3>
  <p class="tier-card__desc">Complete game runs</p>
  <span class="tier-card__count">25 categories</span>
</a>
```

### Tabs

```html
<div class="tabs-container">
  <div class="tabs">
    <button class="tab active">Tab 1</button>
    <button class="tab">Tab 2</button>
    <button class="tab">Tab 3</button>
  </div>
  <div class="tab-panels">
    <div class="tab-panel active">Panel 1 content</div>
    <div class="tab-panel">Panel 2 content</div>
    <div class="tab-panel">Panel 3 content</div>
  </div>
</div>
```

### Accordion

```html
<div class="accordion">
  <details class="accordion-item">
    <summary class="accordion-header">
      <span class="accordion-title">Section Title</span>
      <span class="accordion-icon">▼</span>
    </summary>
    <div class="accordion-content">
      Content goes here...
    </div>
  </details>
</div>
```

### Forms

```html
<div class="form-group">
  <label class="form-label form-label--required">
    Field Label
  </label>
  <input type="text" class="form-input" placeholder="Enter value">
  <span class="form-hint">Helper text</span>
</div>
```

---

## 📱 Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Mobile | `< 480px` | Compact layouts |
| Small | `< 640px` | Single column |
| Medium | `< 768px` | Table card view |
| Large | `< 900px` | Two column |
| Desktop | `> 900px` | Full layout |

### Responsive Variables

```css
/* Mobile adjustments */
@media (max-width: 640px) {
  :root {
    --gutter: 1rem;
    --section-pad-y: 2rem;
  }
}

@media (max-width: 480px) {
  :root {
    --gutter: 0.75rem;
    --section-pad-y: 1.5rem;
  }
}
```

---

## ♿ Accessibility

### Focus States

All interactive elements have visible focus states:

```css
:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}
```

### Touch Targets

Minimum touch target size: `36px` (`--tap`)

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### High Contrast

```css
@media (prefers-contrast: high) {
  :root {
    --border: rgba(255, 255, 255, 0.3);
    --text-muted: rgba(255, 255, 255, 0.9);
  }
}
```

---

## 📝 Naming Conventions

### BEM Methodology

```css
.block {}
.block__element {}
.block--modifier {}
.block__element--modifier {}
```

### Examples

```css
.card {}                    /* Block */
.card__title {}             /* Element */
.card--featured {}          /* Modifier */
.card__title--large {}      /* Element + Modifier */
```

### State Classes

Prefix with `is-` or `has-`:

```css
.is-active {}
.is-loading {}
.is-visible {}
.has-error {}
```

---

## 🔧 Utility Classes

### Display
`.d-none`, `.d-block`, `.d-flex`, `.d-grid`

### Flexbox
`.flex-wrap`, `.flex-column`, `.items-center`, `.justify-between`

### Spacing
`.m-0`, `.mt-1`, `.mb-2`, `.p-1`, `.p-2`

### Text
`.text-center`, `.text-muted`, `.text-accent`, `.font-bold`, `.truncate`

### Visibility
`.sr-only` (screen reader only)

---

## 📁 File Organization

```
assets/scss/
├── base/           # Foundation (load first)
├── layouts/        # Page structure
├── components/     # UI components
├── pages/          # Page-specific
└── utilities/      # Helpers (load last)
```

Import order matters for proper CSS cascade.
