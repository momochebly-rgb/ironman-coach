// lib/intervals.js
// Server-side only. Reads wellness + activity data from intervals.icu.
// Auth is HTTP Basic: username "API_KEY", password = your key.

const ATHLETE_ID = process.env.INTERVALS_ATHLETE_ID;
const API_KEY = process.env.INTERVALS_API_KEY;

function authHeader() {
  const token = Buffer.from(`API_KEY:${API_KEY}`).toString("base64");
  return `Basic ${token}`;
}
function ymd(d) { return d.toISOString().slice(0, 10); }

async function iget(path) {
  const res = await fetch(`https://intervals.icu/api/v1${path}`, {
    headers: { Authorization: authHeader() }, cache: "no-store",
  });
  if (!res.ok) throw new Error(`intervals.icu ${path} failed: ${res.status}`);
  return res.json();
}

// ---- WELLNESS ----
export async function getWellnessRaw(days = 30) {
  const end = new Date(); const start = new Date(end.getTime() - days * 864e5);
  return iget(`/athlete/${ATHLETE_ID}/wellness?oldest=${ymd(start)}&newest=${ymd(end)}`);
}
export async function getWellness(days = 30) {
  const raw = await getWellnessRaw(days);
  return (Array.isArray(raw) ? raw : []).map((w) => ({
    date: w.id,
    hrv: w.hrv ?? null,
    hrvSDNN: w.hrvSDNN ?? null,
    restingHr: w.restingHR ?? null,
    sleepingHr: w.avgSleepingHR ?? null,
    steps: w.steps ?? null,
    sleepHrs: w.sleepSecs != null ? +(w.sleepSecs / 3600).toFixed(1) : (w.sleep ?? null),
    sleepScore: w.sleepScore ?? null,
    vo2max: w.vo2max ?? null,
    spO2: w.spO2 ?? null,
    fitness: w.ctl ?? null,
    fatigue: w.atl ?? null,
    form: w.form ?? null,
    weight: w.weight ?? null,
  })).filter((r) => r.date).sort((a, b) => (a.date < b.date ? 1 : -1));
}
export async function getLatestWellness(days = 14) {
  const records = await getWellness(days);
  return records.find((r) => r.hrv != null) || records[0] || null;
}

// ---- ACTIVITIES ----
function sportOf(type) {
  if (!type) return "other";
  const t = type.toLowerCase();
  if (t.includes("run")) return "run";
  if (t.includes("ride") || t.includes("bike") || t.includes("cycl") || t.includes("virtualride")) return "bike";
  if (t.includes("swim")) return "swim";
  if (t.includes("weight") || t.includes("strength") || t.includes("workout")) return "strength";
  return "other";
}

export async function getIntervalsActivities(days = 90) {
  const end = new Date(); const start = new Date(end.getTime() - days * 864e5);
  const raw = await iget(`/athlete/${ATHLETE_ID}/activities?oldest=${ymd(start)}&newest=${ymd(end)}`);
  return (Array.isArray(raw) ? raw : []).map((a) => ({
    id: a.id,
    name: a.name,
    sport: sportOf(a.type),
    type: a.type,
    date: a.start_date_local || a.start_date,
    distanceKm: a.distance != null ? +(a.distance / 1000).toFixed(2) : 0,
    movingTimeMin: a.moving_time != null ? Math.round(a.moving_time / 60) : 0,
    elapsedTimeMin: a.elapsed_time != null ? Math.round(a.elapsed_time / 60) : 0,
    elevationM: a.total_elevation_gain != null ? Math.round(a.total_elevation_gain) : 0,
    avgHr: a.average_heartrate ?? a.icu_average_hr ?? null,
    maxHr: a.max_heartrate ?? null,
    avgWatts: a.icu_average_watts ?? a.average_watts ?? null,
    avgSpeedKmh: a.average_speed != null ? +((a.average_speed * 3.6).toFixed(1)) : null,
    trainingLoad: a.icu_training_load ?? a.training_load ?? null,
    relativeEffort: a.icu_training_load ?? null, // intervals load ~ relative effort
    intensity: a.icu_intensity ?? null,
    calories: a.calories ?? null,
    polyline: a.map?.summary_polyline || a.icu_polyline || null,
  })).filter((a) => a.id).sort((a, b) => (a.date < b.date ? 1 : -1));
}

// Single activity detail
export async function getActivity(id) {
  return iget(`/activity/${id}`);
}

// Time-series streams for graphs + GPS for the map
export async function getActivityStreams(id) {
  // intervals.icu stream endpoint returns named streams
  const types = "time,heartrate,watts,cadence,distance,altitude,velocity_smooth,latlng";
  const raw = await iget(`/activity/${id}/streams?types=${types}`);
  // raw is an array of {type, data} OR an object keyed by type — normalize to map
  const map = {};
  if (Array.isArray(raw)) {
    for (const s of raw) if (s && s.type) map[s.type] = s.data;
  } else if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw)) map[k] = v?.data ?? v;
  }
  return map;
}

export { ymd };
