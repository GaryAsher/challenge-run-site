// =========================================================
// Client-side pagination for any .list-paged block
// + Runs table filtering (Search + Header filters + Date sort + Limit)
// =========================================================
(function () {
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

    // New toolbar button labels + active filter chips
    const btnCat = document.getElementById("filter-category");
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
      const cats = [];
      const catLabelById = new Map();

      const chIds = [];
      const chLabelById = new Map();

      const restrictionsRaw = [];

      rows.forEach((row) => {
        const catId = norm(row.dataset.category);
        const chId = norm(row.dataset.challengeId);

        const chLabel = (row.dataset.challengeLabel || "").toString().trim();
        const resRaw = parseRestrictionsRaw(row);

        if (catId) {
          cats.push(catId);
          if (!catLabelById.has(catId)) {
            const cell = row.children[1];
            if (cell) catLabelById.set(catId, cell.textContent.trim());
          }
        }

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
        categories: toList(cats, catLabelById),
        challenges: toList(chIds, chLabelById),
        restrictions: toList(restrictionsRaw)
      };
    }

    const OPTIONS = buildOptions();

    const activeCats = new Set();
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
    }

    function getSetForCol(col) {
      if (col === "category") return activeCats;
      if (col === "challenge") return activeChallenges;
      if (col === "restrictions") return activeRestrictions;
      return null;
    }

    function getOptionsForCol(col) {
      if (col === "category") return OPTIONS.categories;
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
      if (btnCat) {
        btnCat.textContent = activeCats.size
          ? `Category (${activeCats.size}) ▾`
          : "Category ▾";
      }
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

      activeCats.forEach((id) => {
        chips.push({ col: "category", id, label: getLabelFor("category", id) });
      });

      activeChallenges.forEach((id) => {
        chips.push({ col: "challenge", id, label: getLabelFor("challenge", id) });
      });

      activeRestrictions.forEach((id) => {
        chips.push({
          col: "restrictions",
          id,
          label: getLabelFor("restrictions", id)
        });
      });

      if (!chips.length) return;

      function makeChip(text, onRemove) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "tag";
        b.style.cursor = "pointer";
        b.textContent = text + " ×";
        b.addEventListener("click", onRemove);
        return b;
      }

      chips.forEach((c) => {
        const chip = makeChip(
          `${c.col === "category" ? "Category" : c.col === "challenge" ? "Challenge" : "Restrictions"}: ${c.label}`,
          () => {
            const set = getSetForCol(c.col);
            if (!set) return;
            set.delete(c.id);
            render();
          }
        );
        activeFiltersWrap.appendChild(chip);
      });

      const clearAll = document.createElement("button");
      clearAll.type = "button";
      clearAll.className = "btn";
      clearAll.textContent = "Clear All";
      clearAll.addEventListener("click", () => {
        activeCats.clear();
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

      const cat = norm(row.dataset.category);
      const ch = norm(row.dataset.challengeId);

      const resRaw = parseRestrictionsRaw(row);
      const resNorm = resRaw.map(norm);

      if (activeCats.size && !activeCats.has(cat)) return false;
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

      const filtered = list.filter((x) => {
        if (!qv) return true;
        return norm(x.label).includes(qv) || norm(x.id).includes(qv);
      });

      if (!filtered.length) {
        const empty = document.createElement("div");
        empty.className = "th-menu__empty muted";
        empty.textContent = "No matches.";
        thMenuList.appendChild(empty);
        return;
      }

      filtered.slice(0, 250).forEach((x) => {
        const lab = document.createElement("label");
        lab.className = "th-menu__item";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = set.has(x.id);

        cb.addEventListener("change", () => {
          if (cb.checked) set.add(x.id);
          else set.delete(x.id);
          render();
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

    // Scope filter buttons to the runs card/table area so other pages don't trigger
    const runsRoot = document.getElementById("runs-list") || table.closest(".page-width") || document;

    runsRoot.querySelectorAll("[data-filter-btn]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const col = btn.getAttribute("data-filter-btn");

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
  // Game tabs navigation helper (Overview/Categories click on runs page)
  // =========================================================
  function initGameTabsNav() {
    const root = document.getElementById("game-tabs");
    if (!root) return;

    const overview = root.querySelector('.tab[data-tab="overview"]');
    const categories = root.querySelector('.tab[data-tab="categories"]');

    if (overview) {
      overview.addEventListener("click", () => {
        const href = overview.getAttribute("data-href");
        if (href) window.location.href = href;
      });
    }

    if (categories) {
      categories.addEventListener("click", () => {
        const href = categories.getAttribute("data-href");
        if (href) window.location.href = href;
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".list-paged").forEach(initPagedList);
    initRunsTable();
    initGameTabsNav();
  });
})();
