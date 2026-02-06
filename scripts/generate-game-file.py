#!/usr/bin/env python3
"""
generate-game-file.py

Create a standardized CRC game file in _queue_games/<game_id>.md

This script reads from ENVIRONMENT VARIABLES (set by GitHub Actions):
  - GAME_NAME (required)
  - GAME_ID (required)
  - FULL_RUN_CATEGORIES (required, newline-separated)
  - CHALLENGES (required, comma-separated challenge types)
  - CHAR_ENABLED (optional, "true"/"false")
  - CHAR_LABEL (optional, e.g., "Weapon / Aspect")
  - IS_MODDED (optional, "true"/"false" - marks this as a modded version of another game)
  - BASE_GAME (optional, game_id of the parent game, required when IS_MODDED is true)
  - SUBMITTER (optional, Discord handle)
  - CREDIT_REQUESTED (optional, "true"/"false")
  - DETAILS_IN (optional, JSON string with additional fields)
  - OUT_FILE (required, output path)

Usage:
  # Set env vars then run:
  python3 scripts/generate-game-file.py

Section Order (matches website navigation):
  1. Header (layout, game_id, status, reviewers, modded info)
  2. Game Info (name, aliases, genres, platforms)
  3. Tabs
  4. General Rules
  5. Challenges (Full Runs)
  6. Restrictions & Conditions
  7. Glitch Categories
  8. Full Runs
  9. Mini-Challenges
  10. Community Created Runs
  11. Timing Method
  12. Character Options
  13. Cover/Display
  14. Submission Metadata
"""

from __future__ import annotations

import json
import os
import re
import sys
from typing import Any, Dict, List


def slugify(s: str) -> str:
    """Convert string to URL-friendly slug."""
    s = (s or "").strip()
    
    # Special case mappings (preserve meaningful slugs)
    special_cases = {
        "100%": "100-percent",
        "any%": "any-percent",
        "low%": "low-percent",
        "all%": "all-percent",
        "true%": "true-percent",
    }
    
    # Check for special cases (case-insensitive)
    s_lower = s.lower()
    if s_lower in special_cases:
        return special_cases[s_lower]
    
    # Standard slugify
    s = s.lower()
    s = re.sub(r"['']", "", s)
    s = re.sub(r"%", "-percent", s)  # Handle % in other contexts
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-{2,}", "-", s)
    s = s.strip("-")
    return s


def parse_newline_list(s: str) -> List[str]:
    """Parse newline-separated string into list."""
    if not s:
        return []
    return [line.strip() for line in s.strip().split("\n") if line.strip()]


def parse_comma_list(s: str) -> List[str]:
    """Parse comma-separated string into list."""
    if not s:
        return []
    return [item.strip() for item in s.split(",") if item.strip()]


def as_bool(x: Any, default: bool = False) -> bool:
    """Convert value to boolean."""
    if isinstance(x, bool):
        return x
    if isinstance(x, str):
        return x.strip().lower() in ("true", "yes", "1", "y", "on")
    return default


def yaml_quote(s: str) -> str:
    """Quote string for YAML if needed."""
    if s == "":
        return '""'
    if re.search(r'[:\[\]\{\},#&*!|>\'"%@`\n]', s) or s.strip() != s:
        return json.dumps(s)
    return s


def section_header(title: str) -> List[str]:
    """Generate a section header comment."""
    return [
        "",
        "# =============================================================================",
        f"# {title}",
        "# =============================================================================",
    ]


def build_yaml_list(items: List[str], indent: int = 0) -> List[str]:
    """Build YAML list lines."""
    sp = "  " * indent
    if not items:
        return [f"{sp}[]"]
    return [f"{sp}- {yaml_quote(item)}" for item in items]


def build_categories_yaml(categories: List[str]) -> List[str]:
    """Build categories YAML section."""
    lines = []
    for cat in categories:
        slug = slugify(cat)
        if not slug:
            continue
        lines.append(f"  - slug: {yaml_quote(slug)}")
        lines.append(f"    label: {yaml_quote(cat)}")
        lines.append(f'    description: ""')
        lines.append("")
    return lines


def build_challenges_yaml(challenges: List[str]) -> List[str]:
    """Build challenges_data YAML section."""
    lines = []
    for ch in challenges:
        slug = slugify(ch)
        if not slug:
            continue
        lines.append(f"  - slug: {yaml_quote(slug)}")
        lines.append(f"    label: {yaml_quote(ch)}")
        lines.append(f'    description: ""')
        lines.append("")
    return lines


def main() -> None:
    # Read environment variables
    game_name = os.environ.get("GAME_NAME", "").strip()
    game_id = os.environ.get("GAME_ID", "").strip()
    full_run_categories_raw = os.environ.get("FULL_RUN_CATEGORIES", "").strip()
    challenges_raw = os.environ.get("CHALLENGES", "").strip()
    char_enabled = as_bool(os.environ.get("CHAR_ENABLED", "false"))
    char_label = os.environ.get("CHAR_LABEL", "Character").strip()
    is_modded = as_bool(os.environ.get("IS_MODDED", "false"))
    base_game = os.environ.get("BASE_GAME", "").strip()
    submitter = os.environ.get("SUBMITTER", "").strip()
    credit_requested = as_bool(os.environ.get("CREDIT_REQUESTED", "false"))
    details_raw = os.environ.get("DETAILS_IN", "{}").strip()
    out_file = os.environ.get("OUT_FILE", "").strip()

    # Validate required fields
    if not game_name:
        print("ERROR: GAME_NAME is required", file=sys.stderr)
        sys.exit(1)
    if not game_id:
        game_id = slugify(game_name)
    if not game_id:
        print("ERROR: Could not generate GAME_ID", file=sys.stderr)
        sys.exit(1)
    if not full_run_categories_raw:
        print("ERROR: FULL_RUN_CATEGORIES is required", file=sys.stderr)
        sys.exit(1)
    if not out_file:
        print("ERROR: OUT_FILE is required", file=sys.stderr)
        sys.exit(1)
    if is_modded and not base_game:
        print("ERROR: BASE_GAME is required when IS_MODDED is true", file=sys.stderr)
        sys.exit(1)

    # Parse details JSON
    try:
        details = json.loads(details_raw) if details_raw else {}
    except json.JSONDecodeError:
        details = {}

    # Parse lists
    full_run_categories = parse_newline_list(full_run_categories_raw)
    challenges = parse_comma_list(challenges_raw)

    # Extract additional fields from details
    aliases_raw = details.get("game_name_aliases", "")
    aliases = parse_newline_list(aliases_raw) if aliases_raw else []
    
    platforms_raw = details.get("platforms", "")
    platforms = parse_newline_list(platforms_raw) if platforms_raw else []
    
    restrictions_raw = details.get("restrictions", "")
    restrictions = parse_newline_list(restrictions_raw) if restrictions_raw else []
    
    # Mini-challenge categories from details
    mini_challenge_categories_raw = details.get("mini_challenge_categories", "")
    mini_challenge_categories = parse_newline_list(mini_challenge_categories_raw) if mini_challenge_categories_raw else []
    
    glitch_structure = details.get("glitch_category_structure", "")
    glitch_docs = details.get("glitches_doc", "")
    timing_primary = details.get("timing_primary", "RTA (Real Time Attack)")
    
    character_options_raw = details.get("character_options", "")
    character_options = parse_newline_list(character_options_raw) if character_options_raw else []

    # =========================================================================
    # BUILD THE FILE CONTENT
    # =========================================================================
    lines = ["---"]
    
    # -------------------------------------------------------------------------
    # HEADER
    # -------------------------------------------------------------------------
    lines.append("layout: game")
    lines.append(f"game_id: {yaml_quote(game_id)}")
    lines.append('status: "Pending Review"')
    lines.append("reviewers: []")
    
    # Modded game info (if applicable)
    if is_modded:
        lines.append("")
        lines.extend(section_header("MODDED GAME INFO"))
        lines.append("is_modded: true")
        lines.append(f"base_game: {yaml_quote(base_game)}")
    
    # -------------------------------------------------------------------------
    # GAME INFO
    # -------------------------------------------------------------------------
    lines.extend(section_header("GAME INFO"))
    lines.append(f"game_name: {yaml_quote(game_name)}")
    
    if aliases:
        lines.append("game_name_aliases:")
        for alias in aliases:
            lines.append(f"  - {yaml_quote(alias)}")
    else:
        lines.append("game_name_aliases: []")
    
    lines.append("")
    lines.append("genres: []  # To be filled during review")
    lines.append("")
    
    if platforms:
        lines.append("platforms:")
        for p in platforms:
            lines.append(f"  - {yaml_quote(p)}")
    else:
        lines.append("platforms: []")
    
    # -------------------------------------------------------------------------
    # TABS
    # -------------------------------------------------------------------------
    lines.extend(section_header("TABS"))
    lines.append("tabs:")
    lines.append("  overview: true")
    lines.append("  runs: true")
    lines.append("  rules: true")
    lines.append("  history: true")
    lines.append("  resources: true")
    lines.append("  forum: false")
    lines.append("  extra_1: false")
    lines.append("  extra_2: false")
    
    # -------------------------------------------------------------------------
    # GENERAL RULES
    # -------------------------------------------------------------------------
    lines.extend(section_header("GENERAL RULES"))
    lines.append("# Leave empty to use global defaults from _data/default-rules.yml")
    lines.append("# Override by adding game-specific rules here")
    lines.append('general_rules: ""')
    
    # -------------------------------------------------------------------------
    # CHALLENGES (FULL RUNS)
    # -------------------------------------------------------------------------
    lines.extend(section_header("CHALLENGES (FULL RUNS)"))
    lines.append("# Challenge types that can be stacked on Full Runs")
    lines.append("challenges_data:")
    if challenges:
        lines.extend(build_challenges_yaml(challenges))
    else:
        lines.append("  []")
    
    # -------------------------------------------------------------------------
    # RESTRICTIONS & CONDITIONS
    # -------------------------------------------------------------------------
    lines.extend(section_header("RESTRICTIONS & CONDITIONS"))
    lines.append("restrictions_data:")
    if restrictions:
        for r in restrictions:
            r_slug = slugify(r)
            if r_slug:
                lines.append(f"  - slug: {yaml_quote(r_slug)}")
                lines.append(f"    label: {yaml_quote(r)}")
                lines.append('    description: ""')
                lines.append("")
    else:
        lines.append("  []")
    
    # -------------------------------------------------------------------------
    # GLITCH CATEGORIES
    # -------------------------------------------------------------------------
    lines.extend(section_header("GLITCH CATEGORIES"))
    lines.append("# Descriptions fall back to _data/default-rules.yml if empty")
    lines.append("glitches_data:")
    if "no structure" in glitch_structure.lower() or "single" in glitch_structure.lower():
        lines.append("  - slug: any")
        lines.append('    label: "Any"')
        lines.append('    description: ""')
    else:
        lines.append("  - slug: unrestricted")
        lines.append('    label: "Unrestricted"')
        lines.append('    description: ""')
        lines.append("")
        lines.append("  - slug: nmg")
        lines.append('    label: "No Major Glitches"')
        lines.append('    description: ""')
        lines.append("")
        lines.append("  - slug: glitchless")
        lines.append('    label: "Glitchless"')
        lines.append('    description: ""')
    
    # Glitch documentation as comments
    if glitch_docs:
        lines.append("")
        lines.append("# Glitch documentation links:")
        for doc_line in parse_newline_list(glitch_docs):
            lines.append(f"# - {doc_line}")
    
    # -------------------------------------------------------------------------
    # FULL RUNS
    # -------------------------------------------------------------------------
    lines.extend(section_header("FULL RUNS"))
    lines.append("# Run Type: Full Runs - require reaching some kind of ending")
    lines.append("full_runs:")
    if full_run_categories:
        lines.extend(build_categories_yaml(full_run_categories))
    else:
        lines.append("  []")
    
    # -------------------------------------------------------------------------
    # MINI-CHALLENGES
    # -------------------------------------------------------------------------
    lines.extend(section_header("MINI-CHALLENGES"))
    lines.append("# Run Type: Mini-Challenges - individual level, boss, or short segments")
    lines.append("# Challenges for Mini-Challenges are configured separately by moderators")
    lines.append("# Note: Deathless is excluded by default for Mini-Challenges")
    lines.append("mini_challenges:")
    if mini_challenge_categories:
        lines.extend(build_categories_yaml(mini_challenge_categories))
    else:
        lines.append("  []")
    lines.append("")
    lines.append("# Challenges allowed for Mini-Challenges (moderators configure this)")
    lines.append("# Deathless is excluded by default")
    lines.append("mini_challenges_allowed_challenges: []")
    
    # -------------------------------------------------------------------------
    # COMMUNITY CREATED RUNS
    # -------------------------------------------------------------------------
    lines.extend(section_header("COMMUNITY CREATED RUNS"))
    lines.append("# Run Type: Community Created - player-made challenges promoted from forum")
    lines.append("# These are unique challenges made by community members")
    lines.append("community_created: []")
    lines.append("# Example:")
    lines.append("#   - slug: no-dash")
    lines.append('#     label: "No Dash"')
    lines.append('#     description: "Complete a run without using the dash ability."')
    lines.append("#     creator: runner-slug")
    lines.append("#     created_date: 2026-01-15")
    lines.append("#     promoted_from_forum: true")
    lines.append("")
    lines.append("# Challenges allowed for Community Created Runs (moderators configure this)")
    lines.append("community_created_allowed_challenges: []")
    
    # -------------------------------------------------------------------------
    # TIMING METHOD
    # -------------------------------------------------------------------------
    lines.extend(section_header("TIMING METHOD"))
    timing_method = "RTA"
    if "IGT" in timing_primary.upper():
        timing_method = "IGT"
    elif "LRT" in timing_primary.upper():
        timing_method = "LRT"
    lines.append(f"timing_method: {timing_method}")
    lines.append("rta_timing: true")
    
    # -------------------------------------------------------------------------
    # CHARACTER OPTIONS
    # -------------------------------------------------------------------------
    lines.extend(section_header("CHARACTER OPTIONS"))
    lines.append("character_column:")
    lines.append(f"  enabled: {'true' if char_enabled else 'false'}")
    lines.append(f"  label: {yaml_quote(char_label)}")
    lines.append("")
    
    if char_enabled and character_options:
        lines.append("characters_data:")
        for ch in character_options:
            ch_slug = slugify(ch)
            if ch_slug:
                lines.append(f"  - slug: {yaml_quote(ch_slug)}")
                lines.append(f"    label: {yaml_quote(ch)}")
    else:
        lines.append("characters_data: []")
    
    # -------------------------------------------------------------------------
    # COVER / DISPLAY
    # -------------------------------------------------------------------------
    lines.extend(section_header("COVER / DISPLAY"))
    lines.append(f"cover: /assets/img/games/{game_id[0]}/{game_id}.jpg")
    lines.append("cover_position: center")
    
    # -------------------------------------------------------------------------
    # SUBMISSION METADATA
    # -------------------------------------------------------------------------
    lines.extend(section_header("SUBMISSION METADATA"))
    if submitter:
        lines.append(f"submitted_by: {yaml_quote(submitter)}")
    else:
        lines.append('submitted_by: "Anonymous"')
    lines.append(f"credit_requested: {'true' if credit_requested else 'false'}")
    
    # -------------------------------------------------------------------------
    # END FRONT MATTER + CONTENT
    # -------------------------------------------------------------------------
    lines.append("---")
    lines.append("")
    lines.append(f"# {game_name}")
    lines.append("")
    lines.append("*Game description to be added during review.*")
    lines.append("")

    # Write output file
    os.makedirs(os.path.dirname(out_file) or ".", exist_ok=True)
    with open(out_file, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))

    print(f"Created: {out_file}")


if __name__ == "__main__":
    main()
