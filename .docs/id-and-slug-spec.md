# ID and Slug Spec

This document defines the canonical formats and rules for all IDs and slugs used by the site and its tooling.

Anything that validates runs, generates pages, reviews submissions, or builds routes should follow this spec.

This document is intended to be both:
- a reference (what is allowed)
- an explanation (why the rules exist)

---

## Goals

- Human-readable identifiers that are stable over time
- Safe for URLs, file paths, YAML front matter, and GitHub
- Deterministic slugify behavior so contributors and scripts agree
- Clear separation between machine-facing identifiers and human-facing labels

---

## Vocabulary

### Display label
Human-facing text used for presentation and UI.

- May contain spaces, punctuation, capitalization, emojis, and non-ASCII characters
- Can change over time without breaking history

Examples:
- Hades II
- Underworld Any%
- No Hit / No Damage

### ID / Slug
Machine-facing identifier used for routing, lookups, validation, and automation.

- Must follow strict rules
- Should be treated as stable once created

Examples:
- hades-2
- underworld-any
- no-hit-no-damage

---

## General ID rules  
(applies to all IDs unless otherwise specified)

### Allowed characters
- Lowercase letters a–z
- Digits 0–9
- Hyphen -

### Structure rules
- Must be lowercase
- Must not contain spaces
- Must not start or end with a hyphen
- Must not contain double hyphens
- Recommended maximum length: 64 characters  
  - There is currently no enforced hard maximum  
  - Excessively long IDs are discouraged

### Canonical pattern
All single-segment IDs must match this RegEx:
`^[a-z0-9]+(?:-[a-z0-9]+)*$`

---

## Slugify rules

When converting a display label to an ID or slug, apply these steps in order:

1. Trim leading and trailing whitespace
2. Convert to lowercase
3. Convert accented characters to their base form (example: é → e)
4. Replace any sequence of spaces, underscores, or hyphens with a single hyphen
5. Remove any remaining characters not allowed by the ID rules
6. Collapse multiple hyphens into one
7. Trim hyphens from the start and end

### Slugify examples

| Display label | Resulting slug |
|-------------|----------------|
| Hades II | hades-2 |
| No Hit / No Damage | no-hit-no-damage |
| Any% (Glitchless) | any-glitchless |
| Super Mario 64 120 Star | super-mario-64-120-star |
| Café | cafe |

---

## Field-by-field specification

### game_id
- Type: ID
- Used for:
  - `_games/<game_id>.md`
  - `_runs/<game_id>/...`
  - `_queue_runs/<game_id>/...`
  - URLs like `/games/<game_id>/...`
- Rules: General ID rules apply
- Notes: Filename must match `game_id` exactly
- Examples: hades-2, dark-souls-1, super-mario-64

---

### runner_id
- Type: ID
- Used for: Stable runner identity in front matter and future runner pages
- Rules: General ID rules apply
- Notes:
  - `runner` is a display label and may change
  - `runner_id` is the stable key and should not change unless necessary
- Examples: gary-asher, aze-card

---

### challenge_id
- Type: ID
- Used for: Linking runs to a known challenge definition
- Rules: General ID rules apply

Canonical source: `_data/challenges.yml`

All `challenge_id` values must correspond to a key in `_data/challenges.yml`.

Validators may support aliases for convenience, but stored values should always
use the canonical ID.

Examples (canonical):
- hitless
- damageless
- no-hit-no-damage

---

### restriction_ids
- Type: List of IDs
- Used for: Structured, machine-readable restrictions applied to a run
- Rules: Each entry must follow General ID rules
- Notes:
  - If `restrictions` (display labels) are present, `restriction_ids`
    should also be present and aligned by index
- Examples: no-dlc, no-super-arts, blindfolded

---

### category_slug
- Type: Slug, with optional nesting
- Used for: Run category pages and routing

Route format:
- `/games/<game_id>/runs/<category_slug>/`

#### Nesting rules
- Each segment must follow General ID rules
- Segments are separated by `/`
- No empty segments
- No leading or trailing `/`

All category slugs must match this RegEx:
`^[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$`

#### Why nesting exists
Nested category slugs allow related categories to share a hierarchy
(for example: difficulty splits, route splits, or weapon splits)
while still producing stable URLs.

The category generator automatically creates parent category pages
so navigation remains valid.

Examples:
- any
- underworld-any
- surface-vor4
- weapon/sword
- underworld/heat/16

---

## Display labels vs IDs

These pairs must be treated differently:

- `category` (display) vs `category_slug` (ID)
- `runner` (display) vs `runner_id` (ID)
- `restrictions` (display) vs `restriction_ids` (ID)

Display labels may include spaces and punctuation.  
IDs and slugs may not.

---

## Required vs optional fields for run front matter (conceptual)

This section documents intent.

Actual enforcement is handled by validation scripts and may be stricter
for queued submissions than for approved runs.

### Required
- game_id
- runner (display)
- runner_id
- category (display)
- category_slug
- challenge_id
- video_link
- date_completed

### Optional but recommended
- restrictions
- restriction_ids
- time
- timing_method
- date_submitted

### Moderator / verification fields
- verified (boolean)
- verified_by (string, required if verified is true)

---

## Normalization rules (canonical storage)

- Store all IDs and slugs in lowercase
- Prefer stable keys over mutable labels
- Avoid renaming IDs once they are in use
- If a display label changes, do not change its ID unless absolutely necessary

---

## Reserved and discouraged values

These are not strictly banned, but should be avoided as IDs or slugs
to prevent confusion with routes or tooling:

- new, edit, admin, api, assets, static
- games, runs, runners

Purely numeric IDs are discouraged for top-level identifiers, but may be used
for nested category segments (example: heat/16).

---

## Compliance checklist

When reviewing a submission or writing tooling:

- IDs match this RegEx: 
`^[a-z0-9]+(?:-[a-z0-9]+)*$`
- category_slug matches RegEx: 
`^[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$`
- Display labels are free-form, IDs are strict
- All IDs are lowercase
- No double hyphens
- No leading or trailing hyphens

---
