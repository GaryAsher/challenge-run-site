// =========================================================
// Client-side pagination for any .list-paged block
// =========================================================
(function () {
  function initPagedList(root) {
    const pageSize = parseInt(root.getAttribute("data-page-size") || "25", 10);
    const items = Array.from(root.querySelectorAll(".list-item"));

    const btnPrev = root.querySelector("[data-prev]");
    const btnNext = root.querySelector("[data-next]");
    const statusEl = root.querySelector("[data-status]");
    const pageLabelEl = root.querySelector("[data-page-label]");
    const pagesWrap = root.querySelector("[data-pages]");

    // If you have multiple lists on one page, give each wrapper an id.
    // Otherwise they’ll share the same ?page= param.
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

      // Render numbered pages
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

    // Wire buttons
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

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".list-paged").forEach(initPagedList);
  });
})();
