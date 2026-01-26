# SCSS Architecture

> **Current Status:** Incremental migration in progress.
> The site uses `assets/css/style.scss` which imports extracted partials + inline styles.

## Currently Extracted Components

These partials are complete and imported by `style.scss`:

| Partial | Location | Description |
|---------|----------|-------------|
| `_variables.scss` | `base/` | CSS custom properties (colors, spacing, radius) |
| `_themes.scss` | `base/` | Theme color overrides (pink, blue, purple, red) |
| `_footer.scss` | `components/` | Site footer + theme picker |
| `_buttons.scss` | `components/` | Button styles (.btn, .btn--outline) |
| `_tags.scss` | `components/` | Tags, pills, chips (.tag, .tag-chip) |
| `_az-nav.scss` | `components/` | A-Z letter navigation |
| `_results-bar.scss` | `components/` | Results count + reset button |

## Directory Structure

```
assets/scss/
├── base/                 # Foundation styles
│   ├── _variables.scss   # CSS custom properties (design tokens)
│   ├── _themes.scss      # Theme color overrides
│   └── _reset.scss       # Browser reset & defaults
│
├── components/           # Reusable UI components
│   ├── _header.scss      # Site header & navigation
│   ├── _footer.scss      # Site footer & theme picker
│   ├── _buttons.scss     # Button styles & variants
│   ├── _forms.scss       # Inputs, selects, textareas
│   ├── _tags.scss        # Tags, pills, chips (CONSOLIDATED)
│   ├── _cards.scss       # Card components
│   ├── _tabs.scss        # Tab navigation (CONSOLIDATED)
│   ├── _accordion.scss   # Collapsible sections (CONSOLIDATED)
│   ├── _filters.scss     # Filter & search components
│   └── _modals.scss      # Modal dialogs
│
├── layouts/              # Page-level containers
│   └── _containers.scss  # Container, page-width, grids
│
├── pages/                # Page-specific styles
│   ├── _home.scss        # Homepage layout
│   ├── _games.scss       # Games index & detail pages
│   ├── _runs.scss        # Runs tables & filters
│   ├── _runners.scss     # Runner profiles
│   └── _submit.scss      # Submit form
│
├── utilities/            # Helper classes
│   └── _helpers.scss     # Display, spacing, text utilities
│
└── main.scss             # Alternative entry point
```

## How It Works

Jekyll compiles `assets/css/style.scss` which imports all partials. The compiled CSS is output to `_site/assets/css/style.css`.

### Entry Point

The main entry file is `assets/css/style.scss`. It contains Jekyll front matter (`---`) and imports all partials in the correct order:

1. **Base** - Variables, themes, reset (loaded first)
2. **Layouts** - Page structure containers
3. **Components** - Reusable UI blocks
4. **Pages** - Page-specific styles
5. **Utilities** - Helper classes (loaded last for highest specificity)

## Editing Guidelines

### ✅ DO:
- Edit individual partial files (`_filename.scss`)
- Use CSS custom properties from `_variables.scss`
- Group responsive styles with their components
- Add comments for complex sections
- Use BEM-style naming: `.block__element--modifier`

### ❌ DON'T:
- Edit `assets/style.css` directly (it's a reference copy)
- Add styles to the entry file
- Create duplicate styles (check existing files first)
- Use magic numbers (use variables instead)

## CSS Custom Properties

All design tokens are defined in `base/_variables.scss`:

### Colors
```scss
--accent: #3BC36E;         // Primary brand color
--bg: #0f0f0f;             // Page background
--fg: #ffffff;             // Primary text
--border: rgba(255,255,255,0.12);
--panel: rgba(255,255,255,0.04);
```

### Spacing
```scss
--space-1: 0.35rem;        // ~5.6px
--space-2: 0.5rem;         // 8px
--space-3: 0.75rem;        // 12px
--space-4: 1rem;           // 16px (default)
--space-5: 1.25rem;        // 20px
--space-6: 1.5rem;         // 24px
```

### Border Radius
```scss
--radius-sm: 10px;
--radius-md: 12px;
--radius-lg: 14px;
--radius-xl: 16px;
--radius: var(--radius-md); // Default alias
```

### Layout
```scss
--page-max: 960px;         // Max content width
--gutter: 1.5rem;          // Page side padding
--tap: 36px;               // Minimum tap target
```

## Themes

Color themes are defined in `base/_themes.scss`:

```html
<html data-theme="pink">   <!-- Pink accent -->
<html data-theme="blue">   <!-- Blue accent -->
<html data-theme="purple"> <!-- Purple accent -->
<html data-theme="red">    <!-- Red accent -->
```

## Consolidated Components

These files consolidate previously duplicated styles:

- **`_tags.scss`** - All tag, pill, and chip styles
- **`_tabs.scss`** - All tab navigation styles  
- **`_accordion.scss`** - All accordion/collapsible styles

## Adding New Styles

1. Determine the category (component, page, utility)
2. Check if styles already exist in relevant files
3. Add to existing file or create new partial
4. Import in `assets/css/style.scss` if new file
5. Test with Jekyll: `bundle exec jekyll serve`

## Migration Notes

This modular structure replaces the previous monolithic `style.css`. The original file is kept as `assets/style.css` for reference but is not used in production.

**Changes from previous structure:**
- Removed duplicate accordion sections (3 → 1)
- Removed duplicate tab styles (2 → 1)
- Removed duplicate tag styles (4 → 1)
- Added responsive styles with their components
- Added comprehensive documentation
- Organized by function, not by page
