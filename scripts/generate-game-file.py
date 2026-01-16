#!/usr/bin/env python3
"""
Generate a game markdown file from form submission data.
VERSION 6.1 - Matches current 15-question form (branched platforms + separated involvement)

Current form (summary):
  Q1  - Game Name
  Q2  - Aliases (optional)
  Q3  - Platform Type (branch selector)
  Q4a - Platforms (Retro)  [checkboxes]
  Q4b - Platforms (Modern) [checkboxes]
  Q4c - Platforms (Handheld) [checkboxes]
  Q4d - Platforms (PC/Mobile) [checkboxes]
  Q5  - Categories
  Q6  - Standard Challenge Types
  Q7  - Character Column Label
  Q8  - Character Options
  Q9  - Restrictions
  Q10 - Timing Method
  Q11 - Glitch Category Structure
  Q12 - Glitch Docs
  Q13 - Involvement (credit / moderate)
  Q14 - Discord Handle
  Q15 - Feedback
"""

import json
import os
import re
import sys


def split_by_newlines(s):
    """Split string by newlines only (preserves commas in content)."""
    if not s:
        return []
    s = s.replace("\\n", "\n").replace("\r\n", "\n").replace("\r", "\n")
    items = [line.strip() for line in s.split("\n")]
    return [item for item in items if item]


def split_by_delimiters(s):
    """Split string by newlines, commas, semicolons, or pipes."""
    if not s:
        return []
    s = s.replace("\\n", "\n").replace("\r\n", "\n").replace("\r", "\n")
    s = re.sub(r"[;,|]", "\n", s)
    items = [line.strip() for line in s.split("\n")]
    return [item for item in items if item]


def slugify(s):
    """Convert string to URL-friendly slug."""
    if not s:
        return ""
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s


def yaml_quote(s):
    """Quote a string for YAML output."""
    if not s:
        return '""'
    return json.dumps(str(s))


def load_details(s):
    """Load and parse the details JSON, handling double-encoding."""
    if not s or s == "null":
        return {}
    try:
        obj = json.loads(s)
    except json.JSONDecodeError as e:
        print(f"DEBUG: JSON parse error: {e}", file=sys.stderr)
        return {}

    if isinstance(obj, str):
        try:
            obj2 = json.loads(obj)
            if isinstance(obj2, dict):
                return obj2
        except Exception:
            pass
        return {}

    return obj if isinstance(obj, dict) else {}


def filter_glitch_categories(categories):
    """
    Filter out placeholder options and map to proper slugs/labels.

    NOTE:
    Your new form asks about "Glitch Category Structure". If you later expand this into a
    richer schema, this can be revisited. For now, we keep the existing glitches_data output.
    """
    skip_patterns = [
        "doesn't have",
        "does not have",
        "no meaningful",
        "not sure",
        "n/a",
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
        cat_lower = cat.lower().strip()

        if any(pattern in cat_lower for pattern in skip_patterns):
            continue

        if cat_lower in label_map:
            slug, label = label_map[cat_lower]
        else:
            slug = slugify(cat)
            label = cat.strip()

        if slug and label:
            result.append((slug, label))

    return result


def parse_categories_with_children(categories_raw):
    """Parse categories that may include 'Parent - Child' format."""
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
                if parent not in children_map:
                    children_map[parent] = []
                if child and child not in children_map[parent]:
                    children_map[parent].append(child)
        else:
            cat = line.strip()
            if cat and cat not in categories:
                categories.append(cat)

    return categories, children_map


def truthy(s):
    return str(s or "").strip().lower() in ("true", "yes", "1", "y")


def main():
    # Load environment variables (from GitHub Actions workflow)
    game_name = os.environ.get("GAME_NAME", "")
    game_id = os.environ.get("GAME_ID", "")
    first_letter = os.environ.get("FIRST_LETTER", "")
    categories_raw = os.environ.get("CATEGORIES", "")
    challenges_raw = os.environ.get("CHALLENGES", "")
    char_enabled = os.environ.get("CHAR_ENABLED", "false").strip().lower() == "true"
    char_label = os.environ.get("CHAR_LABEL", "Character") or "Character"
    submitter = os.environ.get("SUBMITTER", "")
    credit_requested = os.environ.get("CREDIT_REQUESTED", "false").strip().lower() == "true"
    details_raw = os.environ.get("DETAILS_IN", "{}")
    out_file = os.environ.get("OUT_FILE", "")

    # Parse details JSON
    details = load_details(details_raw)

    def get_detail(key, default=""):
        v = details.get(key, default)
        return str(v) if v is not None else default

    # -------------------------------------------------------------------------
    # Extract details (UPDATED to match new Apps Script keys)
    # -------------------------------------------------------------------------

    aliases = split_by_newlines(get_detail("name_aliases"))

    # Platforms now come in already canonicalized (newline-separated ids)
    platforms = split_by_newlines(get_detail("platforms"))

    # Glitch field renamed in Apps Script:
    # old: glitch_categories
    # new: glitch_category_structure
    glitch_structure_raw = get_detail("glitch_category_structure")
    glitch_categories_raw = split_by_delimiters(glitch_structure_raw)
    glitch_categories = filter_glitch_categories(glitch_categories_raw)

    glitches_doc = split_by_newlines(get_detail("glitches_doc"))

    restrictions = split_by_newlines(get_detail("restrictions"))
    timing_primary = get_detail("timing_primary", "RTA (Real Time Attack)")
    character_options = split_by_newlines(get_detail("character_options"))

    # Involvement + discord are now separate in the form
    discord_handle = get_detail("discord_handle", submitter).strip()
    wants_credit = truthy(get_detail("wants_credit", "false")) or credit_requested
    wants_moderate = truthy(get_detail("wants_moderate", "false"))
    feedback = get_detail("feedback", "")

    if discord_handle:
        submitter = discord_handle

    # Debug output
    print("DEBUG: Parsed details:", file=sys.stderr)
    print(f"  - aliases: {aliases}", file=sys.stderr)
    print(f"  - platforms: {platforms}", file=sys.stderr)
    print(f"  - glitch_structure_raw: {glitch_structure_raw}", file=sys.stderr)
    print(f"  - glitch_categories: {glitch_categories}", file=sys.stderr)
    print(f"  - restrictions: {restrictions}", file=sys.stderr)

    # -------------------------------------------------------------------------
    # Parse categories + challenges (from env, not details)
    # -------------------------------------------------------------------------

    categories, children_map = parse_categories_with_children(categories_raw)
    challenges = split_by_delimiters(challenges_raw)

    # -------------------------------------------------------------------------
    # Generate YAML output
    # -------------------------------------------------------------------------

    lines = []
    lines.append("---")
    lines.append("layout: game")
    lines.append(f"game_id: {game_id}")
    lines.append(f"name: {yaml_quote(game_name)}")

    if aliases:
        lines.append("name_aliases:")
        for alias in aliases:
            lines.append(f"  - {yaml_quote(alias)}")
    else:
        lines.append("name_aliases: []")
    lines.append("")

    # Cover image
    lines.append(f"cover: /assets/img/games/{first_letter}/{game_id}.jpg")
    lines.append("cover_position: center")
    lines.append("")

    # Status and reviewers
    status_text = f"Pending review - submitted by {submitter}" if submitter else "Pending review"
    lines.append(f"status: {yaml_quote(status_text)}")
    lines.append("reviewers: []")
    lines.append("")

    # Genres (empty, to be filled by reviewer)
    lines.append("genres: []")
    lines.append("")

    # Platforms
    if platforms:
        lines.append("platforms:")
        for p in platforms:
            lines.append(f"  - {p}")
    else:
        lines.append("platforms: []")
    lines.append("")

    # Tabs
    lines.append("tabs:")
    lines.append("  overview: true")
    lines.append("  runs: true")
    lines.append("  history: true")
    lines.append("  resources: true")
    lines.append("  forum: true")
    lines.append("  extra_1: false")
    lines.append("  extra_2: false")
    lines.append("")

    # Categories data
    lines.append("categories_data:")
    for cat in categories:
        cat_slug = slugify(cat)
        lines.append(f"  - slug: {cat_slug}")
        lines.append(f"    label: {yaml_quote(cat)}")

        if cat in children_map:
            lines.append("    children:")
            for child in children_map[cat]:
                lines.append(f"      - slug: {slugify(child)}")
                lines.append(f"        label: {yaml_quote(child)}")
    lines.append("")

    # Character column
    lines.append("character_column:")
    lines.append(f"  enabled: {str(char_enabled).lower()}")
    lines.append(f"  label: {yaml_quote(char_label)}")
    lines.append("")

    # Standard challenges
    lines.append("challenges:")
    if challenges:
        for ch in challenges:
            lines.append(f"  - {slugify(ch)}")
    else:
        lines.append("  []")
    lines.append("")

    # Restrictions
    if restrictions:
        lines.append("restrictions:")
        for r in restrictions:
            lines.append(f"  - {yaml_quote(r)}")
    else:
        lines.append("restrictions: []")
    lines.append("")

    # Glitch categories (still produced as glitches_data)
    lines.append("glitches_data:")
    if glitch_categories:
        for slug, label in glitch_categories:
            lines.append(f"  - slug: {slug}")
            lines.append(f"    label: {yaml_quote(label)}")
    else:
        # Safe defaults
        lines.append('  - slug: unrestricted')
        lines.append('    label: "Unrestricted"')
        lines.append('  - slug: glitchless')
        lines.append('    label: "Glitchless"')
    lines.append("")

    # Timing
    lines.append(f"timing_method: {yaml_quote(timing_primary)}")
    lines.append("---")
    lines.append("")

    # Reviewer notes (hidden in HTML comment, removed on promotion)
    notes = []
    if submitter:
        notes.append(f"Submitted by: {submitter}")
    if wants_credit:
        notes.append("Credit requested: Yes")
    if wants_moderate:
        notes.append("Moderation interest: Yes")

    if character_options:
        notes.append("")
        notes.append("Character/Weapon/Class options:")
        for opt in character_options:
            notes.append(f"  - {opt}")

    if glitches_doc:
        notes.append("")
        notes.append("Glitch documentation:")
        for doc in glitches_doc:
            notes.append(f"  - {doc}")

    if feedback:
        notes.append("")
        notes.append("Submitter feedback:")
        notes.append(feedback.replace("\\n", "\n"))

    if notes:
        lines.append("<!-- REVIEWER NOTES")
        lines.append("")
        for note in notes:
            lines.append(note)
        lines.append("")
        lines.append("-->")

    # Write output
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"✓ Generated {out_file}")
    print(f"  - {len(categories)} categories")
    print(f"  - {len(challenges)} standard challenges")
    print(f"  - {len(glitch_categories)} glitch categories")
    print(f"  - {len(platforms)} platforms")


if __name__ == "__main__":
    main()
