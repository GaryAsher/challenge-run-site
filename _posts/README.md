# News Posts

News and announcements for Challenge Run Community.

## File Location

Posts are stored in `_posts/` with standard Jekyll naming.

## Filename Format

```
YYYY-MM-DD-title-slug.md
```

Examples:
- `2025-01-13-welcome-to-crc.md`
- `2025-01-15-new-game-hollow-knight.md`

**Important:**
- Files must be directly in `_posts/` (not in subfolders)
- Files must have `.md` extension
- Date must be valid (YYYY-MM-DD)

## Required Fields

```yaml
---
layout: post
title: "Your Post Title"
date: 2025-01-13
categories: [announcement]
---
```

## Categories

Use categories to organize posts:

| Category | Use For |
|----------|---------|
| `announcement` | General announcements |
| `new-game` | New game added to site |
| `milestone` | Community milestones (100 runs, etc.) |
| `rule-change` | Rule updates or clarifications |
| `feature` | New site features |

## Featured Posts (Homepage)

To feature a post on the homepage news section, add:

```yaml
featured: true
```

Only posts with `featured: true` appear on the homepage. The 3 most recent featured posts are shown.

## Optional Fields

```yaml
---
layout: post
title: "Now Tracking: Hollow Knight"
date: 2025-01-15
categories: [new-game]
featured: true              # Shows on homepage
game_id: hollow-knight      # Links to related game
---
```

## Examples

### New Game Announcement (Featured)

```yaml
---
layout: post
title: "Now Tracking: Hollow Knight"
date: 2025-01-15
categories: [new-game]
featured: true
game_id: hollow-knight
---

We're excited to announce that **Hollow Knight** is now being tracked!

## Categories Available

- Any%
- All Bosses
- Low%

[View Hollow Knight →](/games/hollow-knight/)
```

### Milestone (Featured)

```yaml
---
layout: post
title: "100 Verified Runs!"
date: 2025-02-01
categories: [milestone]
featured: true
---

We've reached 100 verified challenge runs across all games!

Thank you to everyone who has submitted runs.
```

### Rule Change (Not Featured)

```yaml
---
layout: post
title: "Hitless Definition Clarified"
date: 2025-01-20
categories: [rule-change]
---

We've updated the hitless definition to clarify edge cases...
```

## Adding a News Post

1. Create file: `_posts/YYYY-MM-DD-title-slug.md`
2. Add frontmatter with required fields
3. Add `featured: true` if it should show on homepage
4. Write content in Markdown
5. Commit and push

## Where Posts Appear

- **All posts**: `/news/` page
- **Featured posts**: Homepage news section (latest 3)
- **RSS feed**: `feed.xml` (latest 20)
