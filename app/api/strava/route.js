// app/api/strava/route.js
// Server-side endpoint. The browser calls /api/strava and gets back
// normalized activity data. Secrets stay on the server.

import { getActivities } from "../../../lib/strava";

export async function GET() {
  try {
    const activities = await getActivities(30);
    return Response.json({ ok: true, activities });
  } catch (err) {
    return Response.json(
      { ok: false, error: err.message || "Failed to fetch Strava data" },
      { status: 500 }
    );
  }
}
