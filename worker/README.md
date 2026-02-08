# Cloudflare Worker — CRC Submission API

Handles run/game/profile submissions and admin approvals. Deployed to Cloudflare Workers.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/` or `/submit` | Turnstile | Submit a run |
| POST | `/submit-game` | Turnstile | Submit a game |
| POST | `/approve` | JWT (admin) | Approve a pending run → creates GitHub file |
| POST | `/approve-profile` | JWT (admin) | Approve a pending profile → creates GitHub file |
| POST | `/approve-game` | JWT (admin) | Approve a pending game → creates GitHub file |
| POST | `/notify` | JWT (admin) | Send rejection/changes notification via Discord |

## Deployment

```bash
cd worker

# First time: authenticate
export CLOUDFLARE_API_TOKEN="your-token"

# Deploy
wrangler deploy
```

## Secrets

Set via `wrangler secret put SECRET_NAME`:

| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service_role key (bypasses RLS) |
| `TURNSTILE_SECRET` | Cloudflare Turnstile secret key |
| `GITHUB_TOKEN` | GitHub PAT with Contents write access |
| `GITHUB_REPO` | Repository (e.g., `GaryAsher/challenge-run-site`) |
| `DISCORD_WEBHOOK_RUNS` | Discord webhook for run notifications |
| `DISCORD_WEBHOOK_GAMES` | Discord webhook for game notifications |
| `DISCORD_WEBHOOK_PROFILES` | Discord webhook for profile notifications |

## Environment Variables

Set in `wrangler.toml` (not secrets):

| Variable | Purpose |
|----------|---------|
| `ALLOWED_ORIGIN` | Comma-separated allowed origins for CORS |
| `ENVIRONMENT` | Set to `development` to allow localhost CORS (unset in production) |

## Security

- Rate limiting: 5 submissions/min, 30 admin actions/min, 3 game submissions/min
- All inputs sanitized (HTML tags, event handlers stripped)
- IDs validated against format regex before database queries
- Error messages are generic (no internal details leaked)
- Turnstile verification fails closed (missing secret = rejected)
- CORS restricted to allowed origins only
