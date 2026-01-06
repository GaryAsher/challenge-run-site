# CRC Development Reminders

This file tracks features and improvements to revisit later.

---

## High Priority

### Google Form Automation
- [ ] Create Google Form based on `docs/NEW-GAME-FORM-SPEC.md`
- [ ] Set up Google Apps Script webhook
- [ ] Create GitHub Action to process submissions
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

### Performance Optimization
- [ ] Consider lazy-loading game covers
- [ ] Minify CSS/JS for production

---

## Completed ✅

- [x] Header "More" dropdown menu
- [x] Simple search bar (links to /search/)
- [x] Scroll position preservation between category pages

---

*Last updated: Phase 4*
