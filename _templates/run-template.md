---
# TEMPLATE FILE
# Copy this file, rename it, and move it up one level into /_runs/
# Do not commit this file as a real run

layout: null
date_submitted: YYYY-MM-DD

# =========================================================
# IDs (machine keys, scripts validate these first)
# =========================================================
game_id: GAME-ID
runner_id: runner-id
category_tier: full_runs            # full_runs | mini_challenges | player_made
category_slug: category-slug
standard_challenges: []            # Array of challenge slugs (e.g., ["hitless", "damageless"])
community_challenge: ""            # DEPRECATED - use restrictions instead
glitch_id: ""                      # unrestricted | nmg | glitchless | ""

# =========================================================
# User-submitted (core info)
# =========================================================
runner: "Runner Name"
category: "Category Name"
date_completed: YYYY-MM-DD
video_url: https://example.com/VIDEO

# =========================================================
# User-submitted (optional)
# =========================================================
restrictions: []
restriction_ids: []

# Timing (optional unless the run is time-based)
timing_method_primary: null        # RTA | IGT | LRT
time_primary: null                 # "HH:MM:SS" or "HH:MM:SS.MMM"

timing_method_secondary: null      # RTA | IGT | LRT
time_secondary: null               # "HH:MM:SS" or "HH:MM:SS.MMM"

# =========================================================
# Moderator actions
# =========================================================
status: pending                    # pending | approved | rejected
verified: false
verified_by: null
---
