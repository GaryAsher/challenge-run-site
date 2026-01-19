/**
 * Cloudflare Worker: CRC Submission & Report Proxy
 * 
 * Endpoints:
 * - POST /submit - Submit a new run (goes to queue)
 * - POST /report - Report content anonymously
 * - POST /verify - Verify a run (GM only, via Discord bot)
 * 
 * Protection:
 * - Turnstile captcha verification
 * - Rate limiting per IP
 * - Duplicate detection
 * - Input validation
 */

const RATE_LIMITS = {
  submit: { max: 5, window: 3600 },    // 5 per hour
  report: { max: 10, window: 3600 },   // 10 per hour
  verify: { max: 50, window: 3600 }    // 50 per hour (for GMs)
};

const DEDUP_WINDOW = 86400 * 7; // 7 days

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }
    
    // Health check
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: corsHeaders(env)
      });
    }
    
    // Only POST for other endpoints
    if (request.method !== 'POST') {
      return errorResponse('Method not allowed', 405, env);
    }
    
    // Route requests
    switch (url.pathname) {
      case '/':
      case '/submit':
        return handleSubmission(request, env);
      case '/report':
        return handleReport(request, env);
      case '/verify':
        return handleVerify(request, env);
      default:
        return errorResponse('Not found', 404, env);
    }
  }
};

// ============================================================
// Submission Handler (creates PR for review)
// ============================================================
async function handleSubmission(request, env) {
  try {
    const body = await request.json();
    
    // Verify Turnstile
    if (!await verifyTurnstile(body.turnstile_token, env.TURNSTILE_SECRET, request)) {
      return errorResponse('Captcha verification failed. Please try again.', 403, env);
    }
    
    // Rate limit
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!await checkRateLimit(env, 'submit', clientIP)) {
      return errorResponse('Rate limit exceeded. Please try again later.', 429, env);
    }
    
    // Validate
    const validation = validateSubmission(body);
    if (!validation.valid) {
      return errorResponse(validation.error, 400, env);
    }
    
    // Check duplicate
    const videoHash = await hashString(body.video_url);
    const existing = await env.SUBMISSIONS.get(`dedup:${videoHash}`);
    if (existing) {
      return errorResponse('This video has already been submitted.', 409, env);
    }
    
    // Generate ID
    const submissionId = generateId('sub');
    
    // Send to GitHub
    const response = await triggerGitHub(env, 'new-run-submission', {
      game_id: body.game_id,
      runner_id: body.runner_id,
      category: body.category_slug || body.category,
      video_url: body.video_url,
      date_completed: body.date_completed,
      standard_challenges: arrayToString(body.standard_challenges),
      community_challenge: body.community_challenge || '',
      character: body.character || '',
      glitch_id: body.glitch_id || '',
      restrictions: arrayToString(body.restrictions),
      submission_id: submissionId
    });
    
    if (!response.ok) {
      console.error('GitHub error:', await response.text());
      return errorResponse('Failed to submit. Please try again.', 502, env);
    }
    
    // Update rate limit
    await incrementRateLimit(env, 'submit', clientIP);
    
    // Store dedup hash
    await env.SUBMISSIONS.put(`dedup:${videoHash}`, JSON.stringify({
      submission_id: submissionId,
      submitted_at: new Date().toISOString()
    }), { expirationTtl: DEDUP_WINDOW });
    
    return new Response(JSON.stringify({
      success: true,
      submission_id: submissionId,
      message: 'Run submitted! A moderator will review it shortly.'
    }), { status: 200, headers: corsHeaders(env) });
    
  } catch (err) {
    console.error('Submission error:', err);
    return errorResponse('An error occurred. Please try again.', 500, env);
  }
}

// ============================================================
// Report Handler (creates GitHub Issue)
// ============================================================
async function handleReport(request, env) {
  try {
    const body = await request.json();
    
    // Verify Turnstile
    if (!await verifyTurnstile(body.turnstile_token, env.TURNSTILE_SECRET, request)) {
      return errorResponse('Captcha verification failed.', 403, env);
    }
    
    // Rate limit
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!await checkRateLimit(env, 'report', clientIP)) {
      return errorResponse('Rate limit exceeded.', 429, env);
    }
    
    // Validate
    const validation = validateReport(body);
    if (!validation.valid) {
      return errorResponse(validation.error, 400, env);
    }
    
    const reportId = generateId('rpt');
    
    // Send to GitHub
    const response = await triggerGitHub(env, 'content-report', {
      report_type: body.report_type,
      content_id: body.content_id,
      reason: body.reason,
      details: body.details || '',
      game_id: body.game_id || '',
      submission_id: reportId
    });
    
    if (!response.ok) {
      return errorResponse('Failed to submit report.', 502, env);
    }
    
    await incrementRateLimit(env, 'report', clientIP);
    
    return new Response(JSON.stringify({
      success: true,
      report_id: reportId,
      message: 'Report submitted. Thank you for helping improve the site.'
    }), { status: 200, headers: corsHeaders(env) });
    
  } catch (err) {
    console.error('Report error:', err);
    return errorResponse('An error occurred.', 500, env);
  }
}

// ============================================================
// Verify Handler (for Discord bot / GMs)
// ============================================================
async function handleVerify(request, env) {
  try {
    const body = await request.json();
    
    // This endpoint uses a secret key instead of Turnstile
    // Only the Discord bot should know this key
    if (body.api_key !== env.VERIFY_API_KEY) {
      return errorResponse('Unauthorized', 401, env);
    }
    
    // Validate
    if (!body.game_id || !body.run_filename || !body.verifier_discord) {
      return errorResponse('Missing required fields', 400, env);
    }
    
    if (!['verify', 'unverify'].includes(body.action)) {
      return errorResponse('Invalid action', 400, env);
    }
    
    // Send to GitHub
    const response = await triggerGitHub(env, 'verify-run', {
      game_id: body.game_id,
      run_filename: body.run_filename,
      verifier_discord: body.verifier_discord,
      verifier_github: body.verifier_github || '',
      action: body.action,
      note: body.note || ''
    });
    
    if (!response.ok) {
      return errorResponse('Failed to process verification.', 502, env);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: `Run ${body.action === 'verify' ? 'verified' : 'unverified'} successfully.`
    }), { status: 200, headers: corsHeaders(env) });
    
  } catch (err) {
    console.error('Verify error:', err);
    return errorResponse('An error occurred.', 500, env);
  }
}

// ============================================================
// Helpers
// ============================================================

function corsHeaders(env) {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function errorResponse(message, status, env) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: corsHeaders(env)
  });
}

async function verifyTurnstile(token, secret, request) {
  if (!token || !secret) return false;
  
  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token);
  formData.append('remoteip', request.headers.get('CF-Connecting-IP'));
  
  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData
  });
  
  const outcome = await result.json();
  return outcome.success === true;
}

async function checkRateLimit(env, type, clientIP) {
  const key = `rate:${type}:${clientIP}`;
  const count = parseInt(await env.SUBMISSIONS.get(key) || '0');
  return count < RATE_LIMITS[type].max;
}

async function incrementRateLimit(env, type, clientIP) {
  const key = `rate:${type}:${clientIP}`;
  const count = parseInt(await env.SUBMISSIONS.get(key) || '0');
  await env.SUBMISSIONS.put(key, String(count + 1), {
    expirationTtl: RATE_LIMITS[type].window
  });
}

function validateSubmission(body) {
  const required = ['game_id', 'runner_id', 'video_url', 'date_completed'];
  for (const field of required) {
    if (!body[field]?.trim()) {
      return { valid: false, error: `Missing: ${field}` };
    }
  }
  
  if (!body.category && !body.category_slug) {
    return { valid: false, error: 'Missing: category' };
  }
  
  if (!isValidVideoUrl(body.video_url)) {
    return { valid: false, error: 'Invalid video URL' };
  }
  
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date_completed)) {
    return { valid: false, error: 'Invalid date format (use YYYY-MM-DD)' };
  }
  
  return { valid: true };
}

function validateReport(body) {
  if (!['run', 'game', 'gm_complaint', 'other'].includes(body.report_type)) {
    return { valid: false, error: 'Invalid report type' };
  }
  
  if (!body.content_id?.trim()) {
    return { valid: false, error: 'Missing content ID' };
  }
  
  const validReasons = [
    'invalid_run', 'wrong_category', 'wrong_challenge',
    'video_unavailable', 'cheating_suspected', 'incorrect_game_info',
    'gm_abuse', 'spam', 'other'
  ];
  
  if (!validReasons.includes(body.reason)) {
    return { valid: false, error: 'Invalid reason' };
  }
  
  return { valid: true };
}

function isValidVideoUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    const allowed = ['youtube.com', 'm.youtube.com', 'youtu.be', 'twitch.tv', 'm.twitch.tv', 'bilibili.com', 'b23.tv'];
    return allowed.some(h => host === h || host.endsWith('.' + h));
  } catch {
    return false;
  }
}

async function hashString(str) {
  const data = new TextEncoder().encode(str.toLowerCase().trim());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function arrayToString(arr) {
  if (Array.isArray(arr)) return arr.join(',');
  return arr || '';
}

async function triggerGitHub(env, eventType, payload) {
  const [owner, repo] = env.GITHUB_REPO.split('/');
  return fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'CRC-Worker'
    },
    body: JSON.stringify({ event_type: eventType, client_payload: payload })
  });
}
