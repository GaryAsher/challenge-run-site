#!/usr/bin/env node
/**
 * scripts/generate-game-pages.js
 *
 * Generates the standard game subpages based on the tabs configuration in _games/<game>.md.
 * Creates pages like: history, forum, resources, rules, guides, challenges, runs (main page).
 *
 * Usage:
 *   node scripts/generate-game-pages.js                 (all games)
 *   node scripts/generate-game-pages.js --game hades-2  (one game)
 *   node scripts/generate-game-pages.js --check         (check mode, no writes)
 *
 * Pages created (based on tabs config):
 *   games/<game_id>/runs/index.html        (always - main runs page)
 *   games/<game_id>/history/index.html     (if tabs.history)
 *   games/<game_id>/resources/index.html   (if tabs.resources)
 *   games/<game_id>/guides/index.html      (if tabs.resources - nested under resources)
 *   games/<game_id>/forum/index.html       (if tabs.forum)
 *   games/<game_id>/rules/index.html       (always)
 *   games/<game_id>/challenges/index.html  (if tabs.challenges)
 */

const fs = require('fs');
const path = require('path');

const {
  extractFrontMatterData,
  readText,
  writeFileIfChanged,
  fileExists,
} = require('./lib');

const ROOT = process.cwd();

// ============================================================
// CLI argument parsing
// ============================================================
function parseArgs(argv) {
  const out = { game: null, check: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--game' || a === '-g') out.game = argv[++i];
    else if (a === '--check') out.check = true;
  }
  return out;
}

function die(msg) {
  console.error('Error:', msg);
  process.exit(1);
}

// ============================================================
// Page templates
// ============================================================

function runsMainPage({ gameId, gameName }) {
  return `---
layout: game-runs
title: ${gameName} Runs
game_id: ${gameId}
permalink: /games/${gameId}/runs/
---
`;
}

function historyPage({ gameId, gameName }) {
  return `---
layout: default
title: ${gameName} History
game_id: ${gameId}
permalink: /games/${gameId}/history/
---

{% assign game = site.games | where: "game_id", page.game_id | first %}
{% include game-header-tabs.html game=game active="history" %}

<div class="page-width">
  <div class="game-shell">
    <section class="tab-panel active">
      <h1>History</h1>
      <p class="muted">Coming soon.</p>
    </section>
  </div>
</div>
`;
}

function forumPage({ gameId, gameName }) {
  return `---
layout: default
title: ${gameName} Forum
game_id: ${gameId}
permalink: /games/${gameId}/forum/
---

{% assign game = site.games | where: "game_id", page.game_id | first %}
{% include game-header-tabs.html game=game active="forum" %}

<div class="page-width">
  <div class="game-shell">
    <section class="tab-panel active">
      <h1>Forum</h1>
      <p class="muted">Coming soon.</p>
    </section>
  </div>
</div>
`;
}

function resourcesPage({ gameId, gameName }) {
  return `---
layout: default
title: ${gameName} Resources
game_id: ${gameId}
permalink: /games/${gameId}/resources/
---

{% assign game = site.games | where: "game_id", page.game_id | first %}
{% include game-header-tabs.html game=game active="resources" %}

{% comment %} Count guides for this game {% endcomment %}
{% assign guides_count = 0 %}
{% if site.guides %}
  {% assign game_guides = site.guides | where: "game_id", page.game_id %}
  {% assign guides_count = game_guides.size %}
{% endif %}

{% comment %} Count tools and discords - check if resources_data exists {% endcomment %}
{% assign tools_count = 0 %}
{% assign discords_count = 0 %}
{% if game.resources_data %}
  {% if game.resources_data.tools %}
    {% assign tools_count = game.resources_data.tools.size %}
  {% endif %}
  {% if game.resources_data.discords %}
    {% assign discords_count = game.resources_data.discords.size %}
  {% endif %}
{% endif %}

<div class="page-width">
  <div class="game-shell">
    <section class="tab-panel active">
      <h1>Resources</h1>
      <p class="muted mb-6">Find guides, tools, and community links for {{ game.name }}.</p>

      <!-- Resource cards -->
      <div class="resource-cards">
        <a href="{{ game.url | relative_url }}guides/" class="resource-card">
          <div class="resource-card__icon">📖</div>
          <div class="resource-card__content">
            <h3 class="resource-card__title">Guides</h3>
            <p class="resource-card__desc">Tutorials, walkthroughs, and strategy guides</p>
            <span class="resource-card__count">{{ guides_count }} {% if guides_count == 1 %}guide{% else %}guides{% endif %}</span>
          </div>
        </a>

        <div class="resource-card" {% if tools_count == 0 %}style="opacity: 0.6;"{% endif %}>
          <div class="resource-card__icon">🛠️</div>
          <div class="resource-card__content">
            <h3 class="resource-card__title">Tools</h3>
            <p class="resource-card__desc">Autosplitters, trackers, and utilities</p>
            <span class="resource-card__count">{{ tools_count }} {% if tools_count == 1 %}tool{% else %}tools{% endif %}</span>
          </div>
        </div>

        <div class="resource-card" {% if discords_count == 0 %}style="opacity: 0.6;"{% endif %}>
          <div class="resource-card__icon">💬</div>
          <div class="resource-card__content">
            <h3 class="resource-card__title">Community</h3>
            <p class="resource-card__desc">Discord servers and community links</p>
            <span class="resource-card__count">{{ discords_count }} {% if discords_count == 1 %}server{% else %}servers{% endif %}</span>
          </div>
        </div>

        <div class="resource-card resource-card--placeholder">
          <div class="resource-card__icon">❓</div>
          <div class="resource-card__content">
            <h3 class="resource-card__title">More Coming Soon</h3>
            <p class="resource-card__desc">Have ideas? Let us know!</p>
            <span class="resource-card__count">Placeholder</span>
          </div>
        </div>
      </div>

      {% if tools_count > 0 %}
      <div class="card mt-6">
        <h2>Tools</h2>
        <div class="resource-list">
          {% for tool in game.resources_data.tools %}
          <div class="resource-list__item">
            <a href="{{ tool.url }}" target="_blank" rel="noopener" class="resource-list__link">
              {{ tool.name }} ↗
            </a>
            {% if tool.description %}
            <p class="muted resource-list__desc">{{ tool.description }}</p>
            {% endif %}
          </div>
          {% endfor %}
        </div>
      </div>
      {% endif %}

      {% if discords_count > 0 %}
      <div class="card mt-4">
        <h2>Community</h2>
        <div class="resource-list">
          {% for discord in game.resources_data.discords %}
          <div class="resource-list__item">
            <a href="{{ discord.url }}" target="_blank" rel="noopener" class="resource-list__link">
              {{ discord.name }} ↗
            </a>
            {% if discord.description %}
            <p class="muted resource-list__desc">{{ discord.description }}</p>
            {% endif %}
          </div>
          {% endfor %}
        </div>
      </div>
      {% endif %}

    </section>
  </div>
</div>
`;
}

function guidesPage({ gameId, gameName }) {
  return `---
layout: default
title: ${gameName} Guides
game_id: ${gameId}
permalink: /games/${gameId}/guides/
---

{% assign game = site.games | where: "game_id", page.game_id | first %}
{% include game-header-tabs.html game=game active="resources" %}

<div class="page-width">
  <div class="game-shell">
    <section class="tab-panel active">
      <p class="muted mb-3">
        <a href="{{ game.url | relative_url }}resources/">← Resources</a>
      </p>

      <h1>Guides</h1>

      {% if site.guides %}
        {% assign guides = site.guides | where: "game_id", page.game_id | sort: "title" %}
      {% else %}
        {% assign guides = nil %}
      {% endif %}

      {% if guides and guides.size > 0 %}
        <div class="grid">
          {% for guide in guides %}
            <a href="{{ guide.url | relative_url }}" class="card">
              <h3>{{ guide.title }}</h3>
              {% if guide.description %}
                <p class="muted">{{ guide.description }}</p>
              {% endif %}
            </a>
          {% endfor %}
        </div>
      {% else %}
        <p class="muted">No guides have been added yet.</p>
      {% endif %}
    </section>
  </div>
</div>
`;
}

function rulesPage({ gameId, gameName }) {
  return `---
layout: default
title: ${gameName} Rules
game_id: ${gameId}
permalink: /games/${gameId}/rules/
---

{% assign game = site.games | where: "game_id", page.game_id | first %}
{% include game-header-tabs.html game=game active="overview" %}

<div class="page-width">
  <div class="game-shell">
    <section class="tab-panel active">
      <p class="muted mb-3">
        <a href="{{ game.url | relative_url }}">← Overview</a>
      </p>

      <h1>Rules & Definitions</h1>
      <p class="muted mb-4">Category definitions and challenge rules for {{ game.name }}.</p>

      {% if game.challenges and game.challenges.size > 0 %}
      <div class="card">
        <h2>Challenge Definitions</h2>
        <div class="tag-picked">
          {% for ch_id in game.challenges %}
            {% assign ch_meta = site.data.challenges[ch_id] %}
            <span class="tag-chip">{{ ch_meta.label | default: ch_id }}</span>
          {% endfor %}
        </div>
        <p class="muted mt-3">Detailed definitions coming soon.</p>
      </div>
      {% endif %}

      {% if game.categories_data and game.categories_data.size > 0 %}
      <div class="card mt-4">
        <h2>Category Rules</h2>
        <div class="tag-picked">
          {% for cat in game.categories_data %}
            <span class="tag-chip">{{ cat.label }}</span>
          {% endfor %}
        </div>
        <p class="muted mt-3">Category-specific rules coming soon.</p>
      </div>
      {% endif %}
    </section>
  </div>
</div>
`;
}

function challengesPage({ gameId, gameName }) {
  return `---
layout: default
title: ${gameName} Challenges
game_id: ${gameId}
permalink: /games/${gameId}/challenges/
---

{% assign game = site.games | where: "game_id", page.game_id | first %}
{% include game-header-tabs.html game=game active="challenges" %}

<div class="page-width">
  <div class="game-shell">
    <section class="tab-panel active">
      <h1>Challenges</h1>
      <p class="muted">Coming soon.</p>
    </section>
  </div>
</div>
`;
}

// ============================================================
// File listing
// ============================================================
function listGameFiles() {
  const dir = path.join(ROOT, '_games');
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .filter(f => !f.toLowerCase().includes('template'))
    .filter(f => f.toLowerCase() !== 'readme.md')
    .map(f => path.join(dir, f));
}

// ============================================================
// Generate pages for a game
// ============================================================
function generateForGameFile(gameMdPath, { check }) {
  const md = readText(gameMdPath);
  const data = extractFrontMatterData(md);

  if (!data || !data.game_id) {
    return { created: [], changed: [], skipped: true };
  }

  const gameId = data.game_id;
  const gameName = data.name || gameId;
  const tabs = data.tabs || {};

  const created = [];
  const changed = [];

  // Always create runs main page
  const runsDir = path.join(ROOT, 'games', gameId, 'runs');
  const runsIndex = path.join(runsDir, 'index.html');
  // Check if runs.md exists (some games use this pattern)
  const runsMd = path.join(ROOT, 'games', gameId, 'runs.md');
  if (!fileExists(runsMd)) {
    const runsRes = writeFileIfChanged(runsIndex, runsMainPage({ gameId, gameName }), check);
    if (runsRes.changed) (runsRes.created ? created : changed).push(runsIndex);
  }

  // Always create rules page
  const rulesDir = path.join(ROOT, 'games', gameId, 'rules');
  const rulesIndex = path.join(rulesDir, 'index.html');
  const rulesRes = writeFileIfChanged(rulesIndex, rulesPage({ gameId, gameName }), check);
  if (rulesRes.changed) (rulesRes.created ? created : changed).push(rulesIndex);

  // History page (if enabled)
  if (tabs.history) {
    const historyDir = path.join(ROOT, 'games', gameId, 'history');
    const historyIndex = path.join(historyDir, 'index.html');
    const historyRes = writeFileIfChanged(historyIndex, historyPage({ gameId, gameName }), check);
    if (historyRes.changed) (historyRes.created ? created : changed).push(historyIndex);
  }

  // Forum page (if enabled)
  if (tabs.forum) {
    const forumDir = path.join(ROOT, 'games', gameId, 'forum');
    const forumIndex = path.join(forumDir, 'index.html');
    const forumRes = writeFileIfChanged(forumIndex, forumPage({ gameId, gameName }), check);
    if (forumRes.changed) (forumRes.created ? created : changed).push(forumIndex);
  }

  // Resources page (if enabled)
  if (tabs.resources) {
    const resourcesDir = path.join(ROOT, 'games', gameId, 'resources');
    const resourcesIndex = path.join(resourcesDir, 'index.html');
    const resourcesRes = writeFileIfChanged(resourcesIndex, resourcesPage({ gameId, gameName }), check);
    if (resourcesRes.changed) (resourcesRes.created ? created : changed).push(resourcesIndex);

    // Guides page (always created with resources)
    const guidesDir = path.join(ROOT, 'games', gameId, 'guides');
    const guidesIndex = path.join(guidesDir, 'index.html');
    const guidesRes = writeFileIfChanged(guidesIndex, guidesPage({ gameId, gameName }), check);
    if (guidesRes.changed) (guidesRes.created ? created : changed).push(guidesIndex);
  }

  // Challenges page (if enabled)
  if (tabs.challenges) {
    const challengesDir = path.join(ROOT, 'games', gameId, 'challenges');
    const challengesIndex = path.join(challengesDir, 'index.html');
    const challengesRes = writeFileIfChanged(challengesIndex, challengesPage({ gameId, gameName }), check);
    if (challengesRes.changed) (challengesRes.created ? created : changed).push(challengesIndex);
  }

  return { created, changed, skipped: false, gameId };
}

// ============================================================
// Main
// ============================================================
function main() {
  const args = parseArgs(process.argv.slice(2));

  let gameFiles = [];

  if (args.game) {
    const p = path.join(ROOT, '_games', `${args.game}.md`);
    if (!fileExists(p)) die(`Game file not found: ${p}`);
    gameFiles = [p];
  } else {
    gameFiles = listGameFiles();
    if (!gameFiles.length) die('No _games/*.md files found.');
  }

  const allCreated = [];
  const allChanged = [];
  const skippedGames = [];

  for (const gf of gameFiles) {
    const res = generateForGameFile(gf, { check: args.check });
    if (res.skipped) {
      skippedGames.push(path.relative(ROOT, gf));
      continue;
    }
    allCreated.push(...res.created);
    allChanged.push(...res.changed);
  }

  const totalTouched = allCreated.length + allChanged.length;

  if (args.check) {
    if (totalTouched > 0) {
      console.error('Missing or out-of-date generated game pages:');
      allCreated.forEach(p => console.error('  (missing)  ' + path.relative(ROOT, p)));
      allChanged.forEach(p => console.error('  (changed)  ' + path.relative(ROOT, p)));
      process.exit(1);
    }
    console.log('OK: game pages are up to date.');
    return;
  }

  console.log(`Done. Created: ${allCreated.length}, Updated: ${allChanged.length}`);
  allCreated.forEach(p => console.log('  created  ' + path.relative(ROOT, p)));
  allChanged.forEach(p => console.log('  updated  ' + path.relative(ROOT, p)));

  if (skippedGames.length) {
    console.log(`Skipped (no game_id/front matter): ${skippedGames.length}`);
  }
}

main();
