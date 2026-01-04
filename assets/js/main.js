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
    const m = String(pathname || "").match(/^\/games\/([^/]+)\//);
    return m ? `/games/${m[1]}/` : null;
  }

  function saveGameScroll() {
    const root = getGameRoot(window.location.pathname);
    if (!root) return;

    const key = `crc_scroll:${root}`;
    const payload = {
      y: window.scrollY || window.pageYOffset || 0,
      ts: Date.now()
    };

    try {
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch (_) {
      // ignore storage failures
    }
  }

  function restoreGameScroll() {
    const ORIGIN = window.location.origin;
    const gameRoot = getGameRoot(window.location.pathname);
    if (!gameRoot) return;

    const ref = document.referrer || "";
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
      if (!data || typeof data.y !== "number") return;

      // Optional TTL: 10 minutes
      if (typeof data.ts === "number" && Date.now() - data.ts > 10 * 60 * 1000) {
        return;
      }

      // Wait for layout to settle
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, data.y);
        });
      });
    } catch (_) {
      // ignore parse errors
    }
  }

  // =========================================================
  // Client-side pagination for any .list-paged block
  // =========================================================
  function initPagedList(root) {
    const pageSize = parseInt(root.getAttribute("data-page-size") || "25", 10);
    const items = Array.from(root.querySelectorAll(".list-item"));

    const btnPrev = root.querySelector("[data-prev]");
    const btnNext = root.querySelector("[data-next]");
    const statusEl = root.querySelector("[data-status]");
    const pageLabelEl = root.querySelector("[data-page-label]");
    const pagesWrap = root.querySelector("[data-pages]");

    const paramKey = root.id ? `${root.id}-page` : "page";
    let currentPage = 1;

    function getPageFromUrl() {
      const url = new URL(window.location.href);
      const p = parseInt(url.searchParams.get(paramKey) || "1", 10);
      return Number.isFinite(p) && p > 0 ? p : 1;
    }

    function setPageInUrl(page) {
      const url = new URL(window.location.href);
      url.searchParams.set(paramKey, String(page));
      history.replaceState(null, "", url);
    }

    function render(page) {
      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(Math.max(1, page), totalPages);
      currentPage = safePage;

      const start = (safePage - 1) * pageSize;
      const end = start + pageSize;

      items.forEach((el, idx) => {
        el.style.display = idx >= start && idx < end ? "" : "none";
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
        pagesWrap.innerHTML = "";

        for (let p = 1; p <= totalPages; p++) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "btn page-btn";
          b.textContent = String(p);

          if (p === safePage) {
            b.disabled = true;
            b.classList.add("is-current");
          }

          b.addEventListener("click", () => {
            render(p);
            root.scrollIntoView({ behavior: "smooth", block: "start" });
          });

          pagesWrap.appendChild(b);
        }
      }

      setPageInUrl(safePage);
      root.setAttribute("data-page", String(safePage));
    }

    if (items.length === 0) {
      if (statusEl) statusEl.textContent = "No results.";
      if (btnPrev) btnPrev.disabled = true;
      if (btnNext) btnNext.disabled = true;
      if (pagesWrap) pagesWrap.innerHTML = "";
      return;
    }

    if (btnPrev) {
      btnPrev.addEventListener("click", () => {
        render(currentPage - 1);
        root.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    if (btnNext) {
      btnNext.addEventListener("click", () => {
        render(currentPage + 1);
        root.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    render(getPageFromUrl());
    window.addEventListener("popstate", () => render(getPageFromUrl()));
  }

  // =========================================================
  // Runs table filtering (Search + Header filters + Date sort + Limit)
  // Category filtering/navigation removed (categories are pages).
  // =========================================================
  function initRunsTable() {
    const table = document.getElementById("runs-table");
    if (!table) return;

    const q = document.getElementById("q");
    const limitEl = document.getElementById("limit");
    const status = document.getElementById("status");

    const rows = Array.from(table.querySelectorAll(".run-row"));
    const tbody = table.querySelector("tbody");

    const thMenu = document.getElementById("th-menu");
    const thMenuQ = document.getElementById("th-menu-q");
    const thMenuList = document.getElementById("th-menu-list");
    const thMenuClear = document.getElementById("th-menu-clear");
    const thMenuClose = document.getElementById("th-menu-close");

    const thSortAsc = document.getElementById("th-sort-asc");
    const thSortDesc = document.getElementById("th-sort-desc");

    const btnCh = document.getElementById("filter-challenge");
    const btnRes = document.getElementById("filter-restrictions");
    const activeFiltersWrap = document.getElementById("active-filters");

    rows.forEach((r, i) => (r.dataset._i = String(i)));

    const norm = (s) => (s || "").toString().trim().toLowerCase();
    const uniq = (arr) => Array.from(new Set(arr));

    function parseDateToNumber(s) {
      const v = (s || "").trim();
      if (!v) return NaN;

      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
      if (m) {
        return Date.UTC(
          parseInt(m[1], 10),
          parseInt(m[2], 10) - 1,
          parseInt(m[3], 10)
        );
      }

      const t = Date.parse(v);
      return Number.isFinite(t) ? t : NaN;
    }

    function getLimit() {
      const v = parseInt((limitEl && limitEl.value) || "10", 10);
      return Number.isFinite(v) ? v : 10;
    }

    function parseRestrictionsRaw(row) {
      return (row.dataset.restrictions || "")
        .split("||")
        .map((s) => (s || "").toString().trim())
        .filter(Boolean);
    }

    function buildOptions() {
      const chIds = [];
      const chLabelById = new Map();
      const restrictionsRaw = [];

      rows.forEach((row) => {
        const chId = norm(row.dataset.challengeId);
        const chLabel = (row.dataset.challengeLabel || "").toString().trim();
        const resRaw = parseRestrictionsRaw(row);

        if (chId) {
          chIds.push(chId);
          if (!chLabelById.has(chId)) chLabelById.set(chId, chLabel || chId);
        }

        if (resRaw.length) restrictionsRaw.push(...resRaw);
      });

      function toList(values, map) {
        return uniq(values.filter(Boolean))
          .map((v) => {
            const id = norm(v);
            const label = (map && map.get(id)) || v;
            return { id, label };
          })
          .sort((a, b) => a.label.localeCompare(b.label));
      }

      return {
        challenges: toList(chIds, chLabelById),
        restrictions: toList(restrictionsRaw)
      };
    }

    const OPTIONS = buildOptions();

    const activeChallenges = new Set();
    const activeRestrictions = new Set();

    let dateSortDir = "desc";
    let thActiveCol = null;

    function closeThMenu() {
      if (!thMenu) return;

      if (thMenuQ && document.activeElement === thMenuQ) thMenuQ.blur();
      if (thMenuQ) thMenuQ.value = "";

      thMenu.hidden = true;
      thActiveCol = null;

      if (thMenuClear) thMenuClear.textContent = "Clear";
    }

    function getSetForCol(col) {
      if (col === "challenge") return activeChallenges;
      if (col === "restrictions") return activeRestrictions;
      return null;
    }

    function getOptionsForCol(col) {
      if (col === "challenge") return OPTIONS.challenges;
      if (col === "restrictions") return OPTIONS.restrictions;
      return [];
    }

    function getLabelFor(col, id) {
      const list = getOptionsForCol(col);
      const hit = list.find((x) => x.id === id);
      return hit ? hit.label : id;
    }

    function updateTopButtonLabels() {
      if (btnCh) {
        btnCh.textContent = activeChallenges.size
          ? `Challenge (${activeChallenges.size}) ▾`
          : "Challenge ▾";
      }

      if (btnRes) {
        btnRes.textContent = activeRestrictions.size
          ? `Restrictions (${activeRestrictions.size}) ▾`
          : "Restrictions ▾";
      }
    }

    function renderActiveFilterChips() {
      if (!activeFiltersWrap) return;

      activeFiltersWrap.innerHTML = "";
      const chips = [];

      activeChallenges.forEach((id) => {
        chips.push({ kind: "challenge", id, label: getLabelFor("challenge", id) });
      });

      activeRestrictions.forEach((id) => {
        chips.push({ kind: "restrictions", id, label: getLabelFor("restrictions", id) });
      });

      if (!chips.length) return;

      function makeChip(text, onRemove) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "tag";
        b.textContent = text + " ×";
        b.addEventListener("click", onRemove);
        return b;
      }

      chips.forEach((c) => {
        const colLabel = c.kind === "challenge" ? "Challenge" : "Restrictions";
        activeFiltersWrap.appendChild(
          makeChip(`${colLabel}: ${c.label}`, () => {
            const set = c.kind === "challenge" ? activeChallenges : activeRestrictions;
            set.delete(c.id);
            render();
          })
        );
      });

      const clearAll = document.createElement("button");
      clearAll.type = "button";
      clearAll.className = "btn";
      clearAll.textContent = "Clear All";
      clearAll.addEventListener("click", () => {
        activeChallenges.clear();
        activeRestrictions.clear();
        render();
      });

      activeFiltersWrap.appendChild(clearAll);
    }

    function matchesAllRestrictions(rowResListNorm) {
      if (!activeRestrictions.size) return true;
      const need = Array.from(activeRestrictions);
      return need.every((x) => rowResListNorm.includes(x));
    }

    function passesFilters(row) {
      const needle = norm(q && q.value);

      const ch = norm(row.dataset.challengeId);
      const resRaw = parseRestrictionsRaw(row);
      const resNorm = resRaw.map(norm);

      if (activeChallenges.size && !activeChallenges.has(ch)) return false;
      if (!matchesAllRestrictions(resNorm)) return false;

      if (needle) {
        const hay =
          norm(row.dataset.runner) +
          " " +
          norm(row.dataset.category) +
          " " +
          norm(row.dataset.challengeLabel) +
          " " +
          norm(resRaw.join(" "));

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

        return dir === "asc" ? aDate - bDate : bDate - aDate;
      });
    }

    function updateDateSortButtons() {
      if (thSortAsc) thSortAsc.disabled = dateSortDir === "asc";
      if (thSortDesc) thSortDesc.disabled = dateSortDir === "desc";
    }

    function render() {
      let filtered = rows.filter(passesFilters);
      filtered = sortRowsByDate(filtered);

      if (tbody) filtered.forEach((r) => tbody.appendChild(r));

      const lim = getLimit();
      const total = filtered.length;

      rows.forEach((r) => (r.style.display = "none"));

      if (lim === 0) {
        filtered.forEach((r) => (r.style.display = ""));
        if (status) status.textContent = "Showing " + total + " matching runs.";
        updateTopButtonLabels();
        renderActiveFilterChips();
        return;
      }

      filtered.forEach((r, idx) => {
        r.style.display = idx < lim ? "" : "none";
      });

      if (status) {
        status.textContent =
          "Showing " + Math.min(lim, total) + " of " + total + " matching runs.";
      }

      updateTopButtonLabels();
      renderActiveFilterChips();
    }

    function renderThMenuList() {
      if (!thMenuList || !thMenuQ || !thActiveCol) return;

      const qv = norm(thMenuQ.value);
      const list = getOptionsForCol(thActiveCol);
      const set = getSetForCol(thActiveCol);

      thMenuList.innerHTML = "";

      const available = set ? list.filter((x) => !set.has(x.id)) : list;

      const filtered = available.filter((x) => {
        if (!qv) return true;
        return norm(x.label).includes(qv) || norm(x.id).includes(qv);
      });

      if (!filtered.length) {
        const empty = document.createElement("div");
        empty.className = "th-menu__empty muted";
        empty.textContent = available.length
          ? "No matches."
          : "All options selected. Remove a filter chip to re-add.";
        thMenuList.appendChild(empty);
        return;
      }

      filtered.slice(0, 250).forEach((x) => {
        const lab = document.createElement("label");
        lab.className = "th-menu__item";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = false;

        cb.addEventListener("change", () => {
          if (!set) return;

          if (cb.checked) set.add(x.id);
          else set.delete(x.id);

          render();
          renderThMenuList();
        });

        const txt = document.createElement("span");
        txt.textContent = x.label;

        lab.appendChild(cb);
        lab.appendChild(txt);
        thMenuList.appendChild(lab);
      });
    }

    function openThMenuFor(col, anchorEl) {
      if (!thMenu) return;

      thActiveCol = col;
      thMenu.hidden = false;

      const r = anchorEl.getBoundingClientRect();
      const approxMenuW = 320;

      const left = Math.min(
        window.innerWidth - approxMenuW - 12,
        Math.max(12, r.left)
      );

      thMenu.style.left = left + "px";
      thMenu.style.top = r.bottom + 8 + "px";

      if (thMenuQ) thMenuQ.value = "";
      renderThMenuList();

      requestAnimationFrame(() => {
        if (!thMenuQ || thMenu.hidden) return;

        const menuW = thMenu.offsetWidth || approxMenuW;
        const menuH = thMenu.offsetHeight || 300;

        const clampedLeft = Math.min(
          window.innerWidth - menuW - 12,
          Math.max(12, r.left)
        );

        const clampedTop = Math.min(
          window.innerHeight - menuH - 12,
          r.bottom + 8
        );

        thMenu.style.left = clampedLeft + "px";
        thMenu.style.top = clampedTop + "px";

        thMenuQ.focus();
      });
    }

    const runsRoot =
      table.closest(".game-shell") ||
      table.closest(".page-width") ||
      document;

    runsRoot.querySelectorAll("[data-filter-btn]").forEach((btn) => {
      const col = btn.getAttribute("data-filter-btn");
      if (col !== "challenge" && col !== "restrictions") return;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (thMenu && !thMenu.hidden && thActiveCol === col) {
          closeThMenu();
          return;
        }

        openThMenuFor(col, btn);
      });
    });

    if (thMenuQ) thMenuQ.addEventListener("input", renderThMenuList);

    if (thMenuClear) {
      thMenuClear.addEventListener("click", () => {
        if (!thActiveCol) return;
        const set = getSetForCol(thActiveCol);
        if (!set) return;

        set.clear();
        render();
        renderThMenuList();
      });
    }

    if (thMenuClose) thMenuClose.addEventListener("click", closeThMenu);

    document.addEventListener(
      "pointerdown",
      (e) => {
        if (!thMenu || thMenu.hidden) return;
        if (thMenu.contains(e.target)) return;

        const isCaret =
          e.target && e.target.closest && e.target.closest("[data-filter-btn]");
        if (isCaret) return;

        closeThMenu();
      },
      true
    );

    window.addEventListener("resize", () => {
      if (thMenu && !thMenu.hidden) closeThMenu();
    });

    if (thSortAsc) {
      thSortAsc.addEventListener("click", () => {
        dateSortDir = "asc";
        updateDateSortButtons();
        render();
      });
    }

    if (thSortDesc) {
      thSortDesc.addEventListener("click", () => {
        dateSortDir = "desc";
        updateDateSortButtons();
        render();
      });
    }

    if (q) q.addEventListener("input", render);
    if (limitEl) limitEl.addEventListener("change", render);

    updateDateSortButtons();
    updateTopButtonLabels();
    render();
  }

// =========================================================
// Game tabs navigation helper
// Saves scroll before navigating (works for data-href tabs AND <a href> tabs)
// =========================================================
function initGameTabsNav() {
  const root = document.getElementById("game-tabs");
  if (!root) return;

  root.addEventListener("click", (e) => {
    // Only normal left-click navigation
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const tab = e.target && e.target.closest ? e.target.closest(".tab") : null;
    if (tab) {
      const dataHref = tab.getAttribute("data-href");
      if (dataHref) {
        e.preventDefault();
        saveGameScroll();
        window.location.href = dataHref;
        return;
      }
    }

    const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;

    if (!root.contains(a)) return;

    if (a.target && a.target !== "_self") return;

    saveGameScroll();
  });
}

  document.addEventListener("DOMContentLoaded", () => {
    restoreGameScroll();
    document.querySelectorAll(".list-paged").forEach(initPagedList);
    initRunsTable();
    initGameTabsNav();
  });
})();
