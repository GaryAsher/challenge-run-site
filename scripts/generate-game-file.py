#!/usr/bin/env python3
"""
Generate a game markdown file from form submission data.
Used by the new-game-submission GitHub workflow.
"""

import json
import os
import re
import sys


def split_list_by_newlines_only(s):
    """
    Split a string ONLY by newlines (not commas).
    Use this for free-text fields where commas might appear in the content.
    """
    if not s:
        return []
    # Convert escaped newlines to real newlines
    s = s.replace('\\n', '\n')
    s = s.replace('\r\n', '\n').replace('\r', '\n')
    # Split and clean
    items = [line.strip() for line in s.split('\n')]
    return [item for item in items if item]


def split_list(s):
    """
    Split a string by newlines, commas, semicolons, or pipes.
    Use this for structured fields where items are expected to be simple values.
    """
    if not s:
        return []
    # First, convert escaped newlines to real newlines
    s = s.replace('\\n', '\n')
    # Replace delimiters with newlines
    s = s.replace('\r\n', '\n').replace('\r', '\n')
    s = re.sub(r'[;,|]', '\n', s)
    # Split and clean
    items = [line.strip() for line in s.split('\n')]
    return [item for item in items if item]


def slugify(s):
    """Convert string to URL-friendly slug."""
    if not s:
        return ""
    s = s.lower().strip()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = re.sub(r'-+', '-', s).strip('-')
    return s


def yaml_quote(s):
    """Quote a string for YAML output."""
    if not s:
        return '""'
    return json.dumps(str(s))


def load_details(s):
    """Load and parse the details JSON, handling double-encoding."""
    if not s or s == 'null':
        return {}
    try:
        obj = json.loads(s)
    except json.JSONDecodeError as e:
        print(f"DEBUG: JSON parse error: {e}", file=sys.stderr)
        return {}
    
    # Handle double-encoded JSON
    if isinstance(obj, str):
        try:
            obj2 = json.loads(obj)
            if isinstance(obj2, dict):
                return obj2
        except:
            pass
        return {}
    
    return obj if isinstance(obj, dict) else {}


def filter_glitch_categories(categories):
    """
    Filter out placeholder/skip options from glitch categories.
    Returns cleaned list of actual glitch category names.
    """
    skip_patterns = [
        "does not have",
        "at this time",
        "no glitch",
        "n/a",
        "none",
        "not applicable",
    ]
    
    filtered = []
    for cat in categories:
        cat_lower = cat.lower()
        should_skip = any(pattern in cat_lower for pattern in skip_patterns)
        if not should_skip and cat.strip():
            filtered.append(cat)
    
    return filtered


def main():
    # Load environment variables
    game_name = os.environ.get('GAME_NAME', '')
    game_id = os.environ.get('GAME_ID', '')
    first_letter = os.environ.get('FIRST_LETTER', '')
    categories_raw = os.environ.get('CATEGORIES', '')
    challenges_raw = os.environ.get('CHALLENGES', '')
    char_enabled = os.environ.get('CHAR_ENABLED', 'false') == 'true'
    char_label = os.environ.get('CHAR_LABEL', 'Character') or 'Character'
    submitter = os.environ.get('SUBMITTER', '')
    credit_requested = os.environ.get('CREDIT_REQUESTED', 'false') == 'true'
    details_raw = os.environ.get('DETAILS_IN', '{}')
    out_file = os.environ.get('OUT_FILE', '')

    # Parse details JSON
    details = load_details(details_raw)

    def get_detail(key, default=''):
        v = details.get(key, default)
        if v is None:
            return default
        return str(v)

    # Extract all details
    # Use newline-only splitting for free-text fields to preserve commas in content
    aliases = split_list_by_newlines_only(get_detail('name_aliases'))
    subcategories_raw = split_list_by_newlines_only(get_detail('subcategories'))
    
    # Glitch categories come from checkboxes (comma-separated) then filter
    glitch_categories_raw = split_list(get_detail('glitch_categories'))
    glitch_categories = filter_glitch_categories(glitch_categories_raw)
    
    # Glitch docs are free text with commas possible
    glitches_doc = split_list_by_newlines_only(get_detail('glitches_doc'))
    
    # Restrictions are free text
    restrictions = split_list_by_newlines_only(get_detail('restrictions'))
    
    timing_primary = get_detail('timing_primary', 'RTA')
    timing_secondary = get_detail('timing_secondary')
    moderate_interest = get_detail('moderate_interest')
    feedback = get_detail('feedback')
    
    # Character options are free text
    character_options = split_list_by_newlines_only(get_detail('character_options'))

    # Debug output
    print(f"DEBUG: Parsed details:", file=sys.stderr)
    print(f"  - aliases: {aliases}", file=sys.stderr)
    print(f"  - subcategories: {subcategories_raw}", file=sys.stderr)
    print(f"  - glitch_categories (raw): {glitch_categories_raw}", file=sys.stderr)
    print(f"  - glitch_categories (filtered): {glitch_categories}", file=sys.stderr)
    print(f"  - glitches_doc: {glitches_doc}", file=sys.stderr)
    print(f"  - restrictions: {restrictions}", file=sys.stderr)
    print(f"  - character_options: {character_options}", file=sys.stderr)

    # Process categories and challenges (these come from form as comma-separated)
    categories = split_list_by_newlines_only(categories_raw)
    challenges = split_list(challenges_raw)  # Checkboxes are comma-separated

    # Build parent -> children map from subcategories
    # Format: "Parent - Child"
    children_map = {}
    for rel in subcategories_raw:
        # Only split on " - " (with spaces) to avoid breaking category names with hyphens
        if ' - ' in rel:
            parent, child = rel.split(' - ', 1)
            parent = parent.strip()
            child = child.strip()
            
            if parent and child:
                if parent not in children_map:
                    children_map[parent] = []
                children_map[parent].append(child)

    # Generate YAML output
    lines = []

    # Header
    lines.append('---')
    lines.append('layout: game')
    lines.append(f'game_id: {game_id}')
    lines.append('reviewers: []')
    lines.append('')

    # Name section
    lines.append(f'name: {yaml_quote(game_name)}')
    if aliases:
        lines.append('name_aliases:')
        for alias in aliases:
            lines.append(f'  - {yaml_quote(alias)}')
    else:
        lines.append('name_aliases: []')

    status_text = f"Pending review - submitted by {submitter}" if submitter else "Pending review"
    lines.append(f'status: {yaml_quote(status_text)}')
    lines.append('')

    # Metadata (to be filled by moderators)
    lines.append('# TODO: Add tags and platforms')
    lines.append('tags: []')
    lines.append('platforms: []')
    lines.append('')

    # Cover image
    lines.append(f'cover: /assets/img/games/{first_letter}/{game_id}.jpg')
    lines.append('cover_position: center')
    lines.append('')

    # Timing
    lines.append(f'timing_method: {yaml_quote(timing_primary)}')
    lines.append('')

    # Tabs
    lines.append('tabs:')
    lines.append('  overview: true')
    lines.append('  runs: true')
    lines.append('  history: true')
    lines.append('  resources: true')
    lines.append('  forum: true')
    lines.append('  extra_1: false')
    lines.append('  extra_2: false')
    lines.append('')

    # Character column
    lines.append('character_column:')
    lines.append(f'  enabled: {str(char_enabled).lower()}')
    lines.append(f'  label: {yaml_quote(char_label)}')
    lines.append('')

    # Challenges
    lines.append('challenges:')
    for ch in challenges:
        lines.append(f'  - {slugify(ch)}')
    lines.append('')

    # Glitch categories
    lines.append('glitches_data:')
    if glitch_categories:
        for gc in glitch_categories:
            lines.append(f'  - slug: {slugify(gc)}')
            lines.append(f'    label: {yaml_quote(gc)}')
    else:
        # Default glitch categories
        lines.append('  - slug: unrestricted')
        lines.append('    label: "Unrestricted"')
        lines.append('  - slug: glitchless')
        lines.append('    label: "Glitchless"')
    lines.append('')

    # Restrictions
    if restrictions:
        lines.append('restrictions:')
        for r in restrictions:
            lines.append(f'  - {yaml_quote(r)}')
    else:
        lines.append('restrictions: []')
    lines.append('')

    # Categories data
    lines.append('categories_data:')
    for cat in categories:
        cat_slug = slugify(cat)
        lines.append(f'  - slug: {cat_slug}')
        lines.append(f'    label: {yaml_quote(cat)}')
        
        # Check for children
        if cat in children_map:
            lines.append('    children:')
            for child in children_map[cat]:
                lines.append(f'      - slug: {slugify(child)}')
                lines.append(f'        label: {yaml_quote(child)}')

    lines.append('---')
    lines.append('')

    # Body content
    lines.append('Game submitted via form. Awaiting review.')
    lines.append('')

    # Reviewer notes (HTML comment)
    notes = []
    if submitter:
        notes.append(f'Submitted by: {submitter}')
    if credit_requested:
        notes.append('Credit requested: Yes')
    if moderate_interest:
        notes.append(f'Moderation interest: {moderate_interest}')
    if character_options:
        notes.append('')
        notes.append('Character/Weapon/Class options:')
        for opt in character_options:
            notes.append(f'  - {opt}')
    if glitches_doc:
        notes.append('')
        notes.append('Glitch documentation:')
        for doc in glitches_doc:
            notes.append(f'  - {doc}')
    if timing_secondary:
        notes.append(f'Secondary timing: {timing_secondary}')
    if feedback:
        notes.append('')
        notes.append('Submitter feedback:')
        # Convert escaped newlines to real newlines for readability
        notes.append(feedback.replace('\\n', '\n'))

    if notes:
        lines.append('<!-- REVIEWER NOTES')
        lines.append('')
        for note in notes:
            lines.append(note)
        lines.append('')
        lines.append('-->')

    # Write output file
    with open(out_file, 'w') as f:
        f.write('\n'.join(lines))

    print(f"✓ Generated {out_file}")
    print(f"  - {len(categories)} categories")
    print(f"  - {len(challenges)} challenges")
    print(f"  - {len(aliases)} aliases")
    print(f"  - {len(restrictions)} restrictions")
    print(f"  - {len(glitch_categories)} glitch categories")
    print(f"  - {len(character_options)} character options")


if __name__ == '__main__':
    main()
