/**
 * CRC Cloudflare Worker
 *
 * Endpoints:
 *   POST /                 Run submission (public, Turnstile-protected)
 *   POST /submit-game      Game submission (public, Turnstile-protected)
 *   POST /approve           Approve a pending run   (admin, JWT-verified)
 *   POST /approve-profile   Approve a pending profile (admin, JWT-verified)
 *   POST /approve-game      Approve a pending game  (admin, JWT-verified)
 *
 * Secrets (set via wrangler secret put):
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY, GITHUB_TOKEN, GITHUB_REPO,
 *   TURNSTILE_SECRET, VERIFY_API_KEY (optional)
 *   DISCORD_WEBHOOK_RUNS (optional), DISCORD_WEBHOOK_GAMES (optional),
 *   DISCORD_WEBHOOK_PROFILES (optional)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORS
// ═══════════════════════════════════════════════════════════════════════════════

function corsHeaders(env, request) {
  const origin = request?.headers?.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim());
  // SECURITY (Item 8): Only allow localhost in development mode
  const isDev = env.ENVIRONMENT === 'development';
  const isAllowed = allowed.includes(origin) ||
    (isDev && (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')));
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowed[0] || 'https://www.challengerun.net',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(body, status, env, request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT SANITIZATION & VALIDATION (Items 10, 11)
// ═══════════════════════════════════════════════════════════════════════════════

/** Strip HTML tags and enforce max length */
function sanitizeInput(str, maxLength = 500) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')        // Strip HTML tags
    .replace(/javascript:/gi, '')    // Strip JS protocol
    .replace(/on\w+\s*=/gi, '')      // Strip event handlers
    .trim()
    .slice(0, maxLength);
}

/** Validate that a value looks like an integer ID (Item 11) */
function isValidId(id) {
  if (typeof id === 'number') return Number.isInteger(id) && id > 0;
  if (typeof id === 'string') return /^\d+$/.test(id) && parseInt(id) > 0;
  return false;
}

/** Validate that a URL is an allowed https video URL */
function isValidVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    const allowedHosts = [
      'youtube.com', 'm.youtube.com', 'youtu.be',
      'twitch.tv', 'm.twitch.tv', 'player.twitch.tv',
      'bilibili.com', 'nicovideo.jp'
    ];
    return allowedHosts.some(h => host === h || host.endsWith('.' + h));
  } catch {
    return false;
  }
}

/** Validate a slug (lowercase alphanumeric + hyphens) */
function isValidSlug(s, minLen = 1, maxLen = 100) {
  if (!s || typeof s !== 'string') return false;
  return s.length >= minLen && s.length <= maxLen && /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(s);
}

/** Sanitize an array of strings */
function sanitizeArray(arr, maxItems = 20, maxItemLen = 200) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, maxItems).map(item =>
    typeof item === 'string' ? sanitizeInput(item, maxItemLen) : ''
  ).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING (Item 7) — combine with Cloudflare Rate Limiting Rules
// ═══════════════════════════════════════════════════════════════════════════════

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMITS = {
  '/': 5,               // 5 submissions/min/IP
  '/submit': 5,
  '/submit-game': 3,
  '/approve': 30,
  '/approve-profile': 30,
  '/approve-game': 30,
  '/notify': 10,
  '/report': 5,
};

function checkRateLimit(ip, path) {
  const limit = RATE_LIMITS[path];
  if (!limit || !ip) return true;
  const key = `${ip}:${path}`;
  const now = Date.now();
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  const entry = rateLimitMap.get(key);
  if (now - entry.windowStart > RATE_LIMIT_WINDOW) {
    entry.count = 1;
    entry.windowStart = now;
    return true;
  }
  entry.count++;
  if (rateLimitMap.size > 10000) {
    for (const [k, v] of rateLimitMap) {
      if (now - v.windowStart > RATE_LIMIT_WINDOW) rateLimitMap.delete(k);
    }
  }
  return entry.count <= limit;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TURNSTILE
// ═══════════════════════════════════════════════════════════════════════════════

async function verifyTurnstile(token, env, ip) {
  // SECURITY (Item 6): Fail closed — if secret missing, reject
  if (!env.TURNSTILE_SECRET) {
    console.error('TURNSTILE_SECRET not configured — rejecting request');
    return false;
  }
  if (!token) return false;

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: token,
      remoteip: ip || '',
    }),
  });
  const data = await res.json();
  return data.success === true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Service-role query helper */
async function supabaseQuery(env, path, { method = 'GET', body, headers: extra } = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: method === 'POST' ? 'return=representation' : 'return=representation',
    ...extra,
  };
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

/** Verify a Supabase access token → returns user object or null */
async function verifySupabaseToken(env, accessToken) {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

/** Check if user is admin (is_admin in runner_profiles OR can_manage_moderators in moderators) */
async function isAdmin(env, userId) {
  // Check runner_profiles.is_admin
  const profile = await supabaseQuery(env,
    `runner_profiles?user_id=eq.${userId}&select=is_admin,runner_id`, { method: 'GET' });
  if (profile.ok && Array.isArray(profile.data) && profile.data.length > 0) {
    if (profile.data[0].is_admin === true) return { admin: true, runnerId: profile.data[0].runner_id };
  }

  // Check moderators table
  const mod = await supabaseQuery(env,
    `moderators?user_id=eq.${userId}&select=can_manage_moderators,assigned_games`, { method: 'GET' });
  if (mod.ok && Array.isArray(mod.data) && mod.data.length > 0) {
    return {
      admin: mod.data[0].can_manage_moderators === true,
      verifier: true,
      assignedGames: mod.data[0].assigned_games || [],
      runnerId: profile.data?.[0]?.runner_id || null,
    };
  }

  return { admin: false, verifier: false };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GITHUB HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function githubCreateFile(env, filePath, content, commitMessage) {
  const repo = env.GITHUB_REPO;
  const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: commitMessage,
      content: btoa(unescape(encodeURIComponent(content))),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    // SECURITY (Item 15): Log details server-side but return generic message
    console.error('GitHub create file error:', JSON.stringify(data));
    return { ok: false, error: 'Failed to create file in repository' };
  }
  return { ok: true, sha: data.content?.sha };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISCORD WEBHOOK
// ═══════════════════════════════════════════════════════════════════════════════

/** Pick the right Discord webhook URL for the notification type */
function getWebhookUrl(env, channel) {
  switch (channel) {
    case 'runs':     return env.DISCORD_WEBHOOK_RUNS;
    case 'games':    return env.DISCORD_WEBHOOK_GAMES;
    case 'profiles': return env.DISCORD_WEBHOOK_PROFILES;
    default:         return env.DISCORD_WEBHOOK_RUNS || env.DISCORD_WEBHOOK_PROFILES || env.DISCORD_WEBHOOK_GAMES;
  }
}

async function sendDiscordNotification(env, channel, embed) {
  const webhookUrl = getWebhookUrl(env, channel);
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'CRC Bot',
        embeds: [embed],
      }),
    });
  } catch (err) {
    console.error('Discord webhook error:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLUG HELPER
// ═══════════════════════════════════════════════════════════════════════════════

function slugify(s) {
  return (s || '').toLowerCase()
    .replace(/['']/g, '')
    .replace(/%/g, '-percent')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

function yamlQuote(s) {
  if (!s && s !== '') return '""';
  if (/[:\[\]{},#&*!|>'"%@`\n]/.test(s) || s.trim() !== s) {
    return JSON.stringify(s);
  }
  return s;
}

function generateSubmissionId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `sub_${ts}_${rand}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN FILE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildRunFileContent(run) {
  const lines = ['---'];

  lines.push(`game_id: ${yamlQuote(run.game_id)}`);
  lines.push(`runner_id: ${yamlQuote(run.runner_id)}`);
  lines.push(`category_slug: ${yamlQuote(run.category_slug)}`);
  lines.push(`video_url: ${yamlQuote(run.video_url)}`);

  // Date
  const dateCompleted = run.date_completed
    ? run.date_completed.replace(/\//g, '-')
    : new Date().toISOString().slice(0, 10);
  lines.push(`date: ${yamlQuote(dateCompleted)}`);

  // Standard challenges
  if (run.standard_challenges?.length) {
    lines.push('standard_challenges:');
    for (const c of run.standard_challenges) lines.push(`  - ${yamlQuote(c)}`);
  } else {
    lines.push('standard_challenges: []');
  }

  // Community challenge
  lines.push(`community_challenge: ${run.community_challenge ? yamlQuote(run.community_challenge) : ''}`);

  // Character
  if (run.character) lines.push(`character: ${yamlQuote(run.character)}`);

  // Glitch
  if (run.glitch_id) lines.push(`glitch_id: ${yamlQuote(run.glitch_id)}`);

  // Restrictions
  if (run.restrictions?.length) {
    lines.push('restrictions:');
    for (const r of run.restrictions) lines.push(`  - ${yamlQuote(r)}`);
  }

  // Timing
  if (run.run_time) lines.push(`time_primary: ${yamlQuote(run.run_time)}`);
  if (run.timing_method_primary) lines.push(`timing_method_primary: ${yamlQuote(run.timing_method_primary)}`);

  // Additional runners
  if (run.additional_runners?.length) {
    lines.push('additional_runners:');
    for (const ar of run.additional_runners) {
      lines.push(`  - runner_id: ${yamlQuote(ar.runner_id)}`);
      if (ar.character) lines.push(`    character: ${yamlQuote(ar.character)}`);
      lines.push(`    status: ${yamlQuote(ar.status || 'pending_confirmation')}`);
    }
  }

  // Metadata
  lines.push(`verified: false`);
  lines.push(`submission_id: ${yamlQuote(run.submission_id || generateSubmissionId())}`);
  lines.push(`submitted_at: ${yamlQuote(run.submitted_at || new Date().toISOString())}`);

  lines.push('---');
  return lines.join('\n');
}

function buildRunFilename(run) {
  const date = (run.date_completed || new Date().toISOString().slice(0, 10)).replace(/\//g, '-');
  const gameId = slugify(run.game_id);
  const runnerId = slugify(run.runner_id);
  const category = slugify(run.category_slug);

  // Count existing runs for this combo to determine sequence number
  // We'll just use 01 and let GitHub handle conflicts
  return `${date}__${gameId}__${runnerId}__${category}__01.md`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUNNER FILE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildRunnerFileContent(profile) {
  const lines = ['---'];

  lines.push(`layout: runner`);
  lines.push(`runner_id: ${yamlQuote(profile.runner_id)}`);
  lines.push(`runner_name: ${yamlQuote(profile.display_name || profile.runner_id)}`);

  if (profile.status_message) {
    lines.push(`status: ${yamlQuote(profile.status_message)}`);
  }

  // Avatar
  const initial = (profile.runner_id || 'x')[0].toLowerCase();
  const avatarPath = profile.avatar_url || `/assets/img/site/default-runner.png`;
  lines.push(`avatar: ${yamlQuote(avatarPath)}`);

  // Socials
  const socials = profile.socials || {};
  const hasSocials = Object.values(socials).some(Boolean);
  if (hasSocials) {
    lines.push('socials:');
    for (const [key, val] of Object.entries(socials)) {
      if (val) lines.push(`  ${key}: ${yamlQuote(val)}`);
    }
  }

  // Badges
  lines.push('badges: []');

  // Games
  if (profile.games?.length) {
    lines.push('games:');
    for (const g of profile.games) lines.push(`  - ${yamlQuote(g)}`);
  } else {
    lines.push('games: []');
  }

  // Approval metadata
  lines.push('');
  lines.push(`approval_status: approved`);
  if (profile.approved_by) lines.push(`approved_by: ${yamlQuote(profile.approved_by)}`);
  lines.push(`approved_at: ${new Date().toISOString().slice(0, 10)}`);

  lines.push('---');
  lines.push('');
  lines.push(profile.bio || '');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME FILE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildGameFileContent(game) {
  const gd = game.game_data || game;
  const lines = ['---'];

  // Header
  lines.push('layout: game');
  lines.push(`game_id: ${yamlQuote(game.game_id)}`);
  lines.push('status: "Active"');
  lines.push('reviewers: []');

  // Modded info
  if (gd.is_modded) {
    lines.push('');
    lines.push('# Modded game info');
    lines.push('is_modded: true');
    if (gd.base_game) lines.push(`base_game: ${yamlQuote(gd.base_game)}`);
  }

  // Game info
  lines.push('');
  lines.push(`game_name: ${yamlQuote(game.game_name)}`);

  if (gd.game_name_aliases?.length) {
    lines.push('game_name_aliases:');
    for (const a of gd.game_name_aliases) lines.push(`  - ${yamlQuote(a)}`);
  } else {
    lines.push('game_name_aliases: []');
  }

  // Genres
  if (gd.genres?.length) {
    lines.push('');
    lines.push('genres:');
    for (const g of gd.genres) lines.push(`  - ${slugify(g)}`);
  } else {
    lines.push('genres: []');
  }

  // Platforms
  if (gd.platforms?.length) {
    lines.push('');
    lines.push('platforms:');
    for (const p of gd.platforms) lines.push(`  - ${slugify(p)}`);
  } else {
    lines.push('platforms: []');
  }

  // Cover
  const initial = (game.game_id || 'x')[0].toLowerCase();
  lines.push('');
  lines.push(`cover: /assets/img/games/${initial}/${game.game_id}.jpg`);
  lines.push('cover_position: center');

  // Tabs
  lines.push('');
  lines.push('tabs:');
  lines.push('  overview: true');
  lines.push('  runs: true');
  lines.push('  rules: true');
  lines.push('  history: true');
  lines.push('  resources: true');
  lines.push('  forum: true');

  // Timing
  const timing = gd.timing_method || 'RTA';
  lines.push('');
  lines.push(`timing_method: ${yamlQuote(timing)}`);
  lines.push(`rta_timing: ${timing.toUpperCase().includes('RTA') ? 'true' : 'false'}`);

  // Character column
  lines.push('');
  const charEnabled = gd.character_column?.enabled === true;
  lines.push('character_column:');
  lines.push(`  enabled: ${charEnabled}`);
  lines.push(`  label: ${yamlQuote(gd.character_column?.label || 'Character')}`);

  if (charEnabled && gd.characters_data?.length) {
    lines.push('  options:');
    for (const ch of gd.characters_data) {
      const s = typeof ch === 'string' ? ch : ch.label || ch.slug || '';
      lines.push(`    - slug: ${yamlQuote(slugify(s))}`);
      lines.push(`      label: ${yamlQuote(s)}`);
    }
  }

  // General rules
  if (gd.general_rules) {
    lines.push('');
    lines.push('general_rules: |');
    for (const line of gd.general_rules.split('\n')) {
      lines.push(`  ${line}`);
    }
  }

  // Challenges data
  const challenges = gd.challenges_data || gd.challenges || [];
  lines.push('');
  lines.push('# Challenge types');
  if (challenges.length) {
    lines.push('challenges_data:');
    for (const c of challenges) {
      const item = typeof c === 'string' ? { slug: slugify(c), label: c } : c;
      lines.push(`  - slug: ${yamlQuote(item.slug || slugify(item.label || ''))}`);
      lines.push(`    label: ${yamlQuote(item.label || item.slug || '')}`);
      lines.push('    description: ""');
    }
  } else {
    lines.push('challenges_data: []');
  }

  // Restrictions
  const restrictions = gd.restrictions_data || [];
  if (restrictions.length) {
    lines.push('');
    lines.push('restrictions_data:');
    for (const r of restrictions) {
      const item = typeof r === 'string' ? { slug: slugify(r), label: r } : r;
      lines.push(`  - slug: ${yamlQuote(item.slug || slugify(item.label || ''))}`);
      lines.push(`    label: ${yamlQuote(item.label || item.slug || '')}`);
      lines.push('    description: ""');
    }
  } else {
    lines.push('restrictions_data: []');
  }

  // Glitch data
  const glitches = gd.glitches_data || [];
  if (glitches.length) {
    lines.push('');
    lines.push('glitches_data:');
    for (const g of glitches) {
      const item = typeof g === 'string' ? { slug: slugify(g), label: g } : g;
      lines.push(`  - slug: ${yamlQuote(item.slug || slugify(item.label || ''))}`);
      lines.push(`    label: ${yamlQuote(item.label || item.slug || '')}`);
    }
  } else {
    lines.push('glitches_data: []');
  }

  // Full runs
  const fullRuns = gd.full_runs || gd.full_run_categories || [];
  lines.push('');
  lines.push('# Categories');
  if (fullRuns.length) {
    lines.push('full_runs:');
    for (const cat of fullRuns) {
      const item = typeof cat === 'string' ? { slug: slugify(cat), label: cat } : cat;
      lines.push(`  - slug: ${yamlQuote(item.slug || slugify(item.label || ''))}`);
      lines.push(`    label: ${yamlQuote(item.label || item.slug || '')}`);
      lines.push('    description: ""');
    }
  } else {
    lines.push('full_runs: []');
  }

  // Mini-challenges
  const miniChallenges = gd.mini_challenges || [];
  if (miniChallenges.length) {
    lines.push('');
    lines.push('mini_challenges:');
    for (const cat of miniChallenges) {
      const item = typeof cat === 'string' ? { slug: slugify(cat), label: cat } : cat;
      lines.push(`  - slug: ${yamlQuote(item.slug || slugify(item.label || ''))}`);
      lines.push(`    label: ${yamlQuote(item.label || item.slug || '')}`);
      lines.push('    description: ""');
    }
  } else {
    lines.push('mini_challenges: []');
  }

  // Player-made
  lines.push('player_made: []');

  // Credits
  lines.push('');
  lines.push('# Credits');
  if (game.submitter_handle || game.submitter_runner_id) {
    lines.push('credits:');
    lines.push(`  - name: ${yamlQuote(game.submitter_handle || game.submitter_runner_id)}`);
    if (game.submitter_runner_id) {
      lines.push(`    runner_id: ${yamlQuote(game.submitter_runner_id)}`);
    }
    lines.push('    role: "Game submission"');
  } else {
    lines.push('credits: []');
  }

  lines.push('---');
  lines.push('');
  lines.push(gd.description || `${game.game_name} challenge runs.`);

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

async function authenticateAdmin(env, body) {
  const token = body.token;
  if (!token) return { error: 'Missing token', status: 401 };

  const user = await verifySupabaseToken(env, token);
  if (!user?.id) return { error: 'Invalid or expired token', status: 401 };

  const role = await isAdmin(env, user.id);
  if (!role.admin && !role.verifier) {
    return { error: 'Insufficient permissions', status: 403 };
  }

  return { user, role };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT: POST / (Run submission)
// ═══════════════════════════════════════════════════════════════════════════════

async function handleRunSubmission(body, env, request) {
  // Validate required fields
  const required = ['game_id', 'category_slug', 'runner_id', 'video_url'];
  for (const field of required) {
    if (!body[field]) {
      return jsonResponse({ error: `Missing required field: ${field}` }, 400, env, request);
    }
  }

  // SECURITY (Item 10): Server-side input validation
  if (!isValidSlug(body.game_id, 1, 100)) {
    return jsonResponse({ error: 'Invalid game_id format' }, 400, env, request);
  }
  if (!isValidSlug(body.runner_id, 3, 50)) {
    return jsonResponse({ error: 'Invalid runner_id format' }, 400, env, request);
  }
  if (!isValidSlug(body.category_slug, 1, 100)) {
    return jsonResponse({ error: 'Invalid category_slug format' }, 400, env, request);
  }
  if (!isValidVideoUrl(body.video_url)) {
    return jsonResponse({ error: 'Invalid video URL. Must be YouTube, Twitch, Bilibili, or Nicovideo.' }, 400, env, request);
  }

  // Verify Turnstile
  const ip = request.headers.get('CF-Connecting-IP');
  const turnstileOk = await verifyTurnstile(body.turnstile_token, env, ip);
  if (!turnstileOk) {
    return jsonResponse({ error: 'Captcha verification failed' }, 403, env, request);
  }

  // Build the Supabase row (with sanitized inputs — Item 10)
  const submissionId = generateSubmissionId();
  const row = {
    game_id: sanitizeInput(body.game_id, 100),
    runner_id: sanitizeInput(body.runner_id, 50),
    category_tier: sanitizeInput(body.category_tier || 'full_runs', 50),
    category_slug: sanitizeInput(body.category_slug, 100),
    standard_challenges: sanitizeArray(body.standard_challenges),
    community_challenge: body.community_challenge ? sanitizeInput(body.community_challenge, 200) : null,
    character: body.character ? sanitizeInput(body.character, 100) : null,
    glitch_id: body.glitch_id ? sanitizeInput(body.glitch_id, 50) : null,
    restrictions: sanitizeArray(body.restrictions),
    video_url: body.video_url,
    video_host: body.video_host ? sanitizeInput(body.video_host, 50) : null,
    video_id: body.video_id ? sanitizeInput(body.video_id, 100) : null,
    date_completed: body.date_completed ? sanitizeInput(body.date_completed, 10) : null,
    run_time: body.run_time ? sanitizeInput(body.run_time, 20) : null,
    additional_runners: body.additional_runners || null,
    status: 'pending',
    submission_id: submissionId,
    submitted_at: new Date().toISOString(),
    source: sanitizeInput(body.source || 'site_form', 30),
  };

  const result = await supabaseQuery(env, 'pending_runs', {
    method: 'POST',
    body: row,
  });

  if (!result.ok) {
    console.error('Supabase insert error:', result.data);
    return jsonResponse({ error: 'Failed to save submission' }, 500, env, request);
  }

  // Discord notification for new submission
  await sendDiscordNotification(env, 'runs', {
    title: '📥 New Run Submitted',
    color: 0xf0ad4e,
    fields: [
      { name: 'Game', value: body.game_id, inline: true },
      { name: 'Runner', value: body.runner_id, inline: true },
      { name: 'Category', value: body.category_slug, inline: true },
    ],
    timestamp: new Date().toISOString(),
  });

  return jsonResponse({
    ok: true,
    submission_id: submissionId,
    message: 'Run submitted successfully',
  }, 200, env, request);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT: POST /submit-game (Game submission)
// ═══════════════════════════════════════════════════════════════════════════════

async function handleGameSubmission(body, env, request) {
  // Validate required fields
  if (!body.game_name) {
    return jsonResponse({ error: 'Game name is required' }, 400, env, request);
  }

  // SECURITY (Item 10): Sanitize game name
  const gameName = sanitizeInput(body.game_name, 200);
  if (!gameName) {
    return jsonResponse({ error: 'Invalid game name' }, 400, env, request);
  }

  // Verify Turnstile
  const ip = request.headers.get('CF-Connecting-IP');
  const turnstileOk = await verifyTurnstile(body.turnstile_token, env, ip);
  if (!turnstileOk) {
    return jsonResponse({ error: 'Captcha verification failed' }, 403, env, request);
  }

  const gameId = body.game_id ? sanitizeInput(body.game_id, 100) : slugify(gameName);

  // Check if game_id already exists in pending_games
  const existing = await supabaseQuery(env,
    `pending_games?game_id=eq.${encodeURIComponent(gameId)}&status=neq.rejected&select=id`,
    { method: 'GET' });
  if (existing.ok && Array.isArray(existing.data) && existing.data.length > 0) {
    return jsonResponse({ error: 'A game with this ID is already pending or approved' }, 409, env, request);
  }

  const row = {
    game_id: gameId,
    game_name: gameName,
    submitter_handle: body.submitter_handle ? sanitizeInput(body.submitter_handle, 100) : null,
    submitter_user_id: body.submitter_user_id || null,
    status: 'pending',
    submitted_at: new Date().toISOString(),
    game_data: {
      game_name_aliases: body.aliases || [],
      genres: body.genres || [],
      platforms: body.platforms || [],
      timing_method: body.timing_method || 'RTA',
      is_modded: body.is_modded || false,
      base_game: body.base_game || null,
      character_column: {
        enabled: body.character_enabled || false,
        label: body.character_label || 'Character',
      },
      characters_data: body.characters || [],
      challenges_data: (body.challenges || []).map(c =>
        typeof c === 'string' ? { slug: slugify(c), label: c } : c
      ),
      restrictions_data: (body.restrictions || []).map(r =>
        typeof r === 'string' ? { slug: slugify(r), label: r } : r
      ),
      glitches_data: (body.glitches || []).map(g =>
        typeof g === 'string' ? { slug: slugify(g), label: g } : g
      ),
      full_runs: (body.full_run_categories || []).map(c =>
        typeof c === 'string' ? { slug: slugify(c), label: c } : c
      ),
      mini_challenges: (body.mini_challenges || []).map(c =>
        typeof c === 'string' ? { slug: slugify(c), label: c } : c
      ),
      general_rules: body.general_rules || null,
      description: body.description || null,
    },
  };

  const result = await supabaseQuery(env, 'pending_games', {
    method: 'POST',
    body: row,
  });

  if (!result.ok) {
    console.error('Supabase insert error:', result.data);
    return jsonResponse({ error: 'Failed to save game submission' }, 500, env, request);
  }

  // Discord notification
  await sendDiscordNotification(env, 'games', {
    title: '🎮 New Game Submitted',
    color: 0x5865f2,
    fields: [
      { name: 'Game', value: body.game_name, inline: true },
      { name: 'ID', value: gameId, inline: true },
      { name: 'Categories', value: `${(body.full_run_categories || []).length} full runs`, inline: true },
    ],
    timestamp: new Date().toISOString(),
  });

  return jsonResponse({
    ok: true,
    game_id: gameId,
    message: 'Game submitted for review',
  }, 200, env, request);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT: POST /approve (Approve a run)
// ═══════════════════════════════════════════════════════════════════════════════

async function handleApproveRun(body, env, request) {
  const auth = await authenticateAdmin(env, body);
  if (auth.error) return jsonResponse({ error: auth.error }, auth.status, env, request);

  const runId = body.run_id;
  if (!runId) return jsonResponse({ error: 'Missing run_id' }, 400, env, request);

  // SECURITY (Item 11): Validate ID format
  if (!isValidId(runId)) {
    return jsonResponse({ error: 'Invalid run_id format' }, 400, env, request);
  }

  // Fetch the run
  const runResult = await supabaseQuery(env,
    `pending_runs?id=eq.${encodeURIComponent(runId)}&select=*`, { method: 'GET' });
  if (!runResult.ok || !runResult.data?.length) {
    return jsonResponse({ error: 'Run not found' }, 404, env, request);
  }
  const run = runResult.data[0];

  // Check verifier permissions
  if (auth.role.verifier && !auth.role.admin) {
    if (!auth.role.assignedGames?.includes(run.game_id)) {
      return jsonResponse({ error: 'Not authorized for this game' }, 403, env, request);
    }
  }

  // Build the run file
  const filename = buildRunFilename(run);
  const filePath = `_runs/${run.game_id}/${filename}`;
  const content = buildRunFileContent(run);
  const commitMsg = `✅ Approve run: ${run.game_id} by ${run.runner_id} (${run.category_slug})`;

  // Create file in GitHub
  const ghResult = await githubCreateFile(env, filePath, content, commitMsg);
  if (!ghResult.ok) {
    // SECURITY (Item 15): Generic error, details logged server-side
    return jsonResponse({ error: 'Failed to create run file. Please try again.' }, 500, env, request);
  }

  // Update Supabase status
  await supabaseQuery(env,
    `pending_runs?id=eq.${encodeURIComponent(runId)}`, {
      method: 'PATCH',
      body: {
        status: 'verified',
        verified_by: auth.user.id,
        verified_at: new Date().toISOString(),
        verifier_notes: body.notes || null,
        github_file_path: filePath,
      },
    });

  // Discord notification
  await sendDiscordNotification(env, 'runs', {
    title: '✅ Run Approved',
    color: 0x28a745,
    fields: [
      { name: 'Game', value: run.game_id, inline: true },
      { name: 'Runner', value: run.runner_id, inline: true },
      { name: 'Category', value: run.category_slug, inline: true },
      { name: 'Video', value: run.video_url || '—', inline: false },
    ],
    timestamp: new Date().toISOString(),
  });

  return jsonResponse({
    ok: true,
    filename,
    file_path: filePath,
    message: 'Run approved and file created',
  }, 200, env, request);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT: POST /approve-profile
// ═══════════════════════════════════════════════════════════════════════════════

async function handleApproveProfile(body, env, request) {
  const auth = await authenticateAdmin(env, body);
  if (auth.error) return jsonResponse({ error: auth.error }, auth.status, env, request);
  if (!auth.role.admin) return jsonResponse({ error: 'Admin required' }, 403, env, request);

  const profileId = body.profile_id;
  if (!profileId) return jsonResponse({ error: 'Missing profile_id' }, 400, env, request);

  // SECURITY (Item 11): Validate ID format
  if (!isValidId(profileId)) {
    return jsonResponse({ error: 'Invalid profile_id format' }, 400, env, request);
  }

  // Fetch profile
  const profResult = await supabaseQuery(env,
    `pending_profiles?id=eq.${encodeURIComponent(profileId)}&select=*`, { method: 'GET' });
  if (!profResult.ok || !profResult.data?.length) {
    return jsonResponse({ error: 'Profile not found' }, 404, env, request);
  }
  const profile = profResult.data[0];

  // Build the runner file
  const runnerId = profile.runner_id;
  const filePath = `_runners/${runnerId}.md`;
  const content = buildRunnerFileContent({
    ...profile,
    approved_by: auth.role.runnerId || 'admin',
  });
  const commitMsg = `👤 Approve profile: ${runnerId}`;

  // Create file in GitHub
  const ghResult = await githubCreateFile(env, filePath, content, commitMsg);
  if (!ghResult.ok) {
    return jsonResponse({ error: 'Failed to create profile file. Please try again.' }, 500, env, request);
  }

  // Update Supabase
  await supabaseQuery(env,
    `pending_profiles?id=eq.${encodeURIComponent(profileId)}`, {
      method: 'PATCH',
      body: {
        status: 'approved',
        reviewed_by: auth.user.id,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: body.notes || null,
      },
    });

  // Also update runner_profiles status if exists
  await supabaseQuery(env,
    `runner_profiles?runner_id=eq.${encodeURIComponent(runnerId)}`, {
      method: 'PATCH',
      body: { approval_status: 'approved' },
    });

  // Discord notification
  await sendDiscordNotification(env, 'profiles', {
    title: '👤 Profile Approved',
    color: 0x28a745,
    fields: [
      { name: 'Runner', value: profile.display_name || runnerId, inline: true },
      { name: 'ID', value: runnerId, inline: true },
    ],
    timestamp: new Date().toISOString(),
  });

  return jsonResponse({
    ok: true,
    filename: `${runnerId}.md`,
    file_path: filePath,
    message: 'Profile approved and file created',
  }, 200, env, request);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT: POST /approve-game
// ═══════════════════════════════════════════════════════════════════════════════

async function handleApproveGame(body, env, request) {
  const auth = await authenticateAdmin(env, body);
  if (auth.error) return jsonResponse({ error: auth.error }, auth.status, env, request);
  if (!auth.role.admin) return jsonResponse({ error: 'Admin required' }, 403, env, request);

  const gameId = body.game_id;
  if (!gameId) return jsonResponse({ error: 'Missing game_id' }, 400, env, request);

  // SECURITY (Item 11): Validate ID format
  if (!isValidId(gameId)) {
    return jsonResponse({ error: 'Invalid game_id format' }, 400, env, request);
  }

  // Fetch game
  const gameResult = await supabaseQuery(env,
    `pending_games?id=eq.${encodeURIComponent(gameId)}&select=*`, { method: 'GET' });
  if (!gameResult.ok || !gameResult.data?.length) {
    return jsonResponse({ error: 'Game not found' }, 404, env, request);
  }
  const game = gameResult.data[0];

  // Look up submitter's runner_id for credits
  if (game.submitter_user_id) {
    const profileResult = await supabaseQuery(env,
      `runner_profiles?user_id=eq.${encodeURIComponent(game.submitter_user_id)}&select=runner_id`,
      { method: 'GET' });
    if (profileResult.ok && profileResult.data?.length) {
      game.submitter_runner_id = profileResult.data[0].runner_id;
    }
  }

  // Build the game file
  const filename = `${game.game_id}.md`;
  const filePath = `_games/${filename}`;
  const content = buildGameFileContent(game);
  const commitMsg = `🎮 Approve game: ${game.game_name} (${game.game_id})`;

  // Create file in GitHub
  const ghResult = await githubCreateFile(env, filePath, content, commitMsg);
  if (!ghResult.ok) {
    return jsonResponse({ error: 'Failed to create game file. Please try again.' }, 500, env, request);
  }

  // Update Supabase
  await supabaseQuery(env,
    `pending_games?id=eq.${encodeURIComponent(gameId)}`, {
      method: 'PATCH',
      body: {
        status: 'approved',
        reviewed_by: auth.user.id,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: body.notes || null,
      },
    });

  // Discord notification
  await sendDiscordNotification(env, 'games', {
    title: '🎮 Game Approved',
    color: 0x28a745,
    fields: [
      { name: 'Game', value: game.game_name, inline: true },
      { name: 'ID', value: game.game_id, inline: true },
    ],
    footer: { text: 'Game page will be live after the next site build' },
    timestamp: new Date().toISOString(),
  });

  return jsonResponse({
    ok: true,
    filename,
    file_path: filePath,
    message: 'Game approved and file created',
  }, 200, env, request);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT: POST /notify (send Discord notification for reject/changes)
// ═══════════════════════════════════════════════════════════════════════════════

async function handleNotify(body, env, request) {
  const auth = await authenticateAdmin(env, body);
  if (auth.error) return jsonResponse({ error: auth.error }, auth.status, env, request);

  const { action, entity_type, entity_name, entity_id, reason, notes } = body;
  if (!action || !entity_type) {
    return jsonResponse({ error: 'Missing action or entity_type' }, 400, env, request);
  }

  const colors = { rejected: 0xdc3545, needs_changes: 0x17a2b8, approved: 0x28a745 };
  const icons = { rejected: '❌', needs_changes: '✏️', approved: '✅' };
  const typeLabels = { run: '🏃 Run', profile: '👤 Profile', game: '🎮 Game' };

  const fields = [
    { name: 'Type', value: typeLabels[entity_type] || entity_type, inline: true },
    { name: 'Name', value: entity_name || entity_id || '—', inline: true },
  ];
  if (reason) fields.push({ name: 'Reason', value: reason, inline: false });
  if (notes) fields.push({ name: 'Notes', value: notes, inline: false });

  // Route to the right channel based on entity type
  const channelMap = { run: 'runs', profile: 'profiles', game: 'games' };
  const channel = channelMap[entity_type] || 'runs';

  await sendDiscordNotification(env, channel, {
    title: `${icons[action] || '📢'} ${(action || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: ${entity_name || entity_id || 'Unknown'}`,
    color: colors[action] || 0x6c757d,
    fields,
    timestamp: new Date().toISOString(),
  });

  return jsonResponse({ ok: true }, 200, env, request);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env, request) });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, env, request);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400, env, request);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    // SECURITY (Item 7): Rate limiting
    const clientIp = request.headers.get('CF-Connecting-IP') || '';
    if (!checkRateLimit(clientIp, path)) {
      return jsonResponse({ error: 'Too many requests. Please try again later.' }, 429, env, request);
    }

    try {
      switch (path) {
        case '/':
        case '/submit':
          return handleRunSubmission(body, env, request);

        case '/submit-game':
          return handleGameSubmission(body, env, request);

        case '/approve':
          return handleApproveRun(body, env, request);

        case '/approve-profile':
          return handleApproveProfile(body, env, request);

        case '/approve-game':
          return handleApproveGame(body, env, request);

        case '/notify':
          return handleNotify(body, env, request);

        default:
          return jsonResponse({ error: 'Not found' }, 404, env, request);
      }
    } catch (err) {
      console.error('Unhandled error:', err);
      return jsonResponse({ error: 'Internal error' }, 500, env, request);
    }
  },
};
