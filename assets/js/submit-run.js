(async function () {
  const $ = (id) => document.getElementById(id);

  const msgEl = $("msg");
  const previewEl = $("preview");

  function setMsg(text, isError = false) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.style.color = isError ? "var(--danger, #ff6b6b)" : "";
  }

  function qs(name) {
    const u = new URL(window.location.href);
    return u.searchParams.get(name) || "";
  }

  function parseVideo(url) {
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
      if (host === "bilibili.com" || host === "m.bilibili.com") {
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

  // Simple select fill with an optional blank placeholder
  function fillSelect(selectEl, items, getValue, getLabel, includeBlank, blankLabel) {
    if (!selectEl) return;
    selectEl.innerHTML = "";

    if (includeBlank) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = blankLabel || "Select...";
      selectEl.appendChild(opt);
    }

    for (const item of items) {
      const opt = document.createElement("option");
      opt.value = getValue(item);
      opt.textContent = getLabel(item);
      selectEl.appendChild(opt);
    }
  }

  // Chip-style multi-picker
  function createChipMultiPicker(opts) {
    const {
      selectEl,
      chipsEl,
      placeholderLabel = "Select...",
      noneLabel = "None"
    } = opts;

    let all = []; // [{id,name}]
    const selected = new Map(); // id -> {id,name}

    function renderSelect() {
      if (!selectEl) return;

      const available = all.filter((it) => it && it.id && !selected.has(it.id));

      fillSelect(
        selectEl,
        available,
        (it) => it.id,
        (it) => it.name,
        true,
        available.length ? placeholderLabel : noneLabel
      );

      // Always reset to placeholder after picking
      selectEl.value = "";
      selectEl.disabled = available.length === 0;
    }

    function renderChips() {
      if (!chipsEl) return;
      chipsEl.innerHTML = "";

      const items = Array.from(selected.values());
      if (!items.length) return;

      for (const it of items) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip";
        btn.dataset.id = it.id;
        btn.textContent = it.name;

        // Click chip to remove and return option to dropdown
        btn.addEventListener("click", () => {
          selected.delete(it.id);
          renderChips();
          renderSelect();
          opts.onChange && opts.onChange();
        });

        chipsEl.appendChild(btn);
      }
    }

    function setItems(items) {
      all = Array.isArray(items) ? items.slice() : [];
      selected.clear();
      renderSelect();
      renderChips();
    }

    function setSelected(ids) {
      selected.clear();
      for (const id of ids || []) {
        const found = all.find((x) => x && x.id === id);
        if (found) selected.set(found.id, found);
      }
      renderSelect();
      renderChips();
    }

    function getSelectedIds() {
      return Array.from(selected.keys());
    }

    function clear() {
      selected.clear();
      renderSelect();
      renderChips();
    }

    // When user picks from dropdown, convert into chip and remove from dropdown
    if (selectEl) {
      selectEl.addEventListener("change", () => {
        const id = String(selectEl.value || "").trim();
        if (!id) return;
        const found = all.find((x) => x && x.id === id);
        if (!found) return;

        selected.set(found.id, found);
        renderChips();
        renderSelect();
        opts.onChange && opts.onChange();
      });
    }

    return { setItems, setSelected, getSelectedIds, clear };
  }

  const index = await loadIndex();

  const gameSelect = $("gameSelect");
  const categorySelect = $("categorySelect");
  const gameSearch = $("gameSearch");

  const standardChallengeSelect = $("standardChallengeSelect");
  const communityChallengeSelect = $("communityChallengeSelect");
  const characterSelect = $("characterSelect");
  const glitchSelect = $("glitchSelect");
  const restrictionsSelect = $("restrictionsSelect");
  const characterLabelEl = $("characterLabel");

  const standardChipsEl = $("standardChallengeChips");
  const restrictionsChipsEl = $("restrictionsChips");

  const standardPicker = createChipMultiPicker({
    selectEl: standardChallengeSelect,
    chipsEl: standardChipsEl,
    placeholderLabel: "Select a standard challenge...",
    noneLabel: "No standard challenges",
    onChange: repaint
  });

  const restrictionsPicker = createChipMultiPicker({
    selectEl: restrictionsSelect,
    chipsEl: restrictionsChipsEl,
    placeholderLabel: "Select a restriction...",
    noneLabel: "No restrictions",
    onChange: repaint
  });

  function getGameById(id) {
    return index.games.find((g) => g.game_id === id) || null;
  }

  function populateGames(filterText = "") {
    const q = filterText.trim().toLowerCase();
    const list = q
      ? index.games.filter((g) => g.title.toLowerCase().includes(q) || g.game_id.toLowerCase().includes(q))
      : index.games;

    // game select should not have blank option
    fillSelect(
      gameSelect,
      list,
      (g) => g.game_id,
      (g) => `${g.title} (${g.game_id})`,
      false
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
    fillSelect(categorySelect, cats, (c) => c.slug, (c) => c.name, true, "Select category...");
  }

  function normalizeList(list) {
    if (!Array.isArray(list)) return [];
    return list
      .map((x) => ({
        id: String(x?.id || x?.slug || x?.challenge_id || "").trim(),
        name: String(x?.name || x?.label || x?.title || x?.id || x?.slug || "").trim()
      }))
      .filter((x) => x.id && x.name);
  }

  function populateChallengeBoxes() {
    const game = getGameById(gameSelect.value);

    const standard = normalizeList(game && game.standard_challenges);
    const community = normalizeList(game && game.community_challenges);
    const glitches = normalizeList(game && game.glitches);
    const restrictions = normalizeList(game && game.restrictions);

    // Character
    const cc = game && game.character_column ? game.character_column : { enabled: false, label: "Character" };
    const chars = normalizeList(game && game.characters);

    if (characterLabelEl) characterLabelEl.textContent = (cc && cc.label) ? cc.label : "Character";

    // Standard and restrictions are now chip-pickers
    standardPicker.setItems(standard);
    restrictionsPicker.setItems(restrictions);

    // Community is still single-select
    fillSelect(communityChallengeSelect, community, (c) => c.id, (c) => c.name, true, "None");

    // Glitches is still single-select
    fillSelect(glitchSelect, glitches, (c) => c.id, (c) => c.name, true, "None");

    // Character box
    if (cc && cc.enabled) {
      if (characterSelect) {
        characterSelect.disabled = false;
        if (characterSelect.parentElement) characterSelect.parentElement.style.display = "";
        fillSelect(characterSelect, chars, (c) => c.id, (c) => c.name, true, "Any");
      }
    } else {
      if (characterSelect) {
        characterSelect.value = "";
        characterSelect.disabled = true;
        if (characterSelect.parentElement) characterSelect.parentElement.style.display = "none";
      }
    }

    // Reset single-selects when switching games
    if (communityChallengeSelect) communityChallengeSelect.value = "";
    if (glitchSelect) glitchSelect.value = "";

    // Chip pickers reset automatically via setItems()
  }

  function buildPayload() {
    const game_id = (gameSelect?.value || "").trim();
    const category_slug = (categorySelect?.value || "").trim();

    const standard_ids = standardPicker.getSelectedIds();
    const community_id = (communityChallengeSelect?.value || "").trim();

    // Mutual exclusivity: if community picked, standard should be empty and vice versa
    let challenge_group = "";
    if (community_id) challenge_group = "community";
    else if (standard_ids.length) challenge_group = "standard";

    const glitch_id = (glitchSelect?.value || "").trim();
    const restrictions = restrictionsPicker.getSelectedIds();

    const character = characterSelect && !characterSelect.disabled ? (characterSelect.value || "").trim() : "";

    const runner_id = ($("runnerId")?.value || "").trim();
    const video_url_raw = ($("videoUrl")?.value || "").trim();
    const date_completed = $("dateCompleted")?.value || "";

    const v = parseVideo(video_url_raw);

    const payload = {
      kind: "run_submission",
      game_id,
      category_slug,

      // New shape:
      standard_challenges: standard_ids,   // array
      community_challenge: community_id,   // single

      challenge_group,

      character,
      glitch_id,
      restrictions,

      runner_id,

      video_url: v.ok ? v.canonical_url : video_url_raw,
      video_host: v.ok ? v.host : "",
      video_id: v.ok ? v.id : "",

      date_completed,
      submitted_at: new Date().toISOString(),
      source: "site_form",
      schema_version: 4
    };

    if (previewEl) previewEl.textContent = JSON.stringify(payload, null, 2);

    return { payload, v, standard_ids, community_id };
  }

  function validatePayload(payload, v, standard_ids, community_id) {
    if (!payload.game_id) return "Missing game.";
    if (!payload.category_slug) return "Missing category.";
    if (!payload.runner_id) return "Missing runner id.";
    if (!payload.video_url) return "Missing video URL.";
    if (!v.ok) return v.reason || "Invalid video URL.";
    if (!payload.date_completed) return "Missing completed date.";

    if (standard_ids.length && community_id) return "Pick either Standard Challenges or a Community Challenge, not both.";
    if (!standard_ids.length && !community_id) return "Pick at least one Standard Challenge or a Community Challenge.";

    return "";
  }

  function repaint() {
    const { payload } = buildPayload();
    setMsg(payload.game_id ? `Loaded ${payload.game_id}` : "", false);
  }

  // Events
  if (gameSearch) {
    gameSearch.addEventListener("input", () => {
      populateGames(gameSearch.value);
      populateCategories();
      populateChallengeBoxes();
      repaint();
    });
  }

  if (gameSelect) {
    gameSelect.addEventListener("change", () => {
      populateCategories();
      populateChallengeBoxes();
      repaint();
    });
  }

  [
    "categorySelect",
    "runnerId",
    "videoUrl",
    "dateCompleted"
  ].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", repaint);
    el.addEventListener("change", repaint);
  });

  // Single selects that are not part of chip widgets
  [communityChallengeSelect, characterSelect, glitchSelect].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", repaint);
    el.addEventListener("change", repaint);
  });

  $("btnCopy")?.addEventListener("click", async () => {
    const { payload, v, standard_ids, community_id } = buildPayload();
    const err = validatePayload(payload, v, standard_ids, community_id);
    if (err) return setMsg(err, true);

    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setMsg("Copied payload to clipboard.", false);
  });

  $("btnSubmit")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const { payload, v, standard_ids, community_id } = buildPayload();
    const err = validatePayload(payload, v, standard_ids, community_id);
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
  populateChallengeBoxes();
  repaint();
  setMsg("Ready.", false);
})();
