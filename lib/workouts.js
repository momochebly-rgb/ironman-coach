// lib/workouts.js
// Structured workout library. Each day-type maps to a detailed session:
// AM and PM blocks, and for gym days, full exercise tables (sets/reps/weight).
// Pulled from Maroun's Italy 2027 plan + PPL program.

// block types:
//  { time, label, kind:"cardio", lines:[...] }        -> bullet lines
//  { time, label, kind:"strength", ex:[[name,sets,reps,weight,cue],...] }

export const WORKOUTS = {
  push: {
    title: "Push + Easy Run",
    blocks: [
      { time: "6:00–8:00 AM", label: "Gym — Push", kind: "strength", ex: [
        ["Bench Press", "4", "6–10", "40kg", "Arch, feet flat, bar to lower chest, full ROM"],
        ["Incline DB Press", "4", "8–10", "40kg", "45°, control descent, squeeze top"],
        ["Overhead Press", "4", "8", "—", "Strict, no leg drive (add from wk5)"],
        ["Lateral Raises", "4", "15", "16kg", "Light, strict, feel the medial delt"],
        ["Pec Deck / Cable Fly", "3", "15", "30kg", "Squeeze at peak, slow eccentric"],
        ["Tricep Pushdown", "4", "10–12", "17.5kg", "Elbows pinned, full extension"],
        ["Skull Crushers", "3", "12", "—", "Controlled, elbows tracked in"],
      ]},
      { time: "6:00–8:00 PM", label: "Easy Run", kind: "cardio", lines: [
        "Easy jog 6km — HR below 168 the entire run",
        "Conversational pace — if HR climbs, slow down or walk",
        "This is recovery/aerobic, NOT a tempo. No ego pace.",
      ]},
    ],
  },
  bike: {
    title: "Bike",
    blocks: [
      { time: "6:00–8:00 AM", label: "Ride", kind: "cardio", lines: [
        "Warm-up 10 min, HR <150",
        "Steady state 40 min, HR 150–165",
        "Cadence 88–95 rpm throughout",
        "Cool-down 10 min, HR <150",
        "Log avg watts if available. Base building — steady, not hard.",
      ]},
    ],
  },
  swim: {
    title: "Swim",
    blocks: [
      { time: "6:00–8:00 AM", label: "Pool — Technique", kind: "cardio", lines: [
        "Warm-up 200–400m easy",
        "Main set 6 × 100m, 20s rest — time every 100m",
        "Cool-down 200m technique",
        "Bilateral breathing every 3 strokes, high elbow catch",
        "Target under 2:10/100m, building toward 1:42",
      ]},
    ],
  },
  "swim-pull": {
    title: "Swim + Pull",
    blocks: [
      { time: "6:00–8:00 AM", label: "Pool", kind: "cardio", lines: [
        "Warm-up 400m easy",
        "Main set 4 × 100m, 20s rest — time every 100m",
        "Cool-down 400m technique",
      ]},
      { time: "6:00–8:00 PM", label: "Gym — Pull", kind: "strength", ex: [
        ["Barbell Row", "4", "6–8", "32.5kg", "Hinge, bar to lower chest, squeeze blades"],
        ["Lat Pulldown / Pull-Ups", "4", "6–10", "42.5kg", "Full stretch top, chin over bar"],
        ["Seated Cable Row", "4", "10–12", "42.5kg", "Elbows close, squeeze, controlled return"],
        ["Face Pull", "4", "15", "21.5kg", "External rotation, slow"],
        ["Incline DB Curl", "4", "10", "16kg", "Full supination, no swing"],
        ["Hammer Curl", "3", "12", "12kg", "Neutral grip, strict"],
      ]},
    ],
  },
  "run-legs": {
    title: "Tempo Run + Legs",
    blocks: [
      { time: "6:00–8:00 AM", label: "Tempo Run", kind: "cardio", lines: [
        "Warm-up 2km, HR <168",
        "Tempo 3km @ 5:10–5:37/km (HR 179–191)",
        "Cool-down 1km, HR <155",
        "Tempo is controlled hard, not a sprint.",
      ]},
      { time: "6:00–8:00 PM", label: "Gym — Legs", kind: "strength", ex: [
        ["Back Squat", "4", "6–10", "70kg", "Depth below parallel, braced core, knees track toes"],
        ["Romanian Deadlift", "4", "8–10", "52.5kg", "Hinge, slight knee bend, bar close"],
        ["Leg Press", "3", "12–15", "80kg", "Full ROM, do not lock out"],
        ["Walking Lunge", "3", "12", "20kg", "Step through, knee tracks toe"],
        ["Bulgarian Split Squat", "3", "10", "15kg", "Controlled, balanced"],
        ["Calf Raise", "4", "20", "40kg", "Full ROM, pause top, 3s down"],
      ]},
    ],
  },
  "long-run": {
    title: "Long Run",
    blocks: [
      { time: "6:00–8:00 AM", label: "Long Run", kind: "cardio", lines: [
        "Build distance by feel — increase ~10% at a time, no big jumps",
        "HR below 168 the entire run",
        "Walk the hills if HR climbs — base building, not racing",
        "Fuel: 500ml water; gels only if over 90 min",
        "Your most important aerobic session — stay easy.",
      ]},
    ],
  },
  "long-ride": {
    title: "Long Ride",
    blocks: [
      { time: "6:00–8:00 AM", label: "Long Ride", kind: "cardio", lines: [
        "Longest ride of the week — build distance progressively",
        "Aerobic, HR <168, steady effort",
        "Eat every 45 min, electrolytes throughout",
        "Cadence 85–95. This is where sub-10 is built.",
      ]},
    ],
  },
  race: {
    title: "Race Day",
    blocks: [
      { time: "Race", label: "Race", kind: "cardio", lines: [
        "Run moderate-hard (~85–90%) unless told otherwise",
        "Warm up 10–15 min easy + a few strides before the gun",
        "Pace controlled — don't sprint the start",
        "Log it afterwards and compare to your last race.",
      ]},
    ],
  },
  rest: {
    title: "Rest + Recovery",
    blocks: [
      { time: "All day", label: "Recovery", kind: "cardio", lines: [
        "Complete rest or 20 min easy walk",
        "Foam roll, stretch, mobility",
        "Sleep 8+ hours, hit protein target",
        "Recovery is where adaptation happens.",
      ]},
    ],
  },
};

// Map a calendar entry to a detailed workout key.
// Uses the entry's title to disambiguate same-sport variants.
export function workoutKeyFor(entry) {
  if (!entry || entry.sport === "rest") return "rest";
  if (entry.sport === "race") return "race";
  const t = (entry.title || "").toLowerCase();
  if (entry.sport === "run") return t.includes("long") ? "long-run" : (t.includes("tempo") || t.includes("legs")) ? "run-legs" : "long-run";
  if (entry.sport === "bike") return t.includes("long") ? "long-ride" : "bike";
  if (entry.sport === "swim") return t.includes("pull") ? "swim-pull" : "swim";
  if (entry.sport === "push") return "push";
  if (entry.sport === "pull") return "swim-pull";
  if (entry.sport === "legs") return "run-legs";
  return null; // custom / coach-added day with no library match -> show free text
}
