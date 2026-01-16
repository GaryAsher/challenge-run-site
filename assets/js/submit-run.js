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
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, "").toLowerCase();

      if (host === "youtu.be") {
        const id = u.pathname.replace("/", "").trim();
        if (!id) return { ok: false, reason: "Missing YouTube video id." };
        return { ok: true, host: "youtube", id, canonical_url: `https://www.youtube.com/watch?v=${id}` };
      }

      if (host === "youtube.com" || host === "m.youtube.com") {
        const v = (u.searchParams.get("v") || "").trim();
        if (v) return { ok: true, host: "youtube", id: v, canonical_url: `https://www.youtube.com/watch?v=${v}` };

        const parts = u.pathname.split("/").filter(Boolean);
        if (parts[0] === "shorts" && parts[1]) {
          const id = parts[1].trim();
          return { ok: true, host: "youtube", id, canonical_url: `https://www.youtube.com/watch?v=${id}` };
        }

        return { ok: false, reason: "Unsupported YouTube URL format." };
      }

      if (host === "twitch.tv" || host === "m.twitch.tv") {
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts[0] === "videos" && parts[1]) {
          const id = parts[1].trim();
          return { ok: true, host: "twitch", id, canonical_url: `https://www.twitch.tv/videos/${id}` };
        }
        return { ok: false, reason: "Twitch link must look like twitch.tv/videos/<id>." };
      }

      if (host === "player.twitch.tv") {
        let v = (u.searchParams.get("video") || "").trim();
        if (v.startsWith("v")) v = v.slice(1);
        if (!v) return { ok: false, reason: "Twitch player link missing video id." };
        return { ok: true, host: "twitch", id: v, canonical_url: `https://www.twitch.tv/videos/${v}` };
      }

      if (host === "bilibili.com" || host === "m.bilibili.com" || host === "www.bilibili.com") {
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts[0] === "video" && parts[1]) {
          const id = parts[1].trim();
          return { ok: true, host: "bilibili", id, canonical_url: `https://www.bilibili.com/video/${id}` };
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

  function fillSelect(selectEl, items, getValue, getLabel, includeBlank = true, blankLabel = "Select...") {
    selectEl.innerHTML = "";
    if (includeBlank) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = blankLabel;
      selectEl.appendChild(opt);
    }
    for (const item of items) {
      const opt = document.createElement("option");
      opt.value = getValue(item);
      opt.textContent = getLabel(item);
      selectEl.appendChild(opt);
    }
  }

  function fillMultiSelect(selectEl, items, getValue, getLabel) {
    selectEl.innerHTML = "";
    for (const item of items) {
      const opt = document.createElement("option");
      opt.value = getValue(item);
      opt.textContent = getLabel(item);
      selectEl.appendChild(opt);
    }
  }

  function getSelectedMulti(selectEl) {
    return Array.from(selectEl.selectedOptions).map((o) => o.value).filter(Boolean);
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
  const characterLabelEl = $("characterLabel"); // label element for character box

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

  function populateChallengeBoxes() {
    const game = getGameById(gameSelect.value);

    const standard = game && Array.isArray(game.standard_challenges) ? game.standard_challenges : [];
    const community = game && Array.isArray(game.community_challenges) ? game.community_challenges : [];
    const glitches = game && Array.isArray(game.glitches) ? game.glitches : [];
    const restrictions = game && Array.isArray(game.restrictions) ? game.restrictions : [];

    // Character
    const cc = game && game.character_column ? game.character_column : { enabled: false, label: "Character" };
    const chars = game && Array.isArray(game.characters) ? game.characters : [];

    // Update label text to match the game (Weapon / Aspect for Hades II)
    if (characterLabelEl) characterLabelEl.textContent = cc.label || "Character";

    // Standard challenge box
    fillSelect(standardChallengeSelect, standard, (c) => c.id, (c) => c.name, true, "None");

    // Community challenge box
    fillSelect(communityChallengeSelect, community, (c) => c.id, (c) => c.name, true, "None");

    // Glitches box
    fillSelect(glitchSelect, glitches, (c) => c.id, (c) => c.name, true, "None");

    // Restrictions box (multi)
    fillMultiSelect(restrictionsSelect, restrictions, (c) => c.id, (c) => c.name);

    // Character box
    if (cc && cc.enabled) {
      characterSelect.disabled = false;
      characterSelect.parentElement && (characterSelect.parentElement.style.display = "");
      fillSelect(characterSelect, chars, (c) => c.id, (c) => c.name, true, "Any");
    } else {
      // Hide/disable if not enabled for this game
      characterSelect.value = "";
      characterSelect.disabled = true;
      if (characterSelect.parentElement) characterSelect.parentElement.style.display = "none";
    }

    // Reset conflicts when switching games
    standardChallengeSelect.value = "";
    communityChallengeSelect.value = "";
  }

  function buildPayload() {
    const game_id = $("gameSelect").value.trim();
    const category_slug = $("categorySelect").value.trim();

    const standard_id = standardChallengeSelect.value.trim();
    const community_id = communityChallengeSelect.value.trim();

    // Exactly one of these can be chosen (adjust if you want a different rule)
    let challenge_id = "";
    let challenge_group = "";

    if (standard_id) {
      challenge_id = standard_id;
      challenge_group = "standard";
    }
    if (community_id) {
      // If both selected, leave handling to validation
      challenge_id = community_id;
      challenge_group = "community";
    }

    const glitch_id = glitchSelect.value.trim();
    const restrictions = getSelectedMulti(restrictionsSelect);

    const character = characterSelect && !characterSelect.disabled ? characterSelect.value.trim() : "";

    const runner_id = $("runnerId").value.trim();
    const video_url_raw = $("videoUrl").value.trim();
    const date_completed = $("dateCompleted").value;

    const v = parseVideo(video_url_raw);

    const payload = {
      kind: "run_submission",
      game_id,
      category_slug,
      challenge_id,
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
      schema_version: 3
    };

    previewEl.textContent = JSON.stringify(payload, null, 2);

    return { payload, v, standard_id, community_id };
  }

  function validatePayload(payload, v, standard_id, community_id) {
    if (!payload.game_id) return "Missing game.";
    if (!payload.category_slug) return "Missing category.";
    if (!payload.runner_id) return "Missing runner id.";
    if (!payload.video_url) return "Missing video URL.";
    if (!v.ok) return v.reason || "Invalid video URL.";
    if (!payload.date_completed) return "Missing completed date.";

    if (standard_id && community_id) return "Pick either a Standard Challenge or a Community Challenge, not both.";
    if (!standard_id && !community_id) return "Pick a Standard Challenge or a Community Challenge.";

    return "";
  }

  function repaint() {
    const { payload } = buildPayload();
    setMsg(payload.game_id ? `Loaded ${payload.game_id}` : "", false);
  }

  // Events
  gameSearch.addEventListener("input", () => {
    populateGames(gameSearch.value);
    populateCategories();
    populateChallengeBoxes();
    repaint();
  });

  gameSelect.addEventListener("change", () => {
    populateCategories();
    populateChallengeBoxes();
    repaint();
  });

  [
    "categorySelect",
    "runnerId",
    "videoUrl",
    "dateCompleted"
  ].forEach((id) => {
    $(id).addEventListener("input", repaint);
    $(id).addEventListener("change", repaint);
  });

  [
    standardChallengeSelect,
    communityChallengeSelect,
    characterSelect,
    glitchSelect,
    restrictionsSelect
  ].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", repaint);
    el.addEventListener("change", repaint);
  });

  $("btnCopy").addEventListener("click", async () => {
    const { payload, v, standard_id, community_id } = buildPayload();
    const err = validatePayload(payload, v, standard_id, community_id);
    if (err) return setMsg(err, true);

    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setMsg("Copied payload to clipboard.", false);
  });

  $("btnSubmit").addEventListener("click", async (e) => {
    e.preventDefault();
    const { payload, v, standard_id, community_id } = buildPayload();
    const err = validatePayload(payload, v, standard_id, community_id);
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
