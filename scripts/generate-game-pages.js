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
{% include game-header-tabs.html game=game active="rules" %}

<div class="page-width">
  <div class="game-shell">
    <section class="tab-panel active">

      <h1>Rules & Definitions</h1>
      <p class="muted mb-4">Official rules, category definitions, and challenge guidelines for {{ game.name }}.</p>

      <!-- Rule Builder - Collapsible Version -->
      <div class="card card--compact mb-4" id="rule-builder-card">
        <div class="rule-builder-header">
          <span class="muted rule-builder-subtitle">📌 Rule Builder — Build your ruleset and find runners</span>
          <button class="btn btn--filter-toggle" id="rb-toggle" type="button" aria-expanded="false" aria-controls="rule-builder-content">
            <span class="filter-toggle__icon">▼</span>
            <span class="filter-toggle__text">Open</span>
          </button>
        </div>

        <div class="rule-builder-content" id="rule-builder-content" hidden>
          <div class="rule-builder__selections">
            <!-- Category Dropdown -->
            <div class="rule-builder__group">
              <label class="rule-builder__label">Category</label>
              <select class="rule-builder__select" id="rb-category">
                <option value="" data-description="">-- Select Category --</option>
                {% for cat in game.categories_data %}
                  <option value="{{ cat.slug }}" data-label="{{ cat.label }}" data-description="{{ cat.description | escape }}">{{ cat.label }}</option>
                  {% if cat.children %}
                    {% for child in cat.children %}
                      <option value="{{ cat.slug }}/{{ child.slug }}" data-label="{{ child.label }}" data-description="{{ child.description | escape }}">  ↳ {{ child.label }}</option>
                    {% endfor %}
                  {% endif %}
                {% endfor %}
              </select>
            </div>

            <!-- Glitch Rules Dropdown -->
            <div class="rule-builder__group">
              <label class="rule-builder__label">Glitch Rules</label>
              <select class="rule-builder__select" id="rb-glitch">
                <option value="" data-label="" data-description="" data-allowed="" data-banned="">-- Select Glitch Category --</option>
                {% for glitch in game.glitches_data %}
                  <option value="{{ glitch.slug }}" 
                          data-label="{{ glitch.label }}"
                          data-description="{{ glitch.description | escape }}"
                          data-allowed="{{ glitch.allowed | join: '|' | escape }}"
                          data-banned="{{ glitch.banned | join: '|' | escape }}"
                          data-notes="{{ glitch.notes | escape }}">
                    {{ glitch.label }}
                  </option>
                {% endfor %}
              </select>
            </div>

            <!-- Challenge Type Dropdown (Multi-select) -->
            <div class="rule-builder__group">
              <label class="rule-builder__label">Challenge Type(s)</label>
              <select class="rule-builder__select" id="rb-challenge">
                <option value="" data-description="">-- Add Challenge --</option>
                <optgroup label="Standard Challenges">
                  {% for ch in game.challenges_data %}
                    <option value="{{ ch.slug }}" data-label="{{ ch.label }}" data-description="{{ ch.description | escape }}">{{ ch.label }}</option>
                  {% endfor %}
                </optgroup>
                {% if game.community_challenges and game.community_challenges.size > 0 %}
                <optgroup label="Community Challenges">
                  {% for cc in game.community_challenges %}
                    <option value="{{ cc.slug }}" data-label="{{ cc.label }}" data-description="{{ cc.description | escape }}">{{ cc.label }}</option>
                  {% endfor %}
                </optgroup>
                {% endif %}
              </select>
              <div class="rule-builder__selected" id="rb-selected-challenges"></div>
            </div>

            <!-- Restrictions Dropdown (Multi-select style) -->
            <div class="rule-builder__group">
              <label class="rule-builder__label">Restrictions</label>
              <select class="rule-builder__select" id="rb-restriction">
                <option value="" data-description="" data-incompatible="">-- Add Restriction --</option>
                {% for res in game.restrictions_data %}
                  <option value="{{ res.slug }}" 
                          data-label="{{ res.label }}"
                          data-description="{{ res.description | escape }}"
                          data-incompatible="{{ res.incompatible_with | join: ',' | escape }}">
                    {{ res.label }}
                  </option>
                {% endfor %}
              </select>
              <div class="rule-builder__selected" id="rb-selected-restrictions"></div>
            </div>

            <!-- Reset Button -->
            <div class="rule-builder__group rule-builder__group--reset">
              <button type="button" class="btn btn--outline btn--reset" id="rb-reset">
                Remove all filters
              </button>
            </div>
          </div>

          <!-- Active Selections Display -->
          <div class="rule-builder__active" id="rb-active-filters"></div>

          <!-- Validation Warnings -->
          <div class="rule-builder__validation" id="rb-validation" style="display: none;">
            <p class="rule-builder__warning">⚠️ <span id="rb-warning-text"></span></p>
          </div>

          <!-- See Runners Button -->
          <div class="rule-builder__actions mt-3">
            <a href="#" class="btn btn--accent" id="rb-find-runners" style="display: none;">
              🔍 See runners who completed this
            </a>
          </div>
        </div>
      </div>

      <!-- General Rules -->
      <div class="rules-section">
        <details class="accordion-item accordion-item--section" open>
          <summary class="accordion-header accordion-header--section">
            <span class="accordion-title">📋 General Rules</span>
            <span class="accordion-icon">▼</span>
          </summary>
          <div class="accordion-content">
            <ul>
              <li><strong>Timing Method:</strong> {{ game.timing_method | default: "RTA (Real Time Attack)" }}</li>
              <li><strong>Video Required:</strong> All submissions must include video proof</li>
              <li><strong>No Cheats/Mods:</strong> External tools or gameplay-altering mods are not allowed</li>
            </ul>
          </div>
        </details>
      </div>

      <!-- Run Categories -->
      {% if game.categories_data and game.categories_data.size > 0 %}
      <div class="rules-section mt-4">
        <details class="accordion-item accordion-item--section">
          <summary class="accordion-header accordion-header--section">
            <span class="accordion-title">🏃 Run Categories</span>
            <span class="accordion-icon">▼</span>
          </summary>
          <div class="accordion-content">
            <div class="accordion">
              {% for cat in game.categories_data %}
                <details class="accordion-item">
                  <summary class="accordion-header">
                    <span class="accordion-title">{{ cat.label }}</span>
                    <span class="accordion-icon">▼</span>
                  </summary>
                  <div class="accordion-content">
                    {% if cat.description %}<p>{{ cat.description }}</p>{% else %}<p class="muted">See resources for rules.</p>{% endif %}
                    {% if cat.children and cat.children.size > 0 %}
                      <div class="mt-3"><strong>Subcategories:</strong>
                        <ul class="mt-2">{% for child in cat.children %}<li><strong>{{ child.label }}</strong>{% if child.description %} - {{ child.description }}{% endif %}</li>{% endfor %}</ul>
                      </div>
                    {% endif %}
                  </div>
                </details>
              {% endfor %}
            </div>
          </div>
        </details>
      </div>
      {% endif %}

      <!-- Glitch Categories -->
      {% if game.glitches_data and game.glitches_data.size > 0 %}
      <div class="rules-section mt-4">
        <details class="accordion-item accordion-item--section">
          <summary class="accordion-header accordion-header--section">
            <span class="accordion-title">🔧 Glitch Categories</span>
            <span class="accordion-icon">▼</span>
          </summary>
          <div class="accordion-content">
            <div class="accordion">
              {% for glitch in game.glitches_data %}
                <details class="accordion-item">
                  <summary class="accordion-header">
                    <span class="accordion-title">{{ glitch.label }}</span>
                    <span class="accordion-icon">▼</span>
                  </summary>
                  <div class="accordion-content">
                    {% if glitch.description %}<p>{{ glitch.description }}</p>{% endif %}
                    {% if glitch.allowed and glitch.allowed.size > 0 %}<p class="mt-2"><span class="rules-label rules-list--allowed">✓ Allowed:</span> {{ glitch.allowed | join: ", " }}</p>{% endif %}
                    {% if glitch.banned and glitch.banned.size > 0 %}<p class="mt-2"><span class="rules-label rules-list--banned">✗ Banned:</span> {{ glitch.banned | join: ", " }}</p>{% endif %}
                    {% if glitch.notes %}<p class="mt-2 muted"><em>{{ glitch.notes }}</em></p>{% endif %}
                  </div>
                </details>
              {% endfor %}
            </div>
          </div>
        </details>
      </div>
      {% endif %}

      <!-- Standard Challenge Types -->
      {% if game.challenges_data and game.challenges_data.size > 0 %}
      <div class="rules-section mt-4">
        <details class="accordion-item accordion-item--section">
          <summary class="accordion-header accordion-header--section">
            <span class="accordion-title">🎯 Standard Challenge Types</span>
            <span class="accordion-icon">▼</span>
          </summary>
          <div class="accordion-content">
            <div class="accordion">
              {% for ch in game.challenges_data %}
                <details class="accordion-item">
                  <summary class="accordion-header">
                    <span class="accordion-title">{{ ch.label }}</span>
                    <span class="accordion-icon">▼</span>
                  </summary>
                  <div class="accordion-content">
                    {% if ch.description %}<p>{{ ch.description }}</p>{% else %}<p class="muted">See resources for detailed rules.</p>{% endif %}
                  </div>
                </details>
              {% endfor %}
            </div>
          </div>
        </details>
      </div>
      {% endif %}

      <!-- Optional Restrictions -->
      {% if game.restrictions_data and game.restrictions_data.size > 0 %}
      <div class="rules-section mt-4">
        <details class="accordion-item accordion-item--section">
          <summary class="accordion-header accordion-header--section">
            <span class="accordion-title">⛔ Optional Restrictions</span>
            <span class="accordion-icon">▼</span>
          </summary>
          <div class="accordion-content">
            <div class="accordion">
              {% for res in game.restrictions_data %}
                <details class="accordion-item">
                  <summary class="accordion-header">
                    <span class="accordion-title">{{ res.label }}</span>
                    <span class="accordion-icon">▼</span>
                  </summary>
                  <div class="accordion-content">
                    {% if res.description %}<p>{{ res.description }}</p>{% else %}<p class="muted">Can be combined with any category.</p>{% endif %}
                    {% if res.incompatible_with and res.incompatible_with.size > 0 %}
                      <p class="mt-2 muted"><em>⚠️ Cannot be combined with: {{ res.incompatible_with | join: ", " }}</em></p>
                    {% endif %}
                  </div>
                </details>
              {% endfor %}
            </div>
          </div>
        </details>
      </div>
      {% endif %}

      <!-- Community Challenges -->
      {% if game.community_challenges and game.community_challenges.size > 0 %}
      <div class="rules-section mt-4">
        <details class="accordion-item accordion-item--section">
          <summary class="accordion-header accordion-header--section">
            <span class="accordion-title">🌟 Community Challenges</span>
            <span class="accordion-icon">▼</span>
          </summary>
          <div class="accordion-content">
            <div class="accordion">
              {% for cc in game.community_challenges %}
                <details class="accordion-item">
                  <summary class="accordion-header">
                    <span class="accordion-title">{{ cc.label }}</span>
                    <span class="accordion-icon">▼</span>
                  </summary>
                  <div class="accordion-content">
                    {% if cc.description %}<p>{{ cc.description }}</p>{% else %}<p class="muted">See resources for rules.</p>{% endif %}
                  </div>
                </details>
              {% endfor %}
            </div>
          </div>
        </details>
      </div>
      {% endif %}

    </section>
  </div>
</div>

<!-- Rule Builder JavaScript -->
<script>
document.addEventListener('DOMContentLoaded', function() {
  const gameId = '{{ game.game_id }}';
  
  // Toggle elements
  const rbToggle = document.getElementById('rb-toggle');
  const rbContent = document.getElementById('rule-builder-content');
  const rbCard = document.getElementById('rule-builder-card');
  
  // Form elements
  const categorySelect = document.getElementById('rb-category');
  const challengeSelect = document.getElementById('rb-challenge');
  const glitchSelect = document.getElementById('rb-glitch');
  const restrictionSelect = document.getElementById('rb-restriction');
  const resetBtn = document.getElementById('rb-reset');
  
  // Display elements
  const selectedChallengesDiv = document.getElementById('rb-selected-challenges');
  const selectedRestrictionsDiv = document.getElementById('rb-selected-restrictions');
  const activeFiltersDiv = document.getElementById('rb-active-filters');
  const validationDiv = document.getElementById('rb-validation');
  const warningText = document.getElementById('rb-warning-text');
  const findRunnersBtn = document.getElementById('rb-find-runners');

  // Track selected items
  let selectedCategory = null;
  let selectedGlitch = null;
  let selectedChallenges = [];
  let selectedRestrictions = [];

  // Store original options
  const originalChallengeOptions = challengeSelect ? 
    Array.from(challengeSelect.querySelectorAll('option')).map(o => ({ 
      value: o.value, 
      text: o.textContent, 
      label: o.dataset.label || o.textContent.trim(),
      optgroup: o.parentElement.tagName === 'OPTGROUP' ? o.parentElement.label : null
    })) : [];
  
  const originalRestrictionOptions = restrictionSelect ? 
    Array.from(restrictionSelect.options).map(o => ({ 
      value: o.value, 
      text: o.textContent,
      label: o.dataset.label || o.textContent.trim()
    })) : [];

  // Toggle Rule Builder visibility
  if (rbToggle && rbContent) {
    rbToggle.addEventListener('click', function() {
      const isHidden = rbContent.hidden;
      rbContent.hidden = !isHidden;
      rbToggle.setAttribute('aria-expanded', isHidden);
      rbToggle.classList.toggle('is-active', isHidden);
      rbCard.classList.toggle('rule-builder--expanded', isHidden);
      rbToggle.querySelector('.filter-toggle__text').textContent = isHidden ? 'Close' : 'Open';
    });
  }

  // Category select
  if (categorySelect) {
    categorySelect.addEventListener('change', function() {
      const option = this.options[this.selectedIndex];
      selectedCategory = option.value ? { slug: option.value, label: option.dataset.label || option.text.trim() } : null;
      updateRuleBuilder();
    });
  }

  // Glitch select
  if (glitchSelect) {
    glitchSelect.addEventListener('change', function() {
      const option = this.options[this.selectedIndex];
      selectedGlitch = option.value ? { slug: option.value, label: option.dataset.label || option.text.trim() } : null;
      updateRuleBuilder();
    });
  }

  // Challenge multi-select
  if (challengeSelect) {
    challengeSelect.addEventListener('change', function() {
      const option = this.options[this.selectedIndex];
      if (option.value && !selectedChallenges.find(c => c.slug === option.value)) {
        selectedChallenges.push({ slug: option.value, label: option.dataset.label || option.text.trim() });
        this.value = '';
        updateChallengeDropdown();
        updateRuleBuilder();
      }
    });
  }

  // Restriction multi-select
  if (restrictionSelect) {
    restrictionSelect.addEventListener('change', function() {
      const option = this.options[this.selectedIndex];
      if (option.value && !selectedRestrictions.find(r => r.slug === option.value)) {
        selectedRestrictions.push({ slug: option.value, label: option.dataset.label || option.text.trim() });
        this.value = '';
        updateRestrictionDropdown();
        updateRuleBuilder();
      }
    });
  }

  // Reset all
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      selectedCategory = null;
      selectedGlitch = null;
      selectedChallenges = [];
      selectedRestrictions = [];
      if (categorySelect) categorySelect.value = '';
      if (glitchSelect) glitchSelect.value = '';
      updateChallengeDropdown();
      updateRestrictionDropdown();
      updateRuleBuilder();
    });
  }

  function updateChallengeDropdown() {
    if (!challengeSelect) return;
    const selectedSlugs = selectedChallenges.map(c => c.slug);
    challengeSelect.innerHTML = '';
    const groups = {};
    originalChallengeOptions.forEach(opt => {
      if (!opt.value || !selectedSlugs.includes(opt.value)) {
        const groupName = opt.optgroup || '_default';
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(opt);
      }
    });
    if (groups['_default']) {
      groups['_default'].forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        if (opt.label) option.dataset.label = opt.label;
        challengeSelect.appendChild(option);
      });
    }
    Object.keys(groups).filter(k => k !== '_default').forEach(groupName => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = groupName;
      groups[groupName].forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        if (opt.label) option.dataset.label = opt.label;
        optgroup.appendChild(option);
      });
      if (optgroup.children.length > 0) challengeSelect.appendChild(optgroup);
    });
  }

  function updateRestrictionDropdown() {
    if (!restrictionSelect) return;
    const selectedSlugs = selectedRestrictions.map(r => r.slug);
    restrictionSelect.innerHTML = '';
    originalRestrictionOptions.forEach(opt => {
      if (!opt.value || !selectedSlugs.includes(opt.value)) {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        if (opt.label) option.dataset.label = opt.label;
        restrictionSelect.appendChild(option);
      }
    });
  }

  function removeChallenge(slug) {
    selectedChallenges = selectedChallenges.filter(c => c.slug !== slug);
    updateChallengeDropdown();
    updateRuleBuilder();
  }

  function removeRestriction(slug) {
    selectedRestrictions = selectedRestrictions.filter(r => r.slug !== slug);
    updateRestrictionDropdown();
    updateRuleBuilder();
  }

  function removeCategory() {
    selectedCategory = null;
    if (categorySelect) categorySelect.value = '';
    updateRuleBuilder();
  }

  function removeGlitch() {
    selectedGlitch = null;
    if (glitchSelect) glitchSelect.value = '';
    updateRuleBuilder();
  }

  function updateRuleBuilder() {
    const tags = [];
    let hasContent = false;

    if (selectedCategory) { tags.push({ label: selectedCategory.label, clear: removeCategory }); hasContent = true; }
    if (selectedGlitch) { tags.push({ label: selectedGlitch.label, clear: removeGlitch }); hasContent = true; }
    selectedChallenges.forEach(c => { tags.push({ label: c.label, clear: () => removeChallenge(c.slug) }); hasContent = true; });
    selectedRestrictions.forEach(r => { tags.push({ label: r.label, clear: () => removeRestriction(r.slug) }); hasContent = true; });

    if (activeFiltersDiv) {
      activeFiltersDiv.innerHTML = tags.map(t => 
        \`<span class="tag tag--removable" role="button" tabindex="0" title="Click to remove">\${t.label}</span>\`
      ).join('');
      activeFiltersDiv.querySelectorAll('.tag--removable').forEach((tag, i) => {
        tag.addEventListener('click', () => tags[i].clear());
        tag.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tags[i].clear(); } });
      });
    }

    if (validationDiv) validationDiv.style.display = 'none';

    if (findRunnersBtn) {
      if (hasContent) {
        const filterData = {
          challenges: selectedChallenges.map(c => c.label),
          restrictions: selectedRestrictions.map(r => r.label),
          glitch: selectedGlitch ? selectedGlitch.slug : '',
          character: ''
        };
        const hashData = encodeURIComponent(JSON.stringify(filterData));
        findRunnersBtn.href = '/games/' + gameId + '/runs/#filters=' + hashData;
        findRunnersBtn.style.display = 'inline-block';
      } else {
        findRunnersBtn.style.display = 'none';
      }
    }
  }

  updateChallengeDropdown();
  updateRestrictionDropdown();
});
</script>
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
