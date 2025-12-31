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

    if (items.length === 0) {
      if (statusEl) statusEl.textContent = "No results.";
      if (btnPrev) btnPrev.disabled = true;
      if (btnNext) btnNext.disabled = true;
      return;
    }

    // If you have multiple lists on one page, give each wrapper an id.
    // Otherwise they’ll share the same ?page= param.
    const paramKey = root.id ? `${root.id}-page` : "page";

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

      const start = (safePage - 1) * pageSize;
      const end = start + pageSize;

      items.forEach((el, idx) => {
        el.style.display = idx >= start && idx < end ? "" : "none";
      });

      if (statusEl) {
        const shownStart = total === 0 ? 0 : start + 1;
        const shownEnd = Math.min(end, total);
        statusEl.textContent = `Showing ${shownStart}-${shownEnd} of ${total}`;
      }

      if (pageLabelEl) pageLabelEl.textContent = `Page ${safePage} / ${totalPages}`;

      if (btnPrev) btnPrev.disabled = safePage <= 1;
      if (btnNext) btnNext.disabled = safePage >= totalPages;

      setPageInUrl(safePage);
      root.setAttribute("data-page", String(safePage));
    }

    const initialPage = getPageFromUrl();
    render(initialPage);

    if (btnPrev) {
      btnPrev.addEventListener("click", () => {
        const cur = parseInt(root.getAttribute("data-page") || "1", 10);
        render(cur - 1);
        root.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    if (btnNext) {
      btnNext.addEventListener("click", () => {
        const cur = parseInt(root.getAttribute("data-page") || "1", 10);
        render(cur + 1);
        root.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".list-paged").forEach(initPagedList);
  });
})();
