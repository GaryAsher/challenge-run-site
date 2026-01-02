---
layout: default
title: Chaos Trials
game_id: hades-2
permalink: /games/hades-2/game-runs/categories/chaos-trials/
---

{% assign game = site.games | where: "game_id", page.game_id | first %}
{% include game-header-tabs.html game=game active="runs" %}

<div class="page-width">
  <div class="game-shell">
    <div class="card">
      <p class="muted" style="margin:0 0 0.75rem 0;">
        <a href="{{ '/games/' | relative_url }}{{ page.game_id }}/game-runs/categories/">← All Categories</a>
        <span class="muted"> / Chaos Trials</span>
      </p>

      <h1 style="margin-top:0;">Chaos Trials</h1>
      <p class="muted">Pick a trial to view runs.</p>

      <div class="tag-picker" style="margin-top:0.75rem;">
        <div class="tag-picked">
          <a class="tag-chip" href="{{ '/games/' | relative_url }}{{ page.game_id }}/game-runs/categories/chaos-trials/origin/">Origin</a>
          <a class="tag-chip" href="{{ '/games/' | relative_url }}{{ page.game_id }}/game-runs/categories/chaos-trials/the-labrys/">The Labrys</a>
          <a class="tag-chip" href="{{ '/games/' | relative_url }}{{ page.game_id }}/game-runs/categories/chaos-trials/vengeance/">Vengeance</a>
          <a class="tag-chip" href="{{ '/games/' | relative_url }}{{ page.game_id }}/game-runs/categories/chaos-trials/salt/">Salt</a>
          <a class="tag-chip" href="{{ '/games/' | relative_url }}{{ page.game_id }}/game-runs/categories/chaos-trials/fury/">Fury</a>
          <a class="tag-chip" href="{{ '/games/' | relative_url }}{{ page.game_id }}/game-runs/categories/chaos-trials/humility/">Humility</a>
        </div>
      </div>

    </div>
  </div>
</div>
