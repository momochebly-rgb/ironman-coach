// lib/races.js
// Race definitions that power the Race Hub. Each race knows its date, type,
// and the distances that matter for readiness tracking.

export const RACES = {
  beirut: {
    id: "beirut",
    name: "Beirut Marathon",
    short: "Marathon",
    loc: "Beirut, Lebanon",
    date: "2026-11-29",
    dateLabel: "Nov 29, 2026",
    type: "run",                 // single-discipline
    img: "/beirut.png",
    accent: "var(--run)",
    goal: "Sub-4:10 — training race",
    // distances in km for readiness bars
    legs: [
      { sport: "run", label: "Run", target: 42.2 },
    ],
    // pacing target (filled in Phase 2)
    pace: { goalTime: "4:10:00", goalPace: "5:55/km" },
  },
  italy: {
    id: "italy",
    name: "IRONMAN Italy",
    short: "Ironman",
    loc: "Emilia-Romagna · Cervia",
    date: "2027-09-19",
    dateLabel: "Sep 2027",
    type: "tri",                 // three disciplines
    img: "/ironman.png",
    accent: "var(--swim)",
    goal: "Sub-10:00 — the big one",
    legs: [
      { sport: "swim", label: "Swim", target: 3.8 },
      { sport: "bike", label: "Bike", target: 180 },
      { sport: "run",  label: "Run",  target: 42.2 },
    ],
    pace: { goalTime: "10:00:00", goalPace: "swim 1:45/100m · bike ~30km/h · run 5:20/km" },
  },
};

export function daysUntil(dateStr, now = new Date()) {
  const d = new Date(dateStr + "T00:00:00");
  return Math.max(0, Math.ceil((d - now) / 864e5));
}

// weeks until, for phase/taper logic later
export function weeksUntil(dateStr, now = new Date()) {
  return Math.floor(daysUntil(dateStr, now) / 7);
}
