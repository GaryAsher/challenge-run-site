// supabase/functions/on-profile-update/index.ts
// 
// Supabase Edge Function that triggers GitHub Actions when a profile is updated.
// This provides real-time sync instead of waiting for the scheduled job.
//
// Setup:
// 1. Deploy this function: supabase functions deploy on-profile-update
// 2. Create a database trigger to call this function on profile updates
// 3. Set the GITHUB_TOKEN secret in Supabase
//
// Database Trigger SQL:
// ```sql
// CREATE OR REPLACE FUNCTION trigger_profile_sync()
// RETURNS TRIGGER AS $$
// BEGIN
//   PERFORM net.http_post(
//     url := 'https://<project-ref>.supabase.co/functions/v1/on-profile-update',
//     headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon-key>"}'::jsonb,
//     body := json_build_object('runner_id', NEW.runner_id)::text
//   );
//   RETURN NEW;
// END;
// $$ LANGUAGE plpgsql;
//
// CREATE TRIGGER on_profile_update_trigger
// AFTER UPDATE ON runner_profiles
// FOR EACH ROW
// WHEN (OLD.* IS DISTINCT FROM NEW.*)
// EXECUTE FUNCTION trigger_profile_sync();
// ```

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") || "GaryAsher/challenge-run-site";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface ProfileUpdatePayload {
  runner_id: string;
}

serve(async (req: Request) => {
  // SECURITY (Item 3): Restrict CORS to site origin only
  const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") || "https://www.challengerun.net";
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    // SECURITY (Item 3): Verify the caller has a valid Supabase JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Verify the JWT by calling Supabase auth
    if (SUPABASE_URL) {
      const token = authHeader.replace("Bearer ", "");
      const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY || "",
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!verifyRes.ok) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 401, headers: { ...headers, "Content-Type": "application/json" } }
        );
      }
    }

    const payload: ProfileUpdatePayload = await req.json();
    const { runner_id } = payload;

    if (!runner_id) {
      return new Response(
        JSON.stringify({ error: "runner_id is required" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    if (!GITHUB_TOKEN) {
      console.error("GITHUB_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "GitHub integration not configured" }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Trigger GitHub Actions workflow via repository_dispatch
    const githubResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/dispatches`,
      {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: "profile-updated",
          client_payload: {
            runner_id: runner_id,
          },
        }),
      }
    );

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text();
      // SECURITY (Item 15): Log details server-side only
      console.error("GitHub API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to trigger sync" }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    console.log(`Triggered sync for runner: ${runner_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sync triggered for ${runner_id}`,
        note: "Changes will appear after the GitHub Action completes and PR is merged"
      }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});
