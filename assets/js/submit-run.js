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

  function parseVideo(url) {
    // Returns { ok, host, id, canonical_url, reason }
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, "").toLowerCase();

      // YouTube
      if (host === "youtu.be") {
        const id = u.pathname.replace("/", "").trim();
        if (!id) return { ok: false, reason: "Missing YouTube video id." };
        return {
          ok: true,
          host: "youtube",
          id,
          canonical_url: `https://www.youtube.com/watch?v=${id}`
        };
      }

      if (host === "youtube.com" || host === "m.youtube.com") {
        const v = (u.searchParams.get("v") || "").trim();
        if (v) {
          return {
            ok: true,
            host: "youtube",
            id: v,
            canonical_url: `https://www.youtube.com/watch?v=${v}`
          };
        }

        const parts = u.pathname.split("/").filter(Boolean);
        if (parts[0] === "shorts" && parts[1]) {
          const id = parts[1].trim();
          return {
            ok: true,
            host: "youtube",
            id,
            canonical_url: `https://www.youtube.com/watch?v=${id}`
          };
        }

        return { ok: false, reason: "Unsupported YouTube URL format." };
      }

      // Twitch VODs
      if (host === "twitch.tv" || host === "m.twitch.tv") {
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts[0] === "videos" && parts[1]) {
          const id = parts[1].trim();
          return {
            ok: true,
            host: "twitch",
            id,
            canonical_url: `https://www.twitch.tv/videos/${id}`
          };
        }
        return { ok: false, reason: "Twitch link must look like twitch.tv/videos/<id>." };
      }

      if (host === "player.twitch.tv") {
        let v = (u.searchParams.get("video") || "").trim();
        if (v.startsWith("v")) v = v.slice(1);
        if (!v) return { ok: false, reason: "Twitch player link missing video id." };
        return {
          ok: true,
          host: "twitch",
          id: v,
          canonical_url: `https://www.twitch.tv/videos/${v}`
        };
      }

      // bilibili
      if (host === "bilibili.com" || host === "m.bilibili.com" || host === "www.bilibili.com") {
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts[0] === "video" && parts[1]) {
          const id = parts[1].trim();
          return {
            ok: true,
            host: "bilibili",
            id,
            canonical_url: `https://www.bilibili.com/video/${id}`
          };
        }
        return { ok: false, reason: "bilibili link must look like bilibili.com/video/<BV... or av...>." };
      }

      return { ok: false, reason: "Only YouTube, Twitch VODs, and bilibili are allowed right now." };
    } catch {
      return { ok: false, reason: "Invalid URL." };
    }
  }

  async function loadIndex() {
    const url = window.CRC_FORM_INDEX_URL || "/assets/generated/form-index.json";
    const res = await fetch(url, { cache: "no-store" });
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

  function fillSelectGrouped(selectEl, items, groupKey, getValue, getLabel) {
    selectEl.innerHTML = "";

    // Group items
    const groups = new Map();
    for (const item of items) {
      const g = String(item[groupKey] || "").trim() || "Other";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(item);
    }

    // Preserve a preferred order
    const preferred = [
      "Standard Challenges",
      "Community Challenges",
      "Character",
      "Glitches",
      "Restrictions",
      "Other"
    ];

    const orderedGroupNames = [
      ...preferred.filter((g) => groups.has(g)),
      ...Array.from(groups.keys()).filter((g) => !preferred.includes(g))
    ];

    for (const groupName of orderedGroupNames) {
      const optgroup = document.createElement("optgroup");
      optgroup.label = groupName;

      for (const item of groups.get(groupName)) {
        const opt = document.createElement("option");
        opt.value = getValue(item);
        opt.textContent = getLabel(item);
        optgroup.appendChild(opt);
      }

      selectEl.appendChild(optgroup);
    }
  }

  function buildPayload(index) {
    const game_id = $("gameSelect").value.trim();
    const category_slug = $("categorySelect").value.trim();
    const challenge_id = $("challengeSelect").value.trim();
    const runner_id = $("runnerId").value.trim();
    const video_url_raw = $("videoUrl").value.trim();
    const date_completed = $("dateCompleted").value;

    const v = parseVideo(video_url_raw);

    const payload = {
      kind: "run_submission",
      game_id,
      category_slug,
      challenge_id,
      runner_id,
      video_url: v.ok ? v.canonical_url : video_url_raw,
      video_host: v.ok ? v.host : "",
      video_id: v.ok ? v.id : "",
      date_completed,
      submitted_at: new Date().toISOString(),
      source: "site_form",
      schema_version: 2
    };

    previewEl.textContent = JSON.stringify(payload, null, 2);

    return { payload, v };
  }

  function validatePayload(payload, v) {
    if (!payload.game_id) return "Missing game.";
    if (!payload.category_slug) return "Missing category.";
    if (!payload.challenge_id) return "Missing challenge.";
    if (!payload.runner_id) return "Missing runner id.";
    if (!payload.video_url) return "Missing video URL.";
    if (!v.ok) return v.reason || "Invalid video URL.";
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
    const cats = game && Array.isArray(game.categories) ? game.categories : [];
    fillSelect(categorySelect, cats, (c) => c.slug, (c) => c.name);
  }

  function populateChallenges() {
    const game = getGameById(gameSelect.value);

    // Prefer per-game list, else fall back to global list
    const base =
      game && Array.isArray(game.challenges) && game.challenges.length
        ? game.challenges
        : index.challenges;

    const out = base.map((c) => ({
      id: c.id,
      name: c.name,
      group: c.group || "Other"
    }));

    if (game && game.character_column && game.character_column.enabled) {
      out.unshift({
        id: "__character__",
        name: `Set ${game.character_column.label}`,
        group: "Character"
      });
    }

    fillSelectGrouped(
      challengeSelect,
      out,
      "group",
      (c) => c.id,
      (c) => c.name
    );
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
    const { payload, v } = buildPayload(index);
    const err = validatePayload(payload, v);
    if (err) return setMsg(err, true);

    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setMsg("Copied payload to clipboard.", false);
  });

  $("btnSubmit").addEventListener("click", async (e) => {
    e.preventDefault();
    const { payload, v } = buildPayload(index);
    const err = validatePayload(payload, v);
    if (err) return setMsg(err, true);

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
