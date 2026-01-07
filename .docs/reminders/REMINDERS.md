# CRC Development Reminders

This file tracks features, improvements, and technical debt to revisit later.

---

## 🔴 High Priority - Do Now

### Delete Unused Files
- [ ] `_includes/runs-table.html` - Contains only "TEMP", never used
- [ ] `_includes/runs-for-game.html` - Never included anywhere
- [ ] `_includes/categories-for-game.html` - Never included anywhere

---

## 🟠 Medium Priority - Do Soon

### Google Form Automation
- [ ] Create Google Form based on `docs/NEW-GAME-FORM-SPEC.md`
- [ ] Set up Google Apps Script webhook
- [ ] Create GitHub Action to process submissions
- [ ] Test end-to-end flow

### Header Search - Challenge Links
- **Status**: Deferred
- **Issue**: Clicking challenges in header search does nothing useful
- **Proposed Solution**: Link to `/games/?challenge={id}` and have games page read URL param
- **Revisit when**: Games page filter supports URL parameters

---

## 🟡 Low Priority - When Time Allows

### Performance: Minify CSS/JS (Ready to run)
Build scripts are now in package.json. To enable:
```bash
npm install  # Install devDependencies (clean-css-cli, terser)
npm run build  # Minify CSS and JS
```
Then update `_layouts/default.html` to use `.min.css` and `.min.js` files.

### Code Quality: Remove Unused CSS
- **Tool**: PurgeCSS or similar
- **Caution**: Jekyll sites need careful configuration
- **Potential savings**: 10-30% CSS reduction

---

## 🟢 Nice to Have - Future

### Progressive Web App (PWA)
- Add service worker for offline browsing
- Cache game pages for faster repeat visits
- Add to home screen capability

### Multi-language Support (i18n)
- Would require significant restructuring
- Revisit when site has international user base

### Advanced Features
- [ ] Runner statistics dashboard
- [ ] Leaderboard comparisons
- [ ] Run submission form on website
- [ ] Email notifications for run approvals

---

## ✅ Completed

### January 2025 - Session 3
- [x] Sticky table header (freeze pane effect)
- [x] Table columns centered (except Runner = left aligned)
- [x] Renamed "Glitch" → "Ruleset"
- [x] Added Character/Weapon filter
- [x] Search bar full-width at top
- [x] Filter buttons in flex row below search
- [x] Resources page with title cards (Guides, Tools, Discords)
- [x] Overview page with title cards (Runs, Rules, Resources)
- [x] Homepage with News, Featured Runners, Featured Teams
- [x] Lazy load background images (IntersectionObserver)
- [x] Created shared utils.js with common functions
- [x] Added build scripts to package.json

### Previous Sessions
- [x] Theme picker with colored active borders
- [x] Theme changes all accent colors (not just buttons)
- [x] Header "More" dropdown menu
- [x] Live header search (games + runners)
- [x] Roman numeral search ("Hades 2" finds "Hades II")
- [x] Runner runs grouped by game
- [x] Category page generation from game files
- [x] Game name aliases
- [x] Subcategories displayed below parent categories
- [x] Centered filter labels
- [x] Scroll position preservation

---

## Technical Notes

### Lazy Loading Implementation
Background images now use `data-bg` attribute instead of inline `style`. JavaScript uses IntersectionObserver to load images when they come into view (with 100px margin for smoother experience). Fallback for older browsers loads all images immediately.

Files updated:
- `games/index.html`
- `runners/index.html`
- `_layouts/runner.html`

### Shared Utilities (assets/js/utils.js)
Created a shared utilities file with commonly used functions:
- `CRC.norm(s)` - Normalize strings for comparison
- `CRC.expandRomanNumerals(s)` - Convert roman numerals for search
- `CRC.debounce(fn, delay)` - Debounce function calls
- `CRC.lazyLoadBgs()` - Lazy load background images
- `CRC.parseDateToNumber(s)` - Parse date strings
- `CRC.escapeHtml(s)` - Escape HTML for XSS prevention
- `CRC.uniq(arr)` - Get unique array values

These can be used in future pages instead of duplicating code.

### Build Process
To minify assets for production:
1. `npm install` - Install devDependencies
2. `npm run build` - Creates `.min.css` and `.min.js` files
3. Update `_layouts/default.html` to reference minified files

---

*Last updated: January 2025*
