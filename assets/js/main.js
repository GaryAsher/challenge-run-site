// =========================================================
// Optimized main.js - Uses requestIdleCallback for non-critical work
// =========================================================
const CONFIG = {
  MENU_WIDTH: 320,
  MAX_SUGGESTIONS: 250,
  DEBOUNCE_MS: 150,
  SCROLL_TTL_MS: 10 * 60 * 1000,
};

(function () {
  'use strict';

  // =========================================================
  // Utility: Schedule work during idle time
  // =========================================================
  const scheduleIdle = window.requestIdleCallback 
    ? (fn) => requestIdleCallback(fn, { timeout: 100 })
    : (fn) => setTimeout(fn, 1);

  // =========================================================
  // Safe DOM Utilities
  // =========================================================
  function $(id) {
    return document.getElementById(id);
  }
  
  function $$(selector, context = document) {
    return Array.from((context || document).querySelectorAll(selector));
  }

  // =========================================================
  // Scroll preservation (lightweight - runs immediately)
  // =========================================================
  function getGameRoot(pathname) {
    const m = String(pathname || '').match(/^\/games\/([^/]+)\//);
    return m ? `/games/${m[1]}/` : null;
  }

  function saveGameScroll() {
    const root = getGameRoot(window.location.pathname);
    if (!root) return;
    try {
      sessionStorage.setItem(`crc_scroll:${root}`, JSON.stringify({ y: window.scrollY || 0, ts: Date.now() }));
    } catch (e) {}
  }

  function restoreGameScroll() {
    if (window.__CRC_SCROLL_RESTORED__) return;
    window.__CRC_SCROLL_RESTORED__ = true;

    const gameRoot = getGameRoot(window.location.pathname);
    if (!gameRoot) return;

    const ref = document.referrer || '';
    if (!ref.startsWith(window.location.origin)) return;

    const refRoot = getGameRoot(ref.slice(window.location.origin.length));
    if (!refRoot || refRoot !== gameRoot) return;

    try {
      const raw = sessionStorage.getItem(`crc_scroll:${gameRoot}`);
      if (!raw) return;

      const data = JSON.parse(raw);
      if (typeof data.y !== 'number') return;
      if (data.ts && Date.now() - data.ts > CONFIG.SCROLL_TTL_MS) return;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => window.scrollTo(0, data.y));
      });
    } catch (e) {}
  }

  // =========================================================
  // Client-side pagination (deferred - non-critical)
  // =========================================================
  function initPagedList(root) {
    const pageSize = parseInt(root.getAttribute('data-page-size') || '25', 10);
    const items = Array.from(root.querySelectorAll('.list-item'));
    if (!items.length) return;

    const btnPrev = root.querySelector('[data-prev]');
    const btnNext = root.querySelector('[data-next]');
    const statusEl = root.querySelector('[data-status]');
    const paramKey = root.id ? `${root.id}-page` : 'page';
    let currentPage = 1;

    function getPageFromUrl() {
      const url = new URL(window.location.href);
      const p = parseInt(url.searchParams.get(paramKey) || '1', 10);
      return Number.isFinite(p) && p > 0 ? p : 1;
    }

    function render(page) {
      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(Math.max(1, page), totalPages);
      currentPage = safePage;

      const start = (safePage - 1) * pageSize;
      const end = start + pageSize;

      // Use CSS classes instead of inline styles for better performance
      items.forEach((el, idx) => {
        el.hidden = !(idx >= start && idx < end);
      });

      if (statusEl) {
        statusEl.textContent = `Page ${safePage} of ${totalPages} • Showing ${total === 0 ? 0 : start + 1}–${Math.min(end, total)} of ${total}`;
      }

      if (btnPrev) btnPrev.disabled = safePage <= 1;
      if (btnNext) btnNext.disabled = safePage >= totalPages;

      const url = new URL(window.location.href);
      url.searchParams.set(paramKey, String(safePage));
      history.replaceState(null, '', url);
    }

    if (btnPrev) btnPrev.addEventListener('click', () => { render(currentPage - 1); root.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    if (btnNext) btnNext.addEventListener('click', () => { render(currentPage + 1); root.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

    render(getPageFromUrl());
    window.addEventListener('popstate', () => render(getPageFromUrl()));
  }

  // =========================================================
  // Runs table filtering (heavy - fully deferred)
  // =========================================================
  function initRunsTable() {
    const table = $('runs-table');
    if (!table) return;

    const q = $('q');
    const limitEl = $('limit');
    const status = $('status');
    const rows = Array.from(table.querySelectorAll('.run-row'));
    const tbody = table.querySelector('tbody');

    if (!rows.length) return;

    // Cache row data once to avoid repeated DOM reads
    const rowData = rows.map((r, i) => {
      r.dataset._i = String(i);
      return {
        el: r,
        runner: (r.dataset.runner || '').toLowerCase(),
        runnerName: (r.dataset.runnerName || '').toLowerCase(),
        category: (r.dataset.category || '').toLowerCase(),
        challengeId: (r.dataset.challengeId || '').toLowerCase(),
        challengeLabel: (r.dataset.challengeLabel || '').toLowerCase(),
        challengeAliases: (r.dataset.challengeAliases || '').toLowerCase(),
        restrictions: (r.dataset.restrictions || '').toLowerCase(),
        character: (r.dataset.character || '').toLowerCase(),
        date: r.dataset.date || '',
        dateNum: parseDate(r.dataset.date)
      };
    });

    function parseDate(s) {
      if (!s) return NaN;
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
      if (m) return Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
      return Date.parse(s) || NaN;
    }

    let dateSortDir = 'desc';
    let searchTerm = '';
    const selectedChallenges = new Set();
    const selectedRestrictions = new Set();

    function passesFilters(data) {
      // Search filter
      if (searchTerm) {
        const found = [data.runner, data.runnerName, data.category, data.challengeId, 
                       data.challengeLabel, data.challengeAliases, data.restrictions, data.character]
          .some(field => field.includes(searchTerm));
        if (!found) return false;
      }

      // Challenge filter
      if (selectedChallenges.size > 0 && !selectedChallenges.has(data.challengeId)) {
        return false;
      }

      // Restrictions filter
      if (selectedRestrictions.size > 0) {
        const rowRes = data.restrictions.split('||').map(s => s.trim()).filter(Boolean);
        const hasMatch = rowRes.some(r => selectedRestrictions.has(r.toLowerCase()));
        if (!hasMatch) return false;
      }

      return true;
    }

    function render() {
      let filtered = rowData.filter(passesFilters);
      
      // Sort
      filtered.sort((a, b) => {
        const aDate = a.dateNum;
        const bDate = b.dateNum;
        if (isNaN(aDate) && isNaN(bDate)) return 0;
        if (isNaN(aDate)) return 1;
        if (isNaN(bDate)) return -1;
        return dateSortDir === 'asc' ? aDate - bDate : bDate - aDate;
      });

      // Reorder DOM
      if (tbody) filtered.forEach(d => tbody.appendChild(d.el));

      // Show/hide rows
      const limit = parseInt((limitEl && limitEl.value) || '10', 10) || 10;
      const total = filtered.length;

      rows.forEach(r => r.hidden = true);
      
      if (limit === 0) {
        filtered.forEach(d => d.el.hidden = false);
        if (status) status.textContent = `Showing ${total} matching runs.`;
      } else {
        filtered.slice(0, limit).forEach(d => d.el.hidden = false);
        if (status) status.textContent = `Showing ${Math.min(limit, total)} of ${total} matching runs.`;
      }
    }

    // Debounced search
    let searchTimer;
    if (q) {
      q.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          searchTerm = (q.value || '').trim().toLowerCase();
          render();
        }, CONFIG.DEBOUNCE_MS);
      });
    }

    if (limitEl) limitEl.addEventListener('change', render);

    // Sort buttons
    const thSortAsc = $('th-sort-asc');
    const thSortDesc = $('th-sort-desc');
    
    if (thSortAsc) thSortAsc.addEventListener('click', () => { dateSortDir = 'asc'; render(); });
    if (thSortDesc) thSortDesc.addEventListener('click', () => { dateSortDir = 'desc'; render(); });

    render();
  }

  // =========================================================
  // Game navigation (lightweight)
  // =========================================================
  function initGameTabsNav() {
    const gameRoot = getGameRoot(window.location.pathname);
    if (!gameRoot) return;

    $$('.tab[data-href]').forEach(tab => {
      if (tab.getAttribute('data-href') === window.location.pathname) {
        tab.setAttribute('aria-current', 'page');
      }
    });

    document.addEventListener('click', e => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const tab = e.target.closest?.('.tab[data-href]');
      if (tab) {
        const href = tab.getAttribute('data-href');
        if (href) {
          e.preventDefault();
          saveGameScroll();
          window.location.href = href;
        }
        return;
      }

      const a = e.target.closest?.('a[href]');
      if (!a || (a.target && a.target !== '_self')) return;

      try {
        const url = new URL(a.getAttribute('href'), window.location.href);
        if (url.origin !== window.location.origin) return;

        const destRoot = getGameRoot(url.pathname);
        if (destRoot && destRoot === gameRoot && !(url.pathname === window.location.pathname && url.hash)) {
          saveGameScroll();
        }
      } catch (_) {}
    });
  }

  // =========================================================
  // Keyboard shortcuts (lightweight)
  // =========================================================
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        e.preventDefault();
        const searchInput = $('q');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    });
  }

  // =========================================================
  // Initialize - prioritize critical path
  // =========================================================
  
  // Critical: Run immediately after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCritical);
  } else {
    initCritical();
  }

  function initCritical() {
    // These are fast and important for UX
    restoreGameScroll();
    initGameTabsNav();
    initKeyboardShortcuts();

    // Defer heavy work to idle time
    scheduleIdle(() => {
      const pagedLists = $$('.list-paged');
      if (pagedLists.length) {
        pagedLists.forEach(initPagedList);
      }
    });

    scheduleIdle(() => {
      initRunsTable();
    });
  }
})();
