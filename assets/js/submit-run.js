/* assets/js/submit-run.js
   Full replacement. No dependencies.
   Implements chip + typeahead pickers for:
   - Standard Challenges (multi)
   - Restrictions (multi)

   Features:
   - Inline field validation with error messages
   - Loading states for submit button
   - Caching for form-index.json (1 hour)
   - ARIA attributes for accessibility
   - Keyboard navigation support

   Contract:
   - Clicking a suggestion adds it (and removes it from the dropdown list).
   - Clicking a chip removes it (and returns it to the dropdown list).
   - Keeps hidden <select multiple> elements in sync for backwards compatibility.
*/

(async function () {
  const $ = (id) => document.getElementById(id);

  const msgEl = $("msg");
  const previewEl = $("preview");
  const btnSubmit = $("btnSubmit");
  const form = $("submitRunForm");

  // =============================================================================
  // Loading State Management
  // =============================================================================
  function setLoading(isLoading) {
    if (!btnSubmit) return;
    
    const textEl = btnSubmit.querySelector(".btn__text");
    const loadingEl = btnSubmit.querySelector(".btn__loading");
    
    if (isLoading) {
      btnSubmit.disabled = true;
      btnSubmit.classList.add("is-loading");
      if (textEl) textEl.hidden = true;
      if (loadingEl) loadingEl.hidden = false;
    } else {
      btnSubmit.disabled = false;
      btnSubmit.classList.remove("is-loading");
      if (textEl) textEl.hidden = false;
      if (loadingEl) loadingEl.hidden = true;
    }
  }

  // =============================================================================
  // Message Display
  // =============================================================================
  function setMsg(text, type = "info") {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = "submit-message";
    
    if (type === "error") {
      msgEl.classList.add("submit-message--error");
    } else if (type === "success") {
      msgEl.classList.add("submit-message--success");
    }
  }

  // =============================================================================
  // Inline Field Validation
  // =============================================================================
  function showFieldError(fieldId, message) {
    const errorEl = $(`${fieldId}-error`);
    const fieldEl = $(fieldId);
    
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
    
    if (fieldEl) {
      fieldEl.classList.add("has-error");
      fieldEl.setAttribute("aria-invalid", "true");
    }
  }

  function clearFieldError(fieldId) {
    const errorEl = $(`${fieldId}-error`);
    const fieldEl = $(fieldId);
    
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.hidden = true;
    }
    
    if (fieldEl) {
      fieldEl.classList.remove("has-error");
      fieldEl.removeAttribute("aria-invalid");
    }
  }

  function clearAllFieldErrors() {
    const errorFields = ["gameSelect", "categorySelect", "runnerId", "dateCompleted", "videoUrl"];
    errorFields.forEach(clearFieldError);
  }

  // =============================================================================
  // URL Utilities
  // =============================================================================
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

      // Twitch VODs
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

      // bilibili
      if (host === "bilibili.com" || host === "m.bilibili.com") {
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

  // =============================================================================
  // Data Loading with Caching (1 hour cache)
  // =============================================================================
  const CACHE_KEY = "crc_form_index";
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

  async function loadIndex() {
    const url = window.CRC_FORM_INDEX_URL || "/assets/generated/form-index.json";
    
    // Try to get from cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        if (age < CACHE_DURATION && data && data.games) {
          console.log("[CRC] Using cached form index");
          return data;
        }
      }
    } catch (e) {
      console.warn("[CRC] Cache read failed:", e);
    }

    // Fetch fresh data
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not load form index JSON.");
    const data = await res.json();

    // Store in cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      console.log("[CRC] Cached form index");
    } catch (e) {
      console.warn("[CRC] Cache write failed:", e);
    }

    return data;
  }

  // =============================================================================
  // Select Population Helpers
  // =============================================================================
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

  function normalizeList(list) {
    if (!Array.isArray(list)) return [];
    return list
      .map((x) => ({
        id: String(x?.id || x?.slug || x?.challenge_id || "").trim(),
        name: String(x?.name || x?.label || x?.title || x?.id || x?.slug || "").trim()
      }))
      .filter((x) => x.id && x.name);
  }

  function syncHiddenMultiSelect(selectEl, selectedIds) {
    if (!selectEl) return;
    const wanted = new Set((selectedIds || []).map((x) => String(x)));
    for (const opt of Array.from(selectEl.options)) {
      opt.selected = wanted.has(String(opt.value));
    }
  }

  function ensureHiddenSelectOptions(selectEl, allItems) {
    if (!selectEl) return;
    const existing = new Set(Array.from(selectEl.options).map((o) => String(o.value)));

    for (const it of allItems) {
      if (!existing.has(it.id)) {
        const opt = document.createElement("option");
        opt.value = it.id;
        opt.textContent = it.name;
        selectEl.appendChild(opt);
      }
    }
  }

  // =============================================================================
  // Typeahead Chip Picker (with ARIA support)
  // =============================================================================
  function createTypeaheadChipPicker(opts) {
    const {
      kind,
      inputEl,
      suggestionsEl,
      chipsEl,
      hiddenSelectEl,
      placeholder = "Type to search...",
      noneText = "No options",
      emptyText = "No matches",
      onChange
    } = opts;

    let all = [];
    const selected = new Map();

    function setItems(items) {
      all = Array.isArray(items) ? items.slice() : [];
      selected.clear();

      if (inputEl) inputEl.value = "";
      if (inputEl) inputEl.placeholder = placeholder;

      ensureHiddenSelectOptions(hiddenSelectEl, all);
      syncHiddenMultiSelect(hiddenSelectEl, getSelectedIds());

      renderChips();
      renderSuggestions();
      hideSuggestions();
    }

    function getSelectedIds() {
      return Array.from(selected.keys());
    }

    function clear() {
      selected.clear();
      ensureHiddenSelectOptions(hiddenSelectEl, all);
      syncHiddenMultiSelect(hiddenSelectEl, getSelectedIds());
      if (inputEl) inputEl.value = "";
      renderChips();
      renderSuggestions();
      hideSuggestions();
      onChange && onChange();
    }

    function renderChips() {
      if (!chipsEl) return;
      chipsEl.innerHTML = "";

      const items = Array.from(selected.values());
      if (!items.length) return;

      for (const it of items) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "filter-chip";
        chip.dataset.id = it.id;
        chip.setAttribute("role", "listitem");
        chip.setAttribute("aria-label", `Remove ${it.name}`);

        const text = document.createElement("span");
        text.className = "filter-chip__text";
        text.textContent = it.name;

        const close = document.createElement("span");
        close.className = "filter-chip__close";
        close.textContent = "×";
        close.setAttribute("aria-hidden", "true");

        chip.appendChild(text);
        chip.appendChild(close);

        chip.addEventListener("click", () => {
          selected.delete(it.id);
          ensureHiddenSelectOptions(hiddenSelectEl, all);
          syncHiddenMultiSelect(hiddenSelectEl, getSelectedIds());
          renderChips();
          renderSuggestions();
          onChange && onChange();
        });

        chipsEl.appendChild(chip);
      }
    }

    function hideSuggestions() {
      if (!suggestionsEl) return;
      suggestionsEl.hidden = true;
      if (inputEl) inputEl.setAttribute("aria-expanded", "false");
    }

    function showSuggestions() {
      if (!suggestionsEl) return;
      suggestionsEl.hidden = false;
      if (inputEl) inputEl.setAttribute("aria-expanded", "true");
    }

    function currentQuery() {
      return String(inputEl?.value || "").trim().toLowerCase();
    }

    function matchesQuery(item, q) {
      if (!q) return true;
      const hay = `${item.name} ${item.id}`.toLowerCase();
      return hay.includes(q);
    }

    function getAvailable(q) {
      const list = all.filter((it) => it && it.id && !selected.has(it.id));
      if (!q) return list;
      return list.filter((it) => matchesQuery(it, q));
    }

    function renderSuggestions() {
      if (!suggestionsEl) return;

      const q = currentQuery();
      const list = getAvailable(q);

      suggestionsEl.innerHTML = "";

      if (!all.length) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "filter-suggestion filter-suggestion--empty";
        btn.textContent = noneText;
        btn.disabled = true;
        btn.setAttribute("role", "option");
        btn.setAttribute("aria-disabled", "true");
        suggestionsEl.appendChild(btn);
        return;
      }

      if (!list.length) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "filter-suggestion filter-suggestion--empty";
        btn.textContent = q ? emptyText : noneText;
        btn.disabled = true;
        btn.setAttribute("role", "option");
        btn.setAttribute("aria-disabled", "true");
        suggestionsEl.appendChild(btn);
        return;
      }

      for (const it of list) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "filter-suggestion";
        btn.dataset.id = it.id;
        btn.textContent = it.name;
        btn.setAttribute("role", "option");

        btn.addEventListener("click", () => {
          selected.set(it.id, it);
          ensureHiddenSelectOptions(hiddenSelectEl, all);
          syncHiddenMultiSelect(hiddenSelectEl, getSelectedIds());

          if (inputEl) inputEl.value = "";

          renderChips();
          renderSuggestions();
          showSuggestions();
          onChange && onChange();
        });

        suggestionsEl.appendChild(btn);
      }
    }

    function onInput() {
      renderSuggestions();
      showSuggestions();
    }

    function onFocus() {
      renderSuggestions();
      showSuggestions();
    }

    function onKeyDown(e) {
      if (e.key === "Escape") {
        hideSuggestions();
        return;
      }

      if (e.key === "Enter") {
        const q = currentQuery();
        const list = getAvailable(q);
        if (list.length === 1) {
          e.preventDefault();
          const it = list[0];
          selected.set(it.id, it);
          ensureHiddenSelectOptions(hiddenSelectEl, all);
          syncHiddenMultiSelect(hiddenSelectEl, getSelectedIds());
          if (inputEl) inputEl.value = "";
          renderChips();
          renderSuggestions();
          showSuggestions();
          onChange && onChange();
        }
      }
    }

    function onDocClick(e) {
      const t = e.target;
      const inBox =
        (inputEl && (t === inputEl || inputEl.contains(t))) ||
        (suggestionsEl && (t === suggestionsEl || suggestionsEl.contains(t))) ||
        (chipsEl && (t === chipsEl || chipsEl.contains(t)));

      if (!inBox) hideSuggestions();
    }

    if (inputEl) {
      inputEl.addEventListener("input", onInput);
      inputEl.addEventListener("focus", onFocus);
      inputEl.addEventListener("keydown", onKeyDown);
    }

    document.addEventListener("click", onDocClick);

    return { kind, setItems, getSelectedIds, clear };
  }

  // =============================================================================
  // Main Initialization
  // =============================================================================
  const index = await loadIndex();

  const gameSelect = $("gameSelect");
  const categorySelect = $("categorySelect");
  const gameSearch = $("gameSearch");

  const communityChallengeSelect = $("communityChallengeSelect");
  const characterSelect = $("characterSelect");
  const glitchSelect = $("glitchSelect");
  const characterLabelEl = $("characterLabel");

  const standardChallengeSelect = $("standardChallengeSelect");
  const restrictionsSelect = $("restrictionsSelect");

  const standardInput = $("standardChallengeSearch");
  const standardSuggestions = $("standardChallengeSuggestions");
  const standardChips = $("standardChallengePicked");

  const restrictionsInput = $("restrictionsSearch");
  const restrictionsSuggestions = $("restrictionsSuggestions");
  const restrictionsChips = $("restrictionsPicked");

  const standardPicker = createTypeaheadChipPicker({
    kind: "standard_challenges",
    inputEl: standardInput,
    suggestionsEl: standardSuggestions,
    chipsEl: standardChips,
    hiddenSelectEl: standardChallengeSelect,
    placeholder: "Type to search challenges...",
    noneText: "No standard challenges available",
    emptyText: "No matches",
    onChange: repaint
  });

  const restrictionsPicker = createTypeaheadChipPicker({
    kind: "restrictions",
    inputEl: restrictionsInput,
    suggestionsEl: restrictionsSuggestions,
    chipsEl: restrictionsChips,
    hiddenSelectEl: restrictionsSelect,
    placeholder: "Type to search restrictions...",
    noneText: "No restrictions available",
    emptyText: "No matches",
    onChange: repaint
  });

  function getGameById(id) {
    return index.games.find((g) => g.game_id === id) || null;
  }

  function populateGames(filterText = "") {
    if (!gameSelect || (gameSelect.tagName === "INPUT" && gameSelect.type === "hidden")) {
      return;
    }

    const q = filterText.trim().toLowerCase();
    const list = q
      ? index.games.filter((g) => g.title.toLowerCase().includes(q) || g.game_id.toLowerCase().includes(q))
      : index.games;

    fillSelect(
      gameSelect,
      list,
      (g) => g.game_id,
      (g) => `${g.title}`,
      true,
      "Choose a game..."
    );

    const pre = window.CRC_PRESET_GAME_ID || qs("game");
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

  function populateBoxes() {
    const game = getGameById(gameSelect.value);

    const standard = normalizeList(game && game.standard_challenges);
    const community = normalizeList(game && game.community_challenges);
    const glitches = normalizeList(game && game.glitches);
    const restrictions = normalizeList(game && game.restrictions);

    const cc = game && game.character_column ? game.character_column : { enabled: false, label: "Character" };
    const chars = normalizeList(game && game.characters);

    if (characterLabelEl) characterLabelEl.textContent = cc && cc.label ? cc.label : "Character";

    standardPicker.setItems(standard);
    restrictionsPicker.setItems(restrictions);

    fillSelect(communityChallengeSelect, community, (c) => c.id, (c) => c.name, true, "None selected");
    fillSelect(glitchSelect, glitches, (c) => c.id, (c) => c.name, true, "None / Glitchless");

    if (cc && cc.enabled) {
      if (characterSelect) {
        characterSelect.disabled = false;
        const section = $("characterSection");
        if (section) section.style.display = "";
        fillSelect(characterSelect, chars, (c) => c.id, (c) => c.name, true, "Any / Not applicable");
      }
    } else {
      if (characterSelect) {
        characterSelect.value = "";
        characterSelect.disabled = true;
        const section = $("characterSection");
        if (section) section.style.display = "none";
      }
    }

    if (communityChallengeSelect) communityChallengeSelect.value = "";
    if (glitchSelect) glitchSelect.value = "";
  }

  function buildPayload() {
    const game_id = (gameSelect?.value || "").trim();
    const category_slug = (categorySelect?.value || "").trim();

    const standard_ids = standardPicker.getSelectedIds();
    const community_id = (communityChallengeSelect?.value || "").trim();

    const glitch_id = (glitchSelect?.value || "").trim();
    const restrictions = restrictionsPicker.getSelectedIds();

    const character = characterSelect && !characterSelect.disabled ? (characterSelect.value || "").trim() : "";

    const runner_id = ($("runnerId")?.value || "").trim();
    const video_url_raw = ($("videoUrl")?.value || "").trim();
    const date_completed = $("dateCompleted")?.value || "";

    // Get Turnstile captcha token if present
    const turnstile_token = ($("turnstileToken")?.value || "").trim();

    const v = parseVideo(video_url_raw);

    const payload = {
      kind: "run_submission",
      schema_version: 5,

      game_id,
      category_slug,

      standard_challenges: standard_ids,
      community_challenge: community_id,

      character,
      glitch_id,
      restrictions,

      runner_id,

      video_url: v.ok ? v.canonical_url : video_url_raw,
      video_host: v.ok ? v.host : "",
      video_id: v.ok ? v.id : "",

      date_completed,
      submitted_at: new Date().toISOString(),
      source: "site_form"
    };

    // Add turnstile token if available (for captcha verification)
    if (turnstile_token) {
      payload.turnstile_token = turnstile_token;
    }

    if (previewEl) previewEl.textContent = JSON.stringify(payload, null, 2);
    return { payload, v };
  }

  // =============================================================================
  // Validation with Inline Errors
  // =============================================================================
  function validatePayload(payload, v) {
    clearAllFieldErrors();
    let firstError = null;

    if (!payload.game_id) {
      showFieldError("gameSelect", "Please select a game.");
      if (!firstError) firstError = "gameSelect";
    }

    if (!payload.category_slug) {
      showFieldError("categorySelect", "Please select a category.");
      if (!firstError) firstError = "categorySelect";
    }

    if (!payload.runner_id) {
      showFieldError("runnerId", "Runner ID is required.");
      if (!firstError) firstError = "runnerId";
    }

    if (!payload.video_url) {
      showFieldError("videoUrl", "Video URL is required.");
      if (!firstError) firstError = "videoUrl";
    } else if (!v.ok) {
      showFieldError("videoUrl", v.reason || "Invalid video URL.");
      if (!firstError) firstError = "videoUrl";
    }

    if (!payload.date_completed) {
      showFieldError("dateCompleted", "Completion date is required.");
      if (!firstError) firstError = "dateCompleted";
    }

    const hasAnyChallenge =
      (Array.isArray(payload.standard_challenges) && payload.standard_challenges.length > 0) ||
      !!payload.community_challenge;

    if (!hasAnyChallenge) {
      return { valid: false, message: "Pick at least one Standard Challenge and/or a Community Challenge.", firstError };
    }

    // Check for turnstile token if turnstile widget is present
    const turnstileWidget = $("turnstile-widget");
    if (turnstileWidget && !payload.turnstile_token) {
      return { valid: false, message: "Please complete the verification check.", firstError };
    }

    if (firstError) {
      return { valid: false, message: "Please fix the errors above.", firstError };
    }

    return { valid: true, message: "", firstError: null };
  }

  function repaint() {
    buildPayload();
  }

  // =============================================================================
  // Event Handlers
  // =============================================================================
  if (gameSearch) {
    gameSearch.addEventListener("input", () => {
      populateGames(gameSearch.value);
      populateCategories();
      populateBoxes();
      repaint();
    });
  }

  if (gameSelect && gameSelect.tagName === "SELECT") {
    gameSelect.addEventListener("change", () => {
      clearFieldError("gameSelect");
      populateCategories();
      populateBoxes();
      repaint();
    });
  }

  // Clear errors on input
  ["categorySelect", "runnerId", "videoUrl", "dateCompleted"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", () => {
      clearFieldError(id);
      repaint();
    });
    el.addEventListener("change", () => {
      clearFieldError(id);
      repaint();
    });
  });

  [communityChallengeSelect, characterSelect, glitchSelect].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", repaint);
    el.addEventListener("change", repaint);
  });

  $("btnCopy")?.addEventListener("click", async () => {
    const { payload, v } = buildPayload();
    const validation = validatePayload(payload, v);
    
    if (!validation.valid) {
      setMsg(validation.message, "error");
      if (validation.firstError) {
        $(validation.firstError)?.focus();
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setMsg("Copied payload to clipboard!", "success");
    } catch (e) {
      setMsg("Failed to copy to clipboard.", "error");
    }
  });

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const { payload, v } = buildPayload();
    const validation = validatePayload(payload, v);
    
    if (!validation.valid) {
      setMsg(validation.message, "error");
      if (validation.firstError) {
        $(validation.firstError)?.focus();
      }
      return;
    }

    const endpoint = window.CRC_RUN_SUBMIT_ENDPOINT;

    if (!endpoint) {
      setMsg("No submit endpoint configured yet. Copy the payload and submit via your current intake path.", "info");
      return;
    }

    setLoading(true);
    setMsg("Submitting your run...", "info");

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

      setMsg("✓ Submitted successfully! Your run will be reviewed shortly.", "success");
    } catch (ex) {
      setMsg(String(ex.message || ex), "error");
    } finally {
      setLoading(false);
    }
  };

  // Attach to both button click and form submit
  btnSubmit?.addEventListener("click", handleSubmit);
  form?.addEventListener("submit", handleSubmit);

  // =============================================================================
  // Initial Setup
  // =============================================================================
  const presetGameId = window.CRC_PRESET_GAME_ID || qs("game") || "";

  if (gameSelect && gameSelect.tagName === "INPUT" && gameSelect.type === "hidden") {
    populateCategories();
    populateBoxes();
  } else {
    populateGames("");

    if (presetGameId && gameSelect) {
      const exists = index.games.some((g) => g.game_id === presetGameId);
      if (exists) {
        gameSelect.value = presetGameId;
      }
    }

    populateCategories();
    populateBoxes();
  }

  repaint();
  setMsg("Ready to submit.", "info");
})();
