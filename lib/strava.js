// lib/strava.js
// Server-side only. Talks to Strava, refreshes tokens automatically.
// Secrets come from environment variables — never exposed to the browser.

const STRAVA_CLIENT_ID = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;

// Exchange the long-lived refresh token for a fresh short-lived access token.
async function getAccessToken() {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: STRAVA_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Strava token refresh failed: ${res.status}`);
  }
  const data = await res.json();
  return data.access_token;
}

// Map a Strava activity type to one of our coach domains.
function sportOf(type) {
  if (!type) return "other";
  const t = type.toLowerCase();
  if (t.includes("run")) return "run";
  if (t.includes("ride") || t.includes("bike") || t.includes("cycl")) return "bike";
  if (t.includes("swim")) return "swim";
  if (t.includes("weight") || t.includes("workout") || t.includes("strength")) return "strength";
  return "other";
}

// Fetch recent activities and normalize the fields we care about.
export async function getActivities(perPage = 30) {
  const token = await getAccessToken();
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Strava activities fetch failed: ${res.status}`);
  }
  const raw = await res.json();
  return raw.map((a) => ({
    id: a.id,
    name: a.name,
    sport: sportOf(a.sport_type || a.type),
    type: a.sport_type || a.type,
    distanceKm: a.distance ? +(a.distance / 1000).toFixed(2) : 0,
    movingTimeMin: a.moving_time ? Math.round(a.moving_time / 60) : 0,
    elapsedTimeMin: a.elapsed_time ? Math.round(a.elapsed_time / 60) : 0,
    avgHr: a.average_heartrate || null,
    maxHr: a.max_heartrate || null,
    avgSpeedKmh: a.average_speed ? +((a.average_speed * 3.6).toFixed(1)) : null,
    elevationM: a.total_elevation_gain ? Math.round(a.total_elevation_gain) : 0,
    avgWatts: a.average_watts || null,
    date: a.start_date_local,
  }));
}
