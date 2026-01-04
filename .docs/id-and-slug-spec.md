# ID and Slug Spec

This document defines the canonical formats and rules for all IDs and slugs used by the site and tooling.  
Anything that validates runs, generates pages, or reviews submissions should follow this spec.

## Goals

- Human readable identifiers that are stable over time.
- Safe for URLs, file paths, YAML front matter, and GitHub.
- Deterministic “slugify” behavior so contributors and scripts agree.

## Vocabulary

**Display label**  
Human-facing text. May contain spaces, punctuation, capitalization, and non-ASCII characters.

**ID / Slug**  
Machine-facing identifier used for URLs, lookups, and validation. Must follow strict rules.

## General ID rules (applies to all IDs unless otherwise specified)

### Allowed characters
- Lowercase `a-z`
- Digits `0-9`
- Hyphen `-`

### Structure rules
- Must be lowercase.
- Must not contain spaces.
- Must not start or end with `-`.
- Must not contain `--` (double hyphen).
- Recommended max length: 64 characters (hard max if you want one: 80).

### Canonical regex
Use this as the baseline pattern:

`^[a-z0-9]+(?:-[a-z0-9]+)*$`

## Slugify rules

When converting a display label to an ID/slug, use these steps in order:

1. Trim leading/trailing whitespace.
2. Convert to lowercase.
3. Convert accented characters to their base form (example: `é` -> `e`).
4. Replace any sequence of spaces, underscores, or hyphens with a single `-`.
5. Remove any remaining characters not in `a-z`, `0-9`, or `-`.
6. Collapse multiple `-` into one `-`.
7. Trim `-` from the start and end.

### Slugify examples

| Display label | Slug |
| --- | --- |
| `Hades II` | `hades-2` |
| `No Hit / No Damage` | `no-hit-no-damage` |
| `Any% (Glitchless)` | `any-glitchless` |
| `Super Mario 64 120 Star` | `super-mario-64-120-star` |
| `Café` | `cafe` |

## Field-by-field specification

### game_id
- **Type:** ID
- **Used for:** `_games/<file>.md`, `_runs/<game_id>/...`, URLs like `/games/<game_id>/...`
- **Rules:** General ID rules
- **Examples:** `hades-2`, `dark-souls-1`, `super-mario-64`

### runner_id
- **Type:** ID
- **Used for:** stable runner identity in front matter and any future runner pages
- **Rules:** General ID rules
- **Notes:**
  - `runner` is a display label (can be their current handle).
  - `runner_id` is the stable key (should not change unless necessary).
- **Examples:** `gary-asher`, `aze-card`, `wolfang`

### challenge_id
- **Type:** ID
- **Used for:** linking runs to a known challenge definition for a game
- **Rules:** General ID rules
- **Examples:** `no-hit`, `no-damage`, `deathless`, `pacifist`

### restriction_ids
- **Type:** list of IDs
- **Used for:** structured restrictions applied to a run
- **Rules:** Each entry must follow General ID rules
- **Examples:** `no-dlc`, `no-super-arts`, `blindfolded`

### category_slug
- **Type:** slug, with optional nesting
- **Used for:** run category pages and routing:
  - `/games/<game_id>/runs/<category_slug>/`
- **Rules:**
  - Each segment must follow General ID rules.
  - Segments are separated by `/`.
  - No empty segments.
  - No leading or trailing `/`.
- **Canonical regex (nested):**
  - `^[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$`
- **Examples:**
  - `any`
  - `any-glitchless`
  - `heat/16`
  - `chapter/7a`

### Display labels vs IDs

These pairs must be treated differently:

- `category` (display label) vs `category_slug` (machine slug)
- `runner` (display label) vs `runner_id` (machine ID)
- `restrictions` (display labels) vs `restriction_ids` (machine IDs)

Display labels may include spaces and punctuation. IDs and slugs may not.

## Required vs optional fields for run front matter

This section documents what the tooling should expect for a valid run submission.

### Required
- `game_id`
- `runner` (display)
- `runner_id` (id)
- `category` (display)
- `category_slug` (slug, possibly nested)
- `challenge_id` (id)
- `video_link`
- `date_completed`

### Optional but recommended
- `restrictions` (display list)
- `restriction_ids` (id list, if restricti_
