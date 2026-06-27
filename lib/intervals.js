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

// ---- DETAILED ACTIVITY ANALYSIS (splits, laps, zones) for the coaches ----

// Maroun's COROS HR zones (bpm)
const HR_ZONES = [
  { name: "Recovery",            max: 149 },
  { name: "Aerobic Endurance",   max: 168 },
  { name: "Aerobic Power",       max: 178 },
  { name: "Threshold",           max: 191 },
  { name: "Anaerobic Endurance", max: 198 },
  { name: "Anaerobic Power",     max: 999 },
];

function fmtTime(sec) {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${m}:${String(s).padStart(2,"0")}`;
}
function fmtPace(secPerUnit) { // returns m:ss
  const m = Math.floor(secPerUnit / 60), s = Math.round(secPerUnit % 60);
  return `${m}:${String(s).padStart(2,"0")}`;
}

// Try intervals.icu's native laps endpoint; return [] on any problem.
export async function getActivityLaps(id) {
  try {
    const raw = await iget(`/activity/${id}/intervals`);
    let laps = [];
    if (Array.isArray(raw)) laps = raw;
    else if (raw && Array.isArray(raw.icu_intervals)) laps = raw.icu_intervals;
    else if (raw && Array.isArray(raw.laps)) laps = raw.laps;
    return laps;
  } catch { return []; }
}

// Build a detailed, compact text breakdown of ONE activity for the coach prompt:
// overall line + HR-zone distribution + per-split table — all derived from streams.
export async function describeActivityForCoach(act) {
  const lines = [];
  const d = new Date(act.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  lines.push(`### ${d} — ${act.name || act.sport} (${act.sport})`);
  const overall = [];
  if (act.distanceKm > 0) overall.push(`${act.distanceKm} km`);
  if (act.movingTimeMin > 0) overall.push(`${act.movingTimeMin} min`);
  if (act.avgHr) overall.push(`avg HR ${Math.round(act.avgHr)}`);
  if (act.maxHr) overall.push(`max HR ${Math.round(act.maxHr)}`);
  if (act.avgWatts) overall.push(`avg ${Math.round(act.avgWatts)}W`);
  if (act.elevationM) overall.push(`${act.elevationM} m climb`);
  if (act.trainingLoad) overall.push(`load ${Math.round(act.trainingLoad)}`);
  lines.push("Overall: " + overall.join(", "));

  // streams
  let s = {};
  try { s = await getActivityStreams(act.id); } catch {}
  const time = s.time || null;
  const dist = s.distance || null;            // cumulative metres
  const hr = s.heartrate || s.heart_rate || null;
  const vel = s.velocity_smooth || null;

  // --- HR zone distribution (seconds per zone) ---
  if (hr && time && hr.length === time.length && hr.length > 1) {
    const zoneSecs = new Array(HR_ZONES.length).fill(0);
    for (let i = 1; i < hr.length; i++) {
      const dt = time[i] - time[i - 1];
      if (dt <= 0 || dt > 30) continue; // skip gaps
      const bpm = hr[i];
      if (bpm == null) continue;
      let zi = HR_ZONES.findIndex((z) => bpm <= z.max);
      if (zi < 0) zi = HR_ZONES.length - 1;
      zoneSecs[zi] += dt;
    }
    const total = zoneSecs.reduce((a, b) => a + b, 0);
    if (total > 0) {
      const zline = HR_ZONES
        .map((z, i) => ({ z, pct: Math.round((zoneSecs[i] / total) * 100), sec: zoneSecs[i] }))
        .filter((x) => x.pct > 0)
        .map((x) => `${x.z.name} ${x.pct}%`)
        .join(", ");
      lines.push("HR zones: " + zline);
    }
  }

  // --- splits ---
  if (dist && time && dist.length === time.length && dist.length > 2) {
    const splitM = act.sport === "swim" ? 100 : act.sport === "bike" ? 5000 : 1000;
    const splits = [];
    let nextMark = splitM, lastTime = time[0] || 0, lastIdx = 0;
    for (let i = 1; i < dist.length; i++) {
      if (dist[i] >= nextMark) {
        const segTime = time[i] - lastTime;
        let hrAvg = null;
        if (hr) {
          let sum = 0, n = 0;
          for (let j = lastIdx; j <= i; j++) { if (hr[j] != null) { sum += hr[j]; n++; } }
          if (n) hrAvg = Math.round(sum / n);
        }
        splits.push({ mark: nextMark, segTime, hrAvg });
        lastTime = time[i]; lastIdx = i; nextMark += splitM;
        if (splits.length >= 40) break;
      }
    }
    if (splits.length) {
      const unitLabel = act.sport === "swim" ? "/100m" : act.sport === "bike" ? "km/h" : "/km";
      const rows = splits.map((sp, i) => {
        let perf;
        if (act.sport === "bike") {
          const kmh = (splitM / 1000) / (sp.segTime / 3600);
          perf = `${kmh.toFixed(1)} km/h`;
        } else if (act.sport === "swim") {
          perf = `${fmtPace(sp.segTime)}/100m`;
        } else {
          perf = `${fmtPace(sp.segTime)}/km`;
        }
        return `${i + 1}: ${perf}${sp.hrAvg ? ` @${sp.hrAvg}bpm` : ""}`;
      });
      lines.push(`Splits (${act.sport === "swim" ? "100m" : act.sport === "bike" ? "5km" : "1km"}): ` + rows.join(" | "));
    }
  }

  return lines.join("\n");
}

export { ymd };
