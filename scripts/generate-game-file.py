#!/usr/bin/env python3
"""
Generate a game markdown file from form submission data.

VERSION 7.0
- Outputs canonical CRC game front matter keys for compatibility with:
  - scripts/generate-form-index.js
  - /submit-run/ dropdowns
  - game runs pages

Canonical keys this script writes:
  - name_aliases
  - platforms
  - categories_data (supports "Parent - Child")
  - character_column (enabled + label)
  - characters_data (only if enabled and options provided)
  - challenges_data (standard challenges as {slug,label})
  - community_challenges (always present, empty by default)
  - restrictions_data (as {slug,label})
  - glitches_data (only if relevant; otherwise glitches_relevant: false)
  - timing_method
  - reviewers, genres, tabs, cover, status

Inputs:
  Env vars set by GitHub Actions:
    GAME_NAME, GAME_ID, FIRST_LETTER
    CATEGORIES, CHALLENGES
    CHAR_ENABLED, CHAR_LABEL
    SUBMITTER, CREDIT_REQUESTED
    DETAILS_IN (json), OUT_FILE
"""

import json
import os
import re
import sys


def split_by_newlines(s: str):
    if not s:
        return []
    s = str(s).replace("\\n", "\n").replace("\r\n", "\n").replace("\r", "\n")
    items = [line.strip() for line in s.split("\n")]
    return [item for item in items if item]


def split_by_delimiters(s: str):
    if not s:
        return []
    s = str(s).replace("\\n", "\n").replace("\r\n", "\n").replace("\r", "\n")
    s = re.sub(r"[;,|]", "\n", s)
    items = [line.strip() for line in s.split("\n")]
    return [item for item in items if item]


def slugify(s: str):
    if not s:
        return ""
    s = str(s).lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s


def yaml_quote(s: str):
    # JSON quoting is valid YAML for strings, and avoids escaping headaches.
    if s is None:
        return '""'
    s = str(s)
    if s == "":
        return '""'
    return json.dumps(s)


def load_details(s: str):
    """Load and parse DETAILS_IN JSON, handling possible double encoding."""
    if not s or s == "null":
        return {}
    try:
        obj = json.loads(s)
    except json.JSONDecodeError as e:
        print(f"DEBUG: DETAILS_IN JSON parse error: {e}", file=sys.stderr)
        return {}

    if isinstance(obj, str):
        try:
            obj2 = json.loads(obj)
            return obj2 if isinstance(obj2, dict) else {}
        except Exception:
            return {}

    return obj if isinstance(obj, dict) else {}


def truthy(v):
    return str(v or "").strip().lower() in ("true", "yes", "1", "y", "on")


def parse_categories_with_children(categories_raw: str):
    """
    Parse newline-separated categories.
    Supports:
      - "Parent - Child"
      - "Parent - Child - Grandchild" (treated as Parent -> "Child - Grandchild")
    """
    lines = split_by_newlines(categories_raw)
    categories = []
    children_map = {}

    for line in lines:
        if " - " in line:
            parent, child = line.split(" - ", 1)
            parent = parent.strip()
            child = child.strip()
            if parent and parent not in categories:
                categories.append(parent)
            if parent:
                children_map.setdefault(parent, [])
                if child and child not in children_map[parent]:
                    children_map[parent].append(child)
        else:
            cat = line.strip()
            if cat and cat not in categories:
                categories.append(cat)

    return categories, children_map


def filter_glitch_categories(categories):
    """
    Filter out placeholder options and map to proper slugs/labels.
    If user selected an option meaning "no meaningful glitches", return [].
    """
    skip_patterns = [
        "doesn't have",
        "does not have",
        "no meaningful",
        "not sure",
        "n/a",
        "none",
        "no glitches",
        "no glitch",
        "not relevant",
    ]

    label_map = {
        "unrestricted (all glitches allowed)": ("unrestricted", "Unrestricted"),
        "unrestricted": ("unrestricted", "Unrestricted"),
        "no major glitches (nmg)": ("nmg", "No Major Glitches (NMG)"),
        "no major glitches": ("nmg", "No Major Glitches (NMG)"),
        "nmg": ("nmg", "No Major Glitches (NMG)"),
        "glitchless": ("glitchless", "Glitchless"),
    }

    result = []
    for cat in categories:
        cat_lower = str(cat).lower().strip()
        if not cat_lower:
            continue
        if any(pat in cat_lower for pat in skip_patterns):
            continue

        if cat_lower in label_map:
            slug, label = label_map[cat_lower]
        else:
            slug = slugify(cat)
            label = str(cat).strip()

        if slug and label:
            result.append((slug, label))

    # De-dupe by slug while preserving order
    seen = set()
    out = []
    for slug, label in result:
        if slug in seen:
            continue
        seen.add(slug)
        out.append((slug, label))
    return out


def main():
    # Required env vars
    game_name = os.environ.get("GAME_NAME", "").strip()
    game_id = os.environ.get("GAME_ID", "").strip()
    first_letter = os.environ.get("FIRST_LETTER", "").strip()
    categories_raw = os.environ.get("CATEGORIES", "")
    challenges_raw = os.environ.get("CHALLENGES", "")
    char_enabled = os.environ.get("CHAR_ENABLED", "false").strip().lower() == "true"
    char_label = (os.environ.get("CHAR_LABEL", "Character") or "Character").strip()
    submitter = os.environ.get("SUBMITTER", "").strip()
    credit_requested = os.environ.get("CREDIT_REQUESTED", "false").strip().lower() == "true"
    details_raw = os.environ.get("DETAILS_IN", "{}")
    out_file = os.environ.get("OUT_FILE", "").strip()

    if not game_name:
        print("ERROR: GAME_NAME is empty", file=sys.stderr)
        sys.exit(1)
    if not game_id:
        print("ERROR: GAME_ID is empty", file=sys.stderr)
        sys.exit(1)
    if not first_letter:
        first_letter = game_id[:1] if game_id else "x"
    if not out_file:
        print("ERROR: OUT_FILE is empty", file=sys.stderr)
        sys.exit(1)

    # Details JSON
    details = load_details(details_raw)

    def get_detail(key, default=""):
        v = details.get(key, default)
        return default if v is None else v

    # Details fields (Apps Script keys)
    aliases = split_by_newlines(get_detail("name_aliases", ""))
    platforms = split_by_newlines(get_detail("platforms", ""))

    # Glitches
    glitch_structure_raw = str(get_detail("glitch_category_structure", "") or "")
    glitch_categories_raw = split_by_delimiters(glitch_structure_raw)
    glitch_categories = filter_glitch_categories(glitch_categories_raw)
    glitches_doc = split_by_newlines(get_detail("glitches_doc", ""))

    # Restrictions
    restrictions = split_by_newlines(get_detail("restrictions", ""))

    # Timing
    timing_primary = str(get_detail("timing_primary", "RTA (Real Time Attack)") or "RTA (Real Time Attack)").strip()

    # Character options
    character_options = split_by_newlines(get_detail("character_options", ""))

    # Involvement + discord
    discord_handle = str(get_detail("discord_handle", submitter) or "").strip()
    wants_credit = truthy(get_detail("wants_credit", "false")) or credit_requested
    wants_moderate = truthy(get_detail("wants_moderate", "false"))
    feedback = str(get_detail("feedback", "") or "")

    if discord_handle:
        submitter = discord_handle

    # Categories + standard challenges come from env (workflow)
    categories, children_map = parse_categories_with_children(categories_raw)
    standard_challenges = split_by_delimiters(challenges_raw)

    # Debug
    print("DEBUG: Parsed details:", file=sys.stderr)
    print(f"  - game_id: {game_id}", file=sys.stderr)
    print(f"  - aliases: {aliases}", file=sys.stderr)
    print(f"  - platforms: {platforms}", file=sys.stderr)
    print(f"  - glitch_structure_raw: {glitch_structure_raw}", file=sys.stderr)
    print(f"  - glitch_categories: {glitch_categories}", file=sys.stderr)
    print(f"  - restrictions: {restrictions}", file=sys.stderr)
    print(f"  - char_enabled: {char_enabled}, char_label: {char_label}", file=sys.stderr)
    print(f"  - character_options: {len(character_options)}", file=sys.stderr)
    print(f"  - standard_challenges: {standard_challenges}", file=sys.stderr)

    lines = []
    lines.append("---")
    lines.append("layout: game")
    lines.append(f"game_id: {game_id}")
    lines.append("reviewers: []")
    lines.append("")
    lines.append(f"name: {yaml_quote(game_name)}")

    if aliases:
        lines.append("name_aliases:")
        for a in aliases:
            lines.append(f"  - {yaml_quote(a)}")
    else:
        lines.append("name_aliases: []")
    lines.append("")

    # Cover image
    lines.append(f"cover: /assets/img/games/{first_letter}/{game_id}.jpg")
    lines.append("cover_position: center")
    lines.append("")

    # Status + genres
    status_text = f"Pending review - submitted by {submitter}" if submitter else "Pending review"
    lines.append(f"status: {yaml_quote(status_text)}")
    lines.append("genres: []")
    lines.append("")

    # Platforms
    if platforms:
        lines.append("platforms:")
        for p in platforms:
            # platforms are expected to be canonical ids already
            lines.append(f"  - {p}")
    else:
        lines.append("platforms: []")
    lines.append("")

    # Tabs (default)
    lines.append("tabs:")
    lines.append("  overview: true")
    lines.append("  runs: true")
    lines.append("  history: true")
    lines.append("  resources: true")
    lines.append("  forum: true")
    lines.append("  extra_1: false")
    lines.append("  extra_2: false")
    lines.append("")

    # Character column
    lines.append("character_column:")
    lines.append(f"  enabled: {str(bool(char_enabled)).lower()}")
    lines.append(f"  label: {yaml_quote(char_label)}")
    lines.append("")

    # Character options (only if enabled and provided)
    if char_enabled and character_options:
        lines.append("characters_data:")
        for opt in character_options:
            o = opt.strip()
            if not o:
                continue
            lines.append(f"  - slug: {slugify(o)}")
            lines.append(f"    label: {yaml_quote(o)}")
        lines.append("")

    # Categories
    lines.append("categories_data:")
    if categories:
        for cat in categories:
            cat_name = cat.strip()
            if not cat_name:
                continue
            cat_slug = slugify(cat_name)
            if not cat_slug:
                continue
            lines.append(f"  - slug: {cat_slug}")
            lines.append(f"    label: {yaml_quote(cat_name)}")
            if cat in children_map and children_map[cat]:
                lines.append("    children:")
                for child in children_map[cat]:
                    child_name = child.strip()
                    if not child_name:
                        continue
                    lines.append(f"      - slug: {slugify(child_name)}")
                    lines.append(f"        label: {yaml_quote(child_name)}")
    else:
        lines.append("  []")
    lines.append("")

    # Standard challenges (canonical)
    lines.append("challenges_data:")
    if standard_challenges:
        for ch in standard_challenges:
            ch_name = ch.strip()
            if not ch_name:
                continue
            ch_slug = slugify(ch_name)
            if not ch_slug:
                continue
            lines.append(f"  - slug: {ch_slug}")
            lines.append(f"    label: {yaml_quote(ch_name)}")
    else:
        lines.append("  []")
    lines.append("")

    # Community challenges (always present, empty by default)
    lines.append("community_challenges: []")
    lines.append("")

    # Restrictions (canonical)
    lines.append("restrictions_data:")
    if restrictions:
        for r in restrictions:
            r_name = r.strip()
            if not r_name:
                continue
            r_slug = slugify(r_name)
            if not r_slug:
                continue
            lines.append(f"  - slug: {r_slug}")
            lines.append(f"    label: {yaml_quote(r_name)}")
    else:
        lines.append("  []")
    lines.append("")

    # Glitches
    if glitch_categories:
        lines.append("glitches_data:")
        for slug, label in glitch_categories:
            lines.append(f"  - slug: {slug}")
            lines.append(f"    label: {yaml_quote(label)}")
        lines.append("")
    else:
        lines.append("glitches_relevant: false")
        lines.append("")

    # Timing
    lines.append(f"timing_method: {yaml_quote(timing_primary)}")
    lines.append("---")
    lines.append("")

    # Reviewer notes (hidden comment; safe to remove on promotion)
    notes = []
    if submitter:
        notes.append(f"Submitted by: {submitter}")
    if wants_credit:
        notes.append("Credit requested: Yes")
    if wants_moderate:
        notes.append("Moderation interest: Yes")

    if character_options:
        notes.append("")
        notes.append("Character options:")
        for opt in character_options:
            if opt.strip():
                notes.append(f"  - {opt.strip()}")

    if glitches_doc:
        notes.append("")
        notes.append("Glitch documentation:")
        for doc in glitches_doc:
            if doc.strip():
                notes.append(f"  - {doc.strip()}")

    if feedback.strip():
        notes.append("")
        notes.append("Submitter feedback:")
        notes.append(feedback.replace("\\n", "\n"))

    if notes:
        lines.append("<!-- REVIEWER NOTES")
        lines.append("")
        lines.extend(notes)
        lines.append("")
        lines.append("-->")

    with open(out_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"✓ Generated {out_file}")
    print(f"  - categories: {len(categories)}")
    print(f"  - standard challenges: {len(standard_challenges)}")
    print(f"  - restrictions: {len(restrictions)}")
    print(f"  - glitch categories: {len(glitch_categories)}")
    print(f"  - platforms: {len(platforms)}")
    print(f"  - characters: {len(character_options) if (char_enabled and character_options) else 0}")


if __name__ == "__main__":
    main()
