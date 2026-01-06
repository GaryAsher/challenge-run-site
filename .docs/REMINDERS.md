# CRC Development Reminders

This file tracks features and improvements to revisit later.

---

## High Priority

### Google Form Automation
- [ ] Create Google Form based on `docs/NEW-GAME-FORM-SPEC.md`
- [ ] Set up Google Apps Script webhook
- [ ] Test end-to-end flow

---

## Medium Priority

### Header Search - Challenge Links
- **Status**: Commented out / deferred
- **Issue**: Clicking challenges in search does nothing useful
- **Proposed Solution**: Link to `/games/?challenge={id}` and have games page read URL param
- **Revisit when**: Games page filter supports URL parameters

### Multi-language Support (i18n)
- **Status**: Future consideration
- **Notes**: Would require significant restructuring
- **Revisit when**: Site has international user base

---

## Low Priority

### Runner Page Improvements
- **Status**: Runs now grouped by game ✅
- **Possible enhancement**: Add filter/search within runner's runs

### Performance Optimization
- [ ] Consider lazy-loading game covers
- [ ] Minify CSS/JS for production

---

## Completed ✅

- [x] Theme picker with colored active borders
- [x] Header "More" dropdown menu
- [x] Live header search (games + runners)
- [x] Runner runs grouped by game
- [x] Category page generation from game files
- [x] Game name aliases (Hades II / Hades 2)

---

*Last updated: Phase 4*
