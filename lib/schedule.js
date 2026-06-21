// lib/schedule.js
// The living training schedule. Seeded once from the Italy 2027 plan,
// then stored in localStorage and editable by both the user and the coaches.

// Weekly template (day 0 = Sunday ... 6 = Saturday) for Phase 1 base.
// Each entry: { sport, title, detail }
const WEEKLY_TEMPLATE = {
  0: { sport: "run",  title: "Long Run",        detail: "Build by feel, HR <168. Most important aerobic session." },
  1: { sport: "push", title: "Push + Easy Run", detail: "Gym push session AM. Easy 6km run PM, HR <168." },
  2: { sport: "bike", title: "Bike",            detail: "60 min steady, HR 150–165, cadence 88–95." },
  3: { sport: "swim", title: "Swim + Pull",     detail: "Technique swim AM. Pull gym session after." },
  4: { sport: "run",  title: "Tempo Run + Legs",detail: "Tempo 3km @5:10–5:37/km. Legs gym after." },
  5: { sport: "swim", title: "Swim",            detail: "Technique focus. Time every 100m." },
  6: { sport: "bike", title: "Long Ride",       detail: "Longest ride of the week. Aerobic, HR <168." },
};

// Fixed special days (races, etc.) keyed by YYYY-MM-DD.
const SEED_EVENTS = {
  "2026-06-28": { sport: "race", title: "🏁 10KM RACE 1", detail: "Race moderate-hard (~85–90%). Target ~5:00–5:20/km. Not all-out." },
  "2026-07-06": { sport: "race", title: "🏁 10KM RACE 2", detail: "Race moderate-hard. Try to match or beat Race 1." },
  "2026-11-29": { sport: "race", title: "🏁 BEIRUT MARATHON", detail: "Sub-4:10 target, training race. First 21km @5:45/km no faster." },
  "2027-09-19": { sport: "race", title: "🏁 IRONMAN ITALY", detail: "Cervia. SUB 10:00. The big one." },
};

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

// Build the schedule for a date range from the template + seed events.
export function seedSchedule(startDate, days = 120) {
  const out = {};
  const d = new Date(startDate);
  for (let i = 0; i < days; i++) {
    const key = ymd(d);
    if (SEED_EVENTS[key]) {
      out[key] = { ...SEED_EVENTS[key], seeded: true };
    } else {
      const tpl = WEEKLY_TEMPLATE[d.getDay()];
      out[key] = { ...tpl, seeded: true };
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

const STORAGE_KEY = "maroun_schedule_v1";

export function loadSchedule() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // First run: seed ~17 weeks out from today
  const seeded = seedSchedule(new Date(), 120);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded)); } catch {}
  return seeded;
}

export function saveSchedule(sched) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sched)); return true; } catch { return false; }
}

// Apply a list of coach-proposed changes. Returns { next, applied }.
// Each change: { date: "YYYY-MM-DD", sport, title, detail, action: "set"|"clear" }
export function applyChanges(sched, changes) {
  const next = { ...sched };
  const applied = [];
  if (!Array.isArray(changes)) return { next, applied };
  for (const c of changes) {
    if (!c || !c.date) continue;
    if (c.action === "clear") {
      if (next[c.date]) { applied.push({ date: c.date, before: next[c.date], after: null }); delete next[c.date]; }
      continue;
    }
    const before = next[c.date] || null;
    const after = {
      sport: c.sport || (before && before.sport) || "other",
      title: c.title || (before && before.title) || "Session",
      detail: c.detail || (before && before.detail) || "",
      edited: true,
    };
    next[c.date] = after;
    applied.push({ date: c.date, before, after });
  }
  return { next, applied };
}

export { ymd, WEEKLY_TEMPLATE };
