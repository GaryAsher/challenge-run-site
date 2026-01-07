// =========================================================
// Configuration
// =========================================================
const CONFIG = {
  MENU_WIDTH: 320,
  MAX_SUGGESTIONS: 250,
  DEBOUNCE_MS: 150,
  SCROLL_TTL_MS: 10 * 60 * 1000, // 10 minutes
};

// =========================================================
// Client-side pagination for any .list-paged block
// + Runs table filtering (Search + Header filters + Date sort + Limit)
//
// NOTE:
// Category filtering/navigation has been removed.
// Categories are browsed via category pages + chips in the layout,
// and category text remains searchable in the search box.
// =========================================================

(function () {
  // =========================================================
  // Scroll preservation helpers for game tab navigation
  // =========================================================
  function getGameRoot(pathname) {
    // Matches: /games/<game_id>/...  -> returns "/games/<game_id>/"
    const m = String(pathname || '').match(/^\/games\/([^/]+)\//);
    return m ? `/games/${m[1]}/` : null;
  }

  function saveGameScroll() {
    const root = getGameRoot(window.location.pathname);
    if (!root) return;

    const key = `crc_scroll:${root}`;
    const payload = {
      y: window.scrollY || window.pageYOffset || 0,
      ts: Date.now(),
    };

    try {
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch (err) {
      // Storage quota exceeded or disabled - non-critical
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.warn('Failed to save scroll position:', err.message);
      }
    }
  }

  function restoreGameScroll() {
    if (window.__CRC_SCROLL_RESTORED__) return;
    window.__CRC_SCROLL_RESTORED__ = true; // Mark as handled
    
    const ORIGIN = window.location.origin;
    const gameRoot = getGameRoot(window.location.pathname);
    if (!gameRoot) return;

    const ref = document.referrer || '';
    if (!ref.startsWith(ORIGIN)) return;

    const refPath = ref.slice(ORIGIN.length);
    const refRoot = getGameRoot(refPath);

    // Only restore when navigating within the same game
    if (!refRoot || refRoot !== gameRoot) return;

    const key = `crc_scroll:${gameRoot}`;

    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return;

      const data = JSON.parse(raw);
      if (!data || typeof data.y !== 'number') return;

      // Optional TTL: 10 minutes
      if (typeof data.ts === 'number' && Date.now() - data.ts > CONFIG.SCROLL_TTL_MS) {
        return;
      }

      // Wait longer for layout to settle (tables, images, etc.)
      const scrollY = data.y;
      function tryScroll() {
        window.scrollTo(0, scrollY);
      }
      
      // Multiple attempts to handle async content loading
      requestAnimationFrame(() => {
        tryScroll();
        setTimeout(tryScroll, 50);
        setTimeout(tryScroll, 150);
      });
    } catch (err) {
      // Parse error or storage disabled - non-critical
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.warn('Failed to restore scroll position:', err.message);
      }
    }
  }

  // =========================================================
  // Client-side pagination for any .list-paged block
  // =========================================================
  function initPagedList(root) {
    const pageSize = parseInt(root.getAttribute('data-page-size') || '25', 10);
    const items = Array.from(root.querySelectorAll('.list-item'));

    const btnPrev = root.querySelector('[data-prev]');
    const btnNext = root.querySelector('[data-next]');
    const statusEl = root.querySelector('[data-status]');
    const pageLabelEl = root.querySelector('[data-page-label]');
    const pagesWrap = root.querySelector('[data-pages]');

    const paramKey = root.id ? `${root.id}-page` : 'page';
    let currentPage = 1;

    function getPageFromUrl() {
      const url = new URL(window.location.href);
      const p = parseInt(url.searchParams.get(paramKey) || '1', 10);
      return Number.isFinite(p) && p > 0 ? p : 1;
    }

    function setPageInUrl(page) {
      const url = new URL(window.location.href);
      url.searchParams.set(paramKey, String(page));
      history.replaceState(null, '', url);
    }

    function render(page) {
      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(Math.max(1, page), totalPages);
      currentPage = safePage;

      const start = (safePage - 1) * pageSize;
      const end = start + pageSize;

      items.forEach((el, idx) => {
        el.style.display = idx >= start && idx < end ? '' : 'none';
      });

      if (statusEl) {
        const shownStart = total === 0 ? 0 : start + 1;
        const shownEnd = Math.min(end, total);
        statusEl.textContent = `Page ${safePage} of ${totalPages} • Showing ${shownStart}–${shownEnd} of ${total}`;
      }

      if (btnPrev) btnPrev.disabled = safePage <= 1;
      if (btnNext) btnNext.disabled = safePage >= totalPages;

      if (pageLabelEl) pageLabelEl.textContent = `Page ${safePage} / ${totalPages}`;

      if (pagesWrap) {
        pagesWrap.innerHTML = '';

        for (let p = 1; p <= totalPages; p++) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn page-btn';
          b.textContent = String(p);

          if (p === safePage) {
            b.disabled = true;
            b.classList.add('is-current');
            b.setAttribute('aria-current', 'page');
          }

          b.addEventListener('click', () => {
            render(p);
            root.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });

          pagesWrap.appendChild(b);
        }
      }

      setPageInUrl(safePage);
      root.setAttribute('data-page', String(safePage));
    }

    if (items.length === 0) {
      if (statusEl) statusEl.textContent = 'No results.';
      if (btnPrev) btnPrev.disabled = true;
      if (btnNext) btnNext.disabled = true;
      if (pagesWrap) pagesWrap.innerHTML = '';
      return;
    }

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        render(currentPage - 1);
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        render(currentPage + 1);
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    render(getPageFromUrl());
    window.addEventListener('popstate', () => render(getPageFromUrl()));
  }

  // =========================================================
  // Runs table filtering (Search + Searchable filters + Time/Date sort)
  // =========================================================
  function initRunsTable() {
    const table = document.getElementById('runs-table');
    if (!table) return;

    const q = document.getElementById('q');
    const limitEl = document.getElementById('limit');
    const status = document.getElementById('status');
    const resetBtn = document.getElementById('reset-all');

    // Filter toggle
    const filterToggle = document.getElementById('filter-toggle');
    const advancedFilters = document.getElementById('advanced-filters');

    if (filterToggle && advancedFilters) {
      filterToggle.addEventListener('click', () => {
        const isExpanded = filterToggle.getAttribute('aria-expanded') === 'true';
        filterToggle.setAttribute('aria-expanded', !isExpanded);
        advancedFilters.hidden = isExpanded;
        filterToggle.classList.toggle('is-active', !isExpanded);
      });
    }

    const rows = Array.from(table.querySelectorAll('.run-row'));
    const tbody = table.querySelector('tbody');

    // Sort buttons
    const thSortAsc = document.getElementById('th-sort-asc');
    const thSortDesc = document.getElementById('th-sort-desc');
    const thTimeAsc = document.getElementById('th-time-asc');
    const thTimeDesc = document.getElementById('th-time-desc');

    // Searchable filter elements
    const challengeFilterEl = document.getElementById('challenge-filter');
    const challengePickedEl = document.getElementById('challenge-picked');
    const challengeSearchEl = document.getElementById('challenge-search');
    const challengeSugEl = document.getElementById('challenge-suggestions');

    const restrictionsFilterEl = document.getElementById('restrictions-filter');
    const restrictionsPickedEl = document.getElementById('restrictions-picked');
    const restrictionsSearchEl = document.getElementById('restrictions-search');
    const restrictionsSugEl = document.getElementById('restrictions-suggestions');

    const glitchFilterEl = document.getElementById('glitch-filter');
    const glitchPickedEl = document.getElementById('glitch-picked');
    const glitchSearchEl = document.getElementById('glitch-search');
    const glitchSugEl = document.getElementById('glitch-suggestions');

    const characterFilterEl = document.getElementById('character-filter');
    const characterPickedEl = document.getElementById('character-picked');
    const characterSearchEl = document.getElementById('character-search');
    const characterSugEl = document.getElementById('character-suggestions');

    rows.forEach((r, i) => (r.dataset._i = String(i)));

    const norm = s => (s || '').toString().trim().toLowerCase();
    const uniq = arr => Array.from(new Set(arr));

    function parseDateToNumber(s) {
      const v = (s || '').trim();
      if (!v) return NaN;
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
      if (m) return Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
      const t = Date.parse(v);
      return Number.isFinite(t) ? t : NaN;
    }

    function parseTimeToSeconds(s) {
      const v = (s || '').trim();
      if (!v || v === '—') return NaN;
      const parts = v.split(':');
      if (parts.length === 3) {
        return (parseFloat(parts[0]) || 0) * 3600 + (parseFloat(parts[1]) || 0) * 60 + (parseFloat(parts[2]) || 0);
      } else if (parts.length === 2) {
        return (parseFloat(parts[0]) || 0) * 60 + (parseFloat(parts[1]) || 0);
      }
      return NaN;
    }

    function getLimit() {
      const v = parseInt((limitEl && limitEl.value) || '10', 10);
      return Number.isFinite(v) ? v : 10;
    }

    function parseRestrictionsRaw(row) {
      return (row.dataset.restrictions || '').split('||').map(s => s.trim()).filter(Boolean);
    }

    // Build OPTIONS from row data
    function buildOptions() {
      const chIds = [], chLabelById = new Map();
      const restrictionsRaw = [], glitchIds = [], characterIds = [];

      rows.forEach(row => {
        const chId = norm(row.dataset.challengeId);
        const chLabel = (row.dataset.challengeLabel || '').trim();
        if (chId) {
          chIds.push(chId);
          if (!chLabelById.has(chId)) chLabelById.set(chId, chLabel || chId);
        }
        parseRestrictionsRaw(row).forEach(r => restrictionsRaw.push(r));
        const glitch = norm(row.dataset.glitch);
        if (glitch) glitchIds.push(glitch);
        const char = (row.dataset.character || '').trim();
        if (char) characterIds.push(char);
      });

      function toList(values, map) {
        return uniq(values.filter(Boolean)).map(v => {
          const id = norm(v);
          const label = (map && map.get(id)) || v;
          return { id, label };
        }).sort((a, b) => a.label.localeCompare(b.label));
      }

      return {
        challenges: toList(chIds, chLabelById),
        restrictions: toList(restrictionsRaw),
        glitches: toList(glitchIds),
        characters: toList(characterIds),
      };
    }

    const OPTIONS = buildOptions();

    const activeChallenges = new Set();
    const activeRestrictions = new Set();
    const activeGlitches = new Set();
    const activeCharacters = new Set();

    let dateSortDir = 'desc';
    let timeSortDir = null; // null = no sort, 'asc' = fastest first, 'desc' = slowest first

    // Filtering logic
    function matchesAllRestrictions(rowResNorm) {
      if (!activeRestrictions.size) return true;
      return Array.from(activeRestrictions).every(r => rowResNorm.includes(r));
    }

    function passesFilters(row) {
      const needle = norm(q && q.value);
      const ch = norm(row.dataset.challengeId);
      const resRaw = parseRestrictionsRaw(row);
      const resNorm = resRaw.map(norm);
      const glitch = norm(row.dataset.glitch || '');
      const character = norm(row.dataset.character || '');

      if (activeChallenges.size && !activeChallenges.has(ch)) return false;
      if (!matchesAllRestrictions(resNorm)) return false;
      if (activeGlitches.size && !activeGlitches.has(glitch)) return false;
      if (activeCharacters.size && !activeCharacters.has(character)) return false;

      if (needle) {
        const hay = norm(row.dataset.runner) + ' ' + norm(row.dataset.category) + ' ' +
                    norm(row.dataset.challengeLabel) + ' ' + norm(resRaw.join(' ')) + ' ' + glitch;
        if (!hay.includes(needle)) return false;
      }
      return true;
    }

    // Sorting
    function sortRowsByDate(list) {
      return list.sort((a, b) => {
        const aDate = parseDateToNumber(a.dataset.date);
        const bDate = parseDateToNumber(b.dataset.date);
        const aBad = !Number.isFinite(aDate), bBad = !Number.isFinite(bDate);
        if (aBad && bBad) return (parseInt(a.dataset._i, 10) || 0) - (parseInt(b.dataset._i, 10) || 0);
        if (aBad) return 1;
        if (bBad) return -1;
        if (aDate === bDate) return (parseInt(a.dataset._i, 10) || 0) - (parseInt(b.dataset._i, 10) || 0);
        return dateSortDir === 'asc' ? aDate - bDate : bDate - aDate;
      });
    }

    function sortRowsByTime(list) {
      if (!timeSortDir) return list;
      return list.sort((a, b) => {
        const aTime = parseTimeToSeconds(a.dataset.time);
        const bTime = parseTimeToSeconds(b.dataset.time);
        const aBad = !Number.isFinite(aTime), bBad = !Number.isFinite(bTime);
        if (aBad && bBad) return (parseInt(a.dataset._i, 10) || 0) - (parseInt(b.dataset._i, 10) || 0);
        if (aBad) return 1;
        if (bBad) return -1;
        if (aTime === bTime) return (parseInt(a.dataset._i, 10) || 0) - (parseInt(b.dataset._i, 10) || 0);
        return timeSortDir === 'asc' ? aTime - bTime : bTime - aTime;
      });
    }

    function updateSortButtons() {
      if (thSortAsc) thSortAsc.disabled = dateSortDir === 'asc' && !timeSortDir;
      if (thSortDesc) thSortDesc.disabled = dateSortDir === 'desc' && !timeSortDir;
      if (thTimeAsc) thTimeAsc.disabled = timeSortDir === 'asc';
      if (thTimeDesc) thTimeDesc.disabled = timeSortDir === 'desc';
    }

    // Reset button
    function updateResetButton() {
      const hasFilters = (q && q.value.trim()) ||
                         activeChallenges.size > 0 ||
                         activeRestrictions.size > 0 ||
                         activeGlitches.size > 0 ||
                         activeCharacters.size > 0;
      if (resetBtn) resetBtn.hidden = !hasFilters;
    }

    function resetAllFilters() {
      if (q) q.value = '';
      activeChallenges.clear();
      activeRestrictions.clear();
      activeGlitches.clear();
      activeCharacters.clear();
      timeSortDir = null;
      dateSortDir = 'desc';
      
      // Re-render all picked areas
      if (challengePickedEl) challengePickedEl.innerHTML = '';
      if (restrictionsPickedEl) restrictionsPickedEl.innerHTML = '';
      if (glitchPickedEl) glitchPickedEl.innerHTML = '';
      if (characterPickedEl) characterPickedEl.innerHTML = '';
      
      updateSortButtons();
      render();
    }

    if (resetBtn) resetBtn.addEventListener('click', resetAllFilters);

    // Render
    function render() {
      let filtered = rows.filter(passesFilters);
      if (timeSortDir) {
        filtered = sortRowsByTime(filtered);
      } else {
        filtered = sortRowsByDate(filtered);
      }
      if (tbody) filtered.forEach(r => tbody.appendChild(r));

      const lim = getLimit();
      const total = filtered.length;
      rows.forEach(r => (r.style.display = 'none'));

      if (lim === 0) {
        filtered.forEach(r => (r.style.display = ''));
      } else {
        filtered.forEach((r, idx) => { r.style.display = idx < lim ? '' : 'none'; });
      }

      if (status) {
        const shown = lim === 0 ? total : Math.min(lim, total);
        status.textContent = 'Showing ' + shown + ' of ' + total + ' matching runs.';
      }
      updateResetButton();
    }

    // Searchable dropdown helpers (similar to games page)
    function renderPicked(set, list, pickedEl, { onRemove }) {
      if (!pickedEl) return;
      pickedEl.innerHTML = '';
      const entries = Array.from(set);
      if (!entries.length) return;

      for (const id of entries) {
        const meta = list.find(x => norm(x.id) === norm(id));
        const label = meta ? meta.label : id;
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'tag-chip';
        chip.textContent = label + ' ×';
        chip.addEventListener('click', () => {
          set.delete(norm(id));
          if (onRemove) onRemove();
        });
        pickedEl.appendChild(chip);
      }
    }

    function renderSuggestions(qRaw, set, list, sugEl, { onPick }) {
      if (!sugEl) return;
      const qv = norm(qRaw);
      sugEl.innerHTML = '';

      const available = list.filter(x => !set.has(norm(x.id)));
      const filtered = qv ? available.filter(x => norm(x.label).includes(qv) || norm(x.id).includes(qv)) : available;
      const show = filtered.slice(0, 30);

      if (!show.length) {
        const empty = document.createElement('div');
        empty.className = 'tag-suggestion is-empty';
        empty.textContent = 'No matches.';
        sugEl.appendChild(empty);
        sugEl.hidden = false;
        return;
      }

      for (const item of show) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tag-suggestion';
        btn.textContent = item.label;
        btn.addEventListener('click', () => {
          set.add(norm(item.id));
          if (onPick) onPick(item);
        });
        sugEl.appendChild(btn);
      }
      sugEl.hidden = false;
    }

    function wireDropdown({ filterEl, searchEl, sugEl, set, list, pickedEl }) {
      if (!filterEl || !searchEl || !sugEl) return;

      function afterPick() {
        searchEl.value = '';
        renderPicked(set, list, pickedEl, { onRemove: onRemoveChip });
        render();
        renderSuggestions('', set, list, sugEl, { onPick: afterPick });
      }

      function open() {
        renderSuggestions(searchEl.value, set, list, sugEl, { onPick: afterPick });
      }

      function close() {
        sugEl.hidden = true;
      }

      function onRemoveChip() {
        searchEl.value = '';
        renderPicked(set, list, pickedEl, { onRemove: onRemoveChip });
        render();
        close();
      }

      renderPicked(set, list, pickedEl, { onRemove: onRemoveChip });

      searchEl.addEventListener('focus', () => { if (sugEl.hidden) open(); });
      searchEl.addEventListener('pointerdown', () => { if (sugEl.hidden) open(); else close(); });
      searchEl.addEventListener('input', open);
      searchEl.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); searchEl.blur(); } });
      document.addEventListener('pointerdown', (e) => { if (!filterEl.contains(e.target)) close(); }, true);
    }

    // Wire up all dropdowns
    wireDropdown({
      filterEl: challengeFilterEl,
      searchEl: challengeSearchEl,
      sugEl: challengeSugEl,
      set: activeChallenges,
      list: OPTIONS.challenges,
      pickedEl: challengePickedEl
    });

    wireDropdown({
      filterEl: restrictionsFilterEl,
      searchEl: restrictionsSearchEl,
      sugEl: restrictionsSugEl,
      set: activeRestrictions,
      list: OPTIONS.restrictions,
      pickedEl: restrictionsPickedEl
    });

    wireDropdown({
      filterEl: glitchFilterEl,
      searchEl: glitchSearchEl,
      sugEl: glitchSugEl,
      set: activeGlitches,
      list: OPTIONS.glitches,
      pickedEl: glitchPickedEl
    });

    wireDropdown({
      filterEl: characterFilterEl,
      searchEl: characterSearchEl,
      sugEl: characterSugEl,
      set: activeCharacters,
      list: OPTIONS.characters,
      pickedEl: characterPickedEl
    });

    // Date sort buttons
    if (thSortAsc) {
      thSortAsc.addEventListener('click', () => {
        timeSortDir = null;
        dateSortDir = 'asc';
        updateSortButtons();
        render();
      });
    }

    if (thSortDesc) {
      thSortDesc.addEventListener('click', () => {
        timeSortDir = null;
        dateSortDir = 'desc';
        updateSortButtons();
        render();
      });
    }

    // Time sort buttons
    if (thTimeAsc) {
      thTimeAsc.addEventListener('click', () => {
        timeSortDir = 'asc';
        updateSortButtons();
        render();
      });
    }

    if (thTimeDesc) {
      thTimeDesc.addEventListener('click', () => {
        timeSortDir = 'desc';
        updateSortButtons();
        render();
      });
    }

    if (q) q.addEventListener('input', render);
    if (limitEl) limitEl.addEventListener('change', render);

    updateSortButtons();
    render();
  }


  // =========================================================
  // Game navigation helper
  // Saves scroll before navigating to any page within the same game
  // =========================================================
  function initGameTabsNav() {
    const gameRoot = getGameRoot(window.location.pathname);
    if (!gameRoot) return;

    // Update aria-current on tabs
    document.querySelectorAll('.tab[data-href]').forEach(tab => {
      if (tab.getAttribute('data-href') === window.location.pathname) {
        tab.setAttribute('aria-current', 'page');
      }
    });

    document.addEventListener('click', e => {
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const tab = e.target && e.target.closest ? e.target.closest('.tab[data-href]') : null;
      if (tab) {
        const dataHref = tab.getAttribute('data-href');
        if (!dataHref) return;

        e.preventDefault();
        saveGameScroll();
        window.location.href = dataHref;
        return;
      }

      const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;

      if (a.target && a.target !== '_self') return;

      let url;
      try {
        url = new URL(a.getAttribute('href'), window.location.href);
      } catch (_) {
        return;
      }

      if (url.origin !== window.location.origin) return;

      const destRoot = getGameRoot(url.pathname);
      if (!destRoot || destRoot !== gameRoot) return;

      if (url.pathname === window.location.pathname && url.hash) return;

      saveGameScroll();
    });
  }

  // =========================================================
  // Keyboard shortcuts
  // =========================================================
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      // "/" to focus search (like GitHub)
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        e.preventDefault();
        const searchInput = document.getElementById('q');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    restoreGameScroll();
    document.querySelectorAll('.list-paged').forEach(initPagedList);
    initRunsTable();
    initGameTabsNav();
    initKeyboardShortcuts();
  });
})();
