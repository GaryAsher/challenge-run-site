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
  // Runs table filtering (Search + Header filters + Date sort + Limit)
  // Category filtering/navigation removed (categories are pages).
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

    const thSortAsc = document.getElementById('th-sort-asc');
    const thSortDesc = document.getElementById('th-sort-desc');

    // Time sort buttons
    const thTimeAsc = document.getElementById('th-time-asc');
    const thTimeDesc = document.getElementById('th-time-desc');

    // Type-ahead filter elements (new pattern matching games page)
    const challengeSearch = document.getElementById('challenge-search');
    const challengePicked = document.getElementById('challenge-picked');
    const challengeSuggestions = document.getElementById('challenge-suggestions');

    const restrictionsSearch = document.getElementById('restrictions-search');
    const restrictionsPicked = document.getElementById('restrictions-picked');
    const restrictionsSuggestions = document.getElementById('restrictions-suggestions');

    const glitchSearch = document.getElementById('glitch-search');
    const glitchPicked = document.getElementById('glitch-picked');
    const glitchSuggestions = document.getElementById('glitch-suggestions');

    const characterSearch = document.getElementById('character-search');
    const characterPicked = document.getElementById('character-picked');
    const characterSuggestions = document.getElementById('character-suggestions');

    rows.forEach((r, i) => (r.dataset._i = String(i)));

    const norm = s => (s || '').toString().trim().toLowerCase();
    const uniq = arr => Array.from(new Set(arr));

    function parseDateToNumber(s) {
      const v = (s || '').trim();
      if (!v) return NaN;

      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
      if (m) {
        return Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
      }

      const t = Date.parse(v);
      return Number.isFinite(t) ? t : NaN;
    }

    function getLimit() {
      const v = parseInt((limitEl && limitEl.value) || '10', 10);
      return Number.isFinite(v) ? v : 10;
    }

    function parseRestrictionsRaw(row) {
      return (row.dataset.restrictions || '')
        .split('||')
        .map(s => (s || '').toString().trim())
        .filter(Boolean);
    }

    function buildOptions() {
      const chIds = [];
      const chLabelById = new Map();
      const restrictionsRaw = [];
      const glitchIds = [];
      const characterIds = [];

      rows.forEach(row => {
        const chId = norm(row.dataset.challengeId);
        const chLabel = (row.dataset.challengeLabel || '').toString().trim();
        const resRaw = parseRestrictionsRaw(row);
        const glitchId = norm(row.dataset.glitch);
        const characterId = (row.dataset.character || '').toString().trim();

        if (chId) {
          chIds.push(chId);
          if (!chLabelById.has(chId)) chLabelById.set(chId, chLabel || chId);
        }

        if (resRaw.length) restrictionsRaw.push(...resRaw);
        if (glitchId) glitchIds.push(glitchId);
        if (characterId) characterIds.push(characterId);
      });

      function toList(values, map) {
        return uniq(values.filter(Boolean))
          .map(v => {
            const id = norm(v);
            const label = (map && map.get(id)) || v;
            return { id, label };
          })
          .sort((a, b) => a.label.localeCompare(b.label));
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
    let timeSortDir = null; // null = not sorting by time

    function getLabelFor(col, id) {
      let list;
      if (col === 'challenge') list = OPTIONS.challenges;
      else if (col === 'restrictions') list = OPTIONS.restrictions;
      else if (col === 'glitch') list = OPTIONS.glitches;
      else if (col === 'character') list = OPTIONS.characters;
      else list = [];
      
      const hit = list.find(x => x.id === id);
      return hit ? hit.label : id;
    }

    // =========================================================
    // Type-ahead UI helpers (matching games page pattern)
    // =========================================================
    function renderPicked(set, list, pickedEl, { onRemove } = {}) {
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

    function renderSuggestions(qRaw, set, list, sugEl, { onPick } = {}) {
      if (!sugEl) return;
      const q = norm(qRaw);
      sugEl.innerHTML = '';

      const available = list.filter(x => !set.has(norm(x.id)));
      const filtered = q
        ? available.filter(x => norm(x.label).includes(q) || norm(x.id).includes(q))
        : available;

      const show = filtered.slice(0, 30);

      if (!show.length) {
        const empty = document.createElement('div');
        empty.className = 'tag-suggestion is-empty';
        empty.textContent = available.length ? 'No matches.' : 'All selected.';
        sugEl.appendChild(empty);
        sugEl.hidden = false;
        return;
      }

      show.forEach(x => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tag-suggestion';
        btn.textContent = x.label;

        btn.addEventListener('click', () => {
          set.add(norm(x.id));
          if (onPick) onPick();
        });

        sugEl.appendChild(btn);
      });

      sugEl.hidden = false;
    }

    function setupTypeAheadFilter(searchEl, pickedEl, sugEl, set, list) {
      if (!searchEl) return;

      function updateUI() {
        renderPicked(set, list, pickedEl, {
          onRemove: () => {
            updateUI();
            render();
          }
        });
        renderSuggestions(searchEl.value, set, list, sugEl, {
          onPick: () => {
            searchEl.value = '';
            updateUI();
            render();
          }
        });
      }

      searchEl.addEventListener('focus', updateUI);
      searchEl.addEventListener('input', updateUI);

      // Close suggestions when clicking outside
      document.addEventListener('click', e => {
        if (!sugEl) return;
        const picker = searchEl.closest('.tag-picker');
        if (picker && !picker.contains(e.target)) {
          sugEl.hidden = true;
        }
      });

      // Initial render of picked items
      renderPicked(set, list, pickedEl, {
        onRemove: () => {
          renderPicked(set, list, pickedEl, { onRemove: () => { updateUI(); render(); } });
          render();
        }
      });
    }

    function matchesAllRestrictions(rowResListNorm) {
      if (!activeRestrictions.size) return true;
      const need = Array.from(activeRestrictions);
      return need.every(x => rowResListNorm.includes(x));
    }

    function matchesGlitch(rowGlitch) {
      if (!activeGlitches.size) return true;
      return activeGlitches.has(norm(rowGlitch));
    }

    function matchesCharacter(rowCharacter) {
      if (!activeCharacters.size) return true;
      return activeCharacters.has(norm(rowCharacter));
    }

    function passesFilters(row) {
      const needle = norm(q && q.value);

      const ch = norm(row.dataset.challengeId);
      const resRaw = parseRestrictionsRaw(row);
      const resNorm = resRaw.map(norm);
      const glitch = row.dataset.glitch || '';
      const character = row.dataset.character || '';

      if (activeChallenges.size && !activeChallenges.has(ch)) return false;
      if (!matchesAllRestrictions(resNorm)) return false;
      if (!matchesGlitch(glitch)) return false;
      if (!matchesCharacter(character)) return false;

      if (needle) {
        const hay =
          norm(row.dataset.runner) +
          ' ' +
          norm(row.dataset.category) +
          ' ' +
          norm(row.dataset.challengeLabel) +
          ' ' +
          norm(resRaw.join(' ')) +
          ' ' +
          norm(glitch);

        if (!hay.includes(needle)) return false;
      }

      return true;
    }

    function sortRowsByDate(list) {
      const dir = dateSortDir;

      return list.sort((a, b) => {
        const aDate = parseDateToNumber(a.dataset.date);
        const bDate = parseDateToNumber(b.dataset.date);

        const aBad = !Number.isFinite(aDate);
        const bBad = !Number.isFinite(bDate);

        if (aBad && bBad) {
          return (parseInt(a.dataset._i, 10) || 0) - (parseInt(b.dataset._i, 10) || 0);
        }
        if (aBad) return 1;
        if (bBad) return -1;

        if (aDate === bDate) {
          return (parseInt(a.dataset._i, 10) || 0) - (parseInt(b.dataset._i, 10) || 0);
        }

        return dir === 'asc' ? aDate - bDate : bDate - aDate;
      });
    }

    function parseTimeToSeconds(s) {
      const v = (s || '').trim();
      if (!v || v === '—') return NaN;

      const parts = v.split(':');
      if (parts.length === 3) {
        // HH:MM:SS
        return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
      } else if (parts.length === 2) {
        // MM:SS
        return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
      }
      return NaN;
    }

    function sortRowsByTime(list) {
      const dir = timeSortDir;

      return list.sort((a, b) => {
        const aTime = parseTimeToSeconds(a.dataset.time);
        const bTime = parseTimeToSeconds(b.dataset.time);

        const aBad = !Number.isFinite(aTime);
        const bBad = !Number.isFinite(bTime);

        if (aBad && bBad) {
          return (parseInt(a.dataset._i, 10) || 0) - (parseInt(b.dataset._i, 10) || 0);
        }
        if (aBad) return 1;
        if (bBad) return -1;

        if (aTime === bTime) {
          return (parseInt(a.dataset._i, 10) || 0) - (parseInt(b.dataset._i, 10) || 0);
        }

        return dir === 'asc' ? aTime - bTime : bTime - aTime;
      });
    }

    function updateDateSortButtons() {
      if (thSortAsc) {
        thSortAsc.classList.toggle('is-active', dateSortDir === 'asc');
        thSortAsc.setAttribute('aria-pressed', dateSortDir === 'asc' ? 'true' : 'false');
      }
      if (thSortDesc) {
        thSortDesc.classList.toggle('is-active', dateSortDir === 'desc');
        thSortDesc.setAttribute('aria-pressed', dateSortDir === 'desc' ? 'true' : 'false');
      }
    }

    function updateTimeSortButtons() {
      if (thTimeAsc) {
        thTimeAsc.classList.toggle('is-active', timeSortDir === 'asc');
        thTimeAsc.setAttribute('aria-pressed', timeSortDir === 'asc' ? 'true' : 'false');
      }
      if (thTimeDesc) {
        thTimeDesc.classList.toggle('is-active', timeSortDir === 'desc');
        thTimeDesc.setAttribute('aria-pressed', timeSortDir === 'desc' ? 'true' : 'false');
      }
    }

    function render() {
      let filtered = rows.filter(passesFilters);
      
      // Sort by primary sort (time if active, then date as secondary)
      if (timeSortDir) {
        // Primary: time, Secondary: date
        filtered = filtered.sort((a, b) => {
          const aTime = parseTimeToSeconds(a.dataset.time);
          const bTime = parseTimeToSeconds(b.dataset.time);
          const aDate = parseDateToNumber(a.dataset.date);
          const bDate = parseDateToNumber(b.dataset.date);

          const aTimeBad = !Number.isFinite(aTime);
          const bTimeBad = !Number.isFinite(bTime);

          // If both have valid times, sort by time
          if (!aTimeBad && !bTimeBad && aTime !== bTime) {
            return timeSortDir === 'asc' ? aTime - bTime : bTime - aTime;
          }

          // If times are equal or one is missing, use date as tiebreaker
          const aDateBad = !Number.isFinite(aDate);
          const bDateBad = !Number.isFinite(bDate);

          if (!aDateBad && !bDateBad && aDate !== bDate) {
            return dateSortDir === 'asc' ? aDate - bDate : bDate - aDate;
          }

          // Fallback to original order
          return (parseInt(a.dataset._i, 10) || 0) - (parseInt(b.dataset._i, 10) || 0);
        });
      } else {
        filtered = sortRowsByDate(filtered);
      }

      if (tbody) filtered.forEach(r => tbody.appendChild(r));

      const lim = getLimit();
      const total = filtered.length;

      rows.forEach(r => (r.style.display = 'none'));

      if (lim === 0) {
        filtered.forEach(r => (r.style.display = ''));
        if (status) status.textContent = 'Showing ' + total + ' matching runs.';
        return;
      }

      filtered.forEach((r, idx) => {
        r.style.display = idx < lim ? '' : 'none';
      });

      if (status) {
        status.textContent = 'Showing ' + Math.min(lim, total) + ' of ' + total + ' matching runs.';
      }
    }

    // =========================================================
    // Setup type-ahead filters for Advanced Search
    // =========================================================
    setupTypeAheadFilter(challengeSearch, challengePicked, challengeSuggestions, activeChallenges, OPTIONS.challenges);
    setupTypeAheadFilter(restrictionsSearch, restrictionsPicked, restrictionsSuggestions, activeRestrictions, OPTIONS.restrictions);
    setupTypeAheadFilter(glitchSearch, glitchPicked, glitchSuggestions, activeGlitches, OPTIONS.glitches);
    setupTypeAheadFilter(characterSearch, characterPicked, characterSuggestions, activeCharacters, OPTIONS.characters);

    if (thSortAsc) {
      thSortAsc.addEventListener('click', () => {
        dateSortDir = 'asc';
        updateDateSortButtons();
        updateTimeSortButtons();
        render();
      });
    }

    if (thSortDesc) {
      thSortDesc.addEventListener('click', () => {
        dateSortDir = 'desc';
        updateDateSortButtons();
        updateTimeSortButtons();
        render();
      });
    }

    // Time sort buttons
    if (thTimeAsc) {
      thTimeAsc.addEventListener('click', () => {
        // Toggle: if already asc, turn off time sort
        timeSortDir = timeSortDir === 'asc' ? null : 'asc';
        updateDateSortButtons();
        updateTimeSortButtons();
        render();
      });
    }

    if (thTimeDesc) {
      thTimeDesc.addEventListener('click', () => {
        // Toggle: if already desc, turn off time sort
        timeSortDir = timeSortDir === 'desc' ? null : 'desc';
        updateDateSortButtons();
        updateTimeSortButtons();
        render();
      });
    }

    // Reset button functionality
    function updateResetButton() {
      const hasFilters = (q && q.value.trim()) ||
                         activeChallenges.size > 0 ||
                         activeRestrictions.size > 0 ||
                         activeGlitches.size > 0 ||
                         activeCharacters.size > 0;
      if (resetBtn) resetBtn.hidden = !hasFilters;
    }

    function refreshAllTypeAheadUIs() {
      // Re-render picked chips for all filters
      renderPicked(activeChallenges, OPTIONS.challenges, challengePicked, {
        onRemove: () => { refreshAllTypeAheadUIs(); render(); }
      });
      renderPicked(activeRestrictions, OPTIONS.restrictions, restrictionsPicked, {
        onRemove: () => { refreshAllTypeAheadUIs(); render(); }
      });
      renderPicked(activeGlitches, OPTIONS.glitches, glitchPicked, {
        onRemove: () => { refreshAllTypeAheadUIs(); render(); }
      });
      renderPicked(activeCharacters, OPTIONS.characters, characterPicked, {
        onRemove: () => { refreshAllTypeAheadUIs(); render(); }
      });
      
      // Clear search inputs
      if (challengeSearch) challengeSearch.value = '';
      if (restrictionsSearch) restrictionsSearch.value = '';
      if (glitchSearch) glitchSearch.value = '';
      if (characterSearch) characterSearch.value = '';
      
      // Hide suggestions
      if (challengeSuggestions) challengeSuggestions.hidden = true;
      if (restrictionsSuggestions) restrictionsSuggestions.hidden = true;
      if (glitchSuggestions) glitchSuggestions.hidden = true;
      if (characterSuggestions) characterSuggestions.hidden = true;
    }

    function resetAllFilters() {
      if (q) q.value = '';
      activeChallenges.clear();
      activeRestrictions.clear();
      activeGlitches.clear();
      activeCharacters.clear();
      dateSortDir = 'desc';
      timeSortDir = null;
      
      updateDateSortButtons();
      updateTimeSortButtons();
      refreshAllTypeAheadUIs();
      render();
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', resetAllFilters);
    }

    // Wrap render to update reset button
    const origRender = render;
    render = function() {
      origRender();
      updateResetButton();
    };

    if (q) q.addEventListener('input', render);
    if (limitEl) limitEl.addEventListener('change', render);

    updateDateSortButtons();
    updateTimeSortButtons();
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
