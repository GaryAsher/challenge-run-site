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

interface ProfileUpdatePayload {
  runner_id: string;
}

serve(async (req: Request) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
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
      console.error("GitHub API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to trigger sync", details: errorText }),
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
