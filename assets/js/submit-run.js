(async function () {
  const $ = (id) => document.getElementById(id);

  const msgEl = $("msg");
  const previewEl = $("preview");

  function setMsg(text, isError = false) {
    msgEl.textContent = text;
    msgEl.style.color = isError ? "var(--danger, #ff6b6b)" : "";
  }

  function qs(name) {
    const u = new URL(window.location.href);
    return u.searchParams.get(name) || "";
  }

  function normalizeYouTubeId(url) {
    // Returns { ok, id, reason }
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, "").toLowerCase();

      if (host === "youtu.be") {
        const id = u.pathname.replace("/", "").trim();
        if (!id) return { ok: false, reason: "Missing video id." };
        return { ok: true, id };
      }

      if (host === "youtube.com" || host === "m.youtube.com") {
        const v = u.searchParams.get("v");
        if (v) return { ok: true, id: v.trim() };

        // handle /shorts/<id>
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts[0] === "shorts" && parts[1]) return { ok: true, id: parts[1].trim() };

        return { ok: false, reason: "Unsupported YouTube URL format." };
      }

      return { ok: false, reason: "Only YouTube links are allowed right now." };
    } catch {
      return { ok: false, reason: "Invalid URL." };
    }
  }

  async function loadIndex() {
    const res = await fetch("/assets/generated/form-index.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load form index JSON.");
    return res.json();
  }

  function fillSelect(selectEl, items, getValue, getLabel) {
    selectEl.innerHTML = "";
    for (const item of items) {
      const opt = document.createElement("option");
      opt.value = getValue(item);
      opt.textContent = getLabel(item);
      selectEl.appendChild(opt);
    }
  }

  function buildPayload(index) {
    const game_id = $("gameSelect").value.trim();
    const category_slug = $("categorySelect").value.trim();
    const challenge_id = $("challengeSelect").value.trim();
    const runner_id = $("runnerId").value.trim();
    const video_url = $("videoUrl").value.trim();
    const date_completed = $("dateCompleted").value;

    const yt = normalizeYouTubeId(video_url);

    const payload = {
      kind: "run_submission",
      game_id,
      category_slug,
      challenge_id,
      runner_id,
      video_url: yt.ok ? `https://www.youtube.com/watch?v=${yt.id}` : video_url,
      video_id: yt.ok ? yt.id : "",
      date_completed,
      submitted_at: new Date().toISOString(),
      source: "site_form",
      schema_version: 1
    };

    previewEl.textContent = JSON.stringify(payload, null, 2);

    return { payload, yt };
  }

  function validatePayload(payload, yt) {
    if (!payload.game_id) return "Missing game.";
    if (!payload.category_slug) return "Missing category.";
    if (!payload.challenge_id) return "Missing challenge.";
    if (!payload.runner_id) return "Missing runner id.";
    if (!payload.video_url) return "Missing video URL.";
    if (!yt.ok) return yt.reason || "Invalid YouTube URL.";
    if (!payload.date_completed) return "Missing completed date.";
    return "";
  }

  const index = await loadIndex();

  const gameSelect = $("gameSelect");
  const categorySelect = $("categorySelect");
  const challengeSelect = $("challengeSelect");
  const gameSearch = $("gameSearch");

  function getGameById(id) {
    return index.games.find((g) => g.game_id === id) || null;
  }

  function populateGames(filterText = "") {
    const q = filterText.trim().toLowerCase();
    const list = q
      ? index.games.filter((g) => g.title.toLowerCase().includes(q) || g.game_id.toLowerCase().includes(q))
      : index.games;

    fillSelect(
      gameSelect,
      list,
      (g) => g.game_id,
      (g) => `${g.title} (${g.game_id})`
    );

    const pre = qs("game");
    if (pre) {
      const exists = list.some((g) => g.game_id === pre);
      if (exists) gameSelect.value = pre;
    }
  }

  function populateCategories() {
    const game = getGameById(gameSelect.value);
    const cats = (game && game.categories) ? game.categories : [];
    fillSelect(categorySelect, cats, (c) => c.slug, (c) => c.name);
  }

  function populateChallenges() {
    const game = getGameById(gameSelect.value);
    const allowed = game && Array.isArray(game.allowed_challenges) ? game.allowed_challenges : null;

    const list = allowed
      ? index.challenges.filter((c) => allowed.includes(c.id))
      : index.challenges;

    fillSelect(challengeSelect, list, (c) => c.id, (c) => c.name);
  }

  gameSearch.addEventListener("input", () => {
    populateGames(gameSearch.value);
    populateCategories();
    populateChallenges();
    const { payload } = buildPayload(index);
    setMsg(`Loaded ${payload.game_id}`, false);
  });

  gameSelect.addEventListener("change", () => {
    populateCategories();
    populateChallenges();
    buildPayload(index);
    setMsg("", false);
  });

  ["categorySelect", "challengeSelect", "runnerId", "videoUrl", "dateCompleted"].forEach((id) => {
    $(id).addEventListener("input", () => buildPayload(index));
    $(id).addEventListener("change", () => buildPayload(index));
  });

  $("btnCopy").addEventListener("click", async () => {
    const { payload, yt } = buildPayload(index);
    const err = validatePayload(payload, yt);
    if (err) return setMsg(err, true);

    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setMsg("Copied payload to clipboard.", false);
  });

  $("btnSubmit").addEventListener("click", async (e) => {
    e.preventDefault();
    const { payload, yt } = buildPayload(index);
    const err = validatePayload(payload, yt);
    if (err) return setMsg(err, true);

    // If you later add a webhook endpoint, set it here:
    // window.CRC_RUN_SUBMIT_ENDPOINT = "https://...";
    const endpoint = window.CRC_RUN_SUBMIT_ENDPOINT;

    if (!endpoint) {
      setMsg("No submit endpoint configured yet. Copy the payload and submit via your current intake path.", false);
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Submit failed (${res.status}). ${t}`.trim());
      }

      setMsg("Submitted successfully.", false);
    } catch (ex) {
      setMsg(String(ex.message || ex), true);
    }
  });

  // Initial paint
  populateGames("");
  populateCategories();
  populateChallenges();
  buildPayload(index);
  setMsg("Ready.", false);
})();
