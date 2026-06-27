// lib/injuries.js
// Local injury / niggle tracker. Stores entries in localStorage and provides
// helpers to log, list, and summarize trends per body part.
// Also exposes a summary the coaches can read so they factor niggles in.

const STORAGE_KEY = "maroun_injuries_v1";

// entry shape:
// { id, date: "YYYY-MM-DD", part, pain: 0-10, when: "rest"|"walking"|"training", note, ts }

export function loadInjuries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveInjuries(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); return true; } catch { return false; }
}

export function addInjury(entry) {
  const list = loadInjuries();
  const e = {
    id: "inj_" + Date.now(),
    date: entry.date || new Date().toISOString().slice(0, 10),
    part: entry.part || "Other",
    pain: typeof entry.pain === "number" ? entry.pain : 0,
    when: entry.when || "rest",
    note: entry.note || "",
    ts: Date.now(),
  };
  const next = [e, ...list];
  saveInjuries(next);
  return next;
}

export function deleteInjury(id) {
  const next = loadInjuries().filter((e) => e.id !== id);
  saveInjuries(next);
  return next;
}

// Group entries by body part, newest first within each.
export function byPart(list) {
  const map = {};
  for (const e of list) {
    if (!map[e.part]) map[e.part] = [];
    map[e.part].push(e);
  }
  for (const k of Object.keys(map)) map[k].sort((a, b) => (a.date < b.date ? 1 : -1));
  return map;
}

// An "active" niggle = logged in the last 10 days with most recent pain > 0.
export function activeNiggles(list) {
  const grouped = byPart(list);
  const cutoff = Date.now() - 10 * 864e5;
  const active = [];
  for (const [part, entries] of Object.entries(grouped)) {
    const recent = entries.filter((e) => e.ts >= cutoff);
    if (!recent.length) continue;
    const latest = recent[0];
    if (latest.pain > 0) {
      // trend: compare latest pain to the oldest recent one
      const oldest = recent[recent.length - 1];
      let trend = "steady";
      if (recent.length > 1) {
        if (latest.pain < oldest.pain) trend = "improving";
        else if (latest.pain > oldest.pain) trend = "worsening";
      }
      active.push({ part, pain: latest.pain, when: latest.when, date: latest.date, trend });
    }
  }
  return active;
}

// Compact text summary for the coach prompt.
export function injurySummaryText(list) {
  const active = activeNiggles(list);
  if (!active.length) return "No active injuries or niggles logged.";
  return active
    .map((a) => `${a.part}: pain ${a.pain}/10 (${a.when}), trend ${a.trend}, last logged ${a.date}`)
    .join("; ");
}

export const BODY_PARTS = ["Calf", "Knee", "Hamstring", "Quad", "Achilles", "Foot", "Hip", "Shin", "Lower back", "Shoulder", "Other"];
export const WHEN_OPTIONS = [
  { v: "rest", label: "At rest" },
  { v: "walking", label: "Walking" },
  { v: "training", label: "Only training" },
];
