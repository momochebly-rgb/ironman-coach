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
    pacePlan: {
      goalTime: "4:10",
      avgPace: "5:55/km",
      strategy: "Even to slightly negative split. The marathon punishes a fast start — bank patience, not time. Your 52:24 10k says the speed is there; the job is holding it deep.",
      phases: [
        { label: "Opening · km 1–15", pace: "5:58/km", hr: "<165 bpm", note: "Should feel almost too easy. Settle in, lock your rhythm, let fast starters go." },
        { label: "Middle · km 16–32", pace: "5:52/km", hr: "165–174 bpm", note: "Goal-pace cruise. Relax shoulders, fuel every ~40 min, stay smooth and patient." },
        { label: "Final · km 33–42.2", pace: "5:50/km or hold", hr: "174+ bpm", note: "This is the race. Hold form, shorten stride if it bites, empty the tank over the last 5k." },
      ],
      checkpoints: [
        { at: "10 km", time: "0:59:40" },
        { at: "Half (21.1)", time: "2:05:20" },
        { at: "30 km", time: "2:57:30" },
        { at: "Finish", time: "4:08:40" },
      ],
    },
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
    pacePlan: {
      goalTime: "10:00",
      avgPace: "by discipline",
      strategy: "Ironman is paced by discipline, not one number. The race is won by NOT overbiking — ride within yourself so you can run. (Provisional — we'll sharpen these once your bike FTP is tested.)",
      phases: [
        { label: "Swim · 3.8 km", pace: "~1:42/100m", hr: "smooth", note: "Relaxed, draft feet if you can. Don't sprint the start. ~1:05 target." },
        { label: "Bike · 180 km", pace: "~34 km/h", hr: "endurance, below threshold", note: "The discipline leg. Steady power, eat & drink constantly, save the legs. ~5:20." },
        { label: "Run · 42.2 km", pace: "~4:55/km", hr: "by feel", note: "Settle off the bike, walk aid stations if needed, hold on. ~3:27 → sub-10." },
      ],
      checkpoints: [
        { at: "Swim done", time: "~1:05" },
        { at: "Bike done", time: "~6:30 cum." },
        { at: "Finish", time: "~10:00" },
      ],
    },
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

// ---- PACING ----
function paceToSec(p) { // "5:55" -> 355
  const [m, s] = p.split(":").map(Number);
  return m * 60 + s;
}
function secToPace(sec) {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function secToClock(sec) {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Build a marathon pacing plan as checkpoints with a controlled-start,
// hold, then optional negative-split finish. Returns segments + summary.
export function marathonPacingPlan(goalPaceStr) {
  const goal = paceToSec(goalPaceStr);     // sec/km at goal
  // strategy offsets (sec/km relative to goal) per phase
  const segments = [
    { from: 0,  to: 5,   label: "0–5 km",   offset: +10, note: "Controlled start. Resist the adrenaline — bank patience, not seconds." },
    { from: 5,  to: 21,  label: "5–21 km",  offset: 0,   note: "Settle into goal pace. Smooth, relaxed, fuel every 40–45 min." },
    { from: 21, to: 32,  label: "21–32 km", offset: 0,   note: "Hold goal pace. This is where focus matters most — stay on rhythm." },
    { from: 32, to: 42.2,label: "32–42.2 km", offset: -8, note: "If you've got it, push. Negative-split the finish like your 10km PR." },
  ];
  let cumDist = 0, cumTime = 0;
  const rows = segments.map((s) => {
    const segDist = s.to - s.from;
    const segPace = goal + s.offset;
    const segTime = segPace * segDist;
    cumTime += segTime;
    cumDist = s.to;
    return {
      label: s.label,
      pace: secToPace(segPace),
      segTime: secToClock(segTime),
      cumTime: secToClock(cumTime),
      cumDist,
      note: s.note,
    };
  });
  return { rows, finishTime: secToClock(cumTime), avgPace: secToPace(cumTime / 42.2) };
}

export { paceToSec, secToPace, secToClock };

// ---- RACE-DAY FUELING ----
// Structured fueling plans per race. Marathon and Ironman differ a lot.
export const FUELING = {
  beirut: {
    carbsPerHour: "45–60 g",
    summary: "A ~4-hour effort. Carb-load the day before, top off race morning, then gels on a clock from 45 min in.",
    blocks: [
      { when: "Night before", items: [
        "High-carb dinner: pasta/rice + lean protein, low fat/fibre (easy on the stomach)",
        "~8–10 g carbs per kg bodyweight across the day (~600–700g total)",
        "Hydrate well, add electrolytes; stop drinking heavily 2h before bed",
        "Nothing new or greasy — eat what you've trained on",
      ]},
      { when: "Race morning (3h before)", items: [
        "Familiar carb breakfast: oats + banana + honey, or toast + jam (~100g carbs)",
        "Black coffee if that's your norm",
        "Sip water with electrolytes",
      ]},
      { when: "30–45 min before", items: [
        "Optional: 1 gel or a banana (~25g carbs)",
        "Small sips of water — don't overdrink",
      ]},
      { when: "During the race", items: [
        "Gel every 40–45 min from ~45 min in (≈45–60g carbs/hour)",
        "That's roughly 4–5 gels across the marathon — carry them",
        "Water at aid stations; electrolytes if hot",
        "Practice this exact plan on long runs first — never debut fuel on race day",
      ]},
    ],
  },
  italy: {
    carbsPerHour: "60–90 g",
    summary: "A ~10-hour day — this is an eating contest. Fuel the bike heavily so you can run; under-fuelling the bike is the #1 Ironman mistake.",
    blocks: [
      { when: "Night before", items: [
        "Big carb dinner, low fat/fibre. Carb-load across the 2 prior days (~10g/kg)",
        "Hydrate + electrolytes",
      ]},
      { when: "Race morning (3h before)", items: [
        "~150g carbs: oats, banana, honey, toast — familiar only",
        "Electrolyte drink, coffee",
      ]},
      { when: "Swim → T1", items: [
        "Optional gel 10–15 min before the swim start",
      ]},
      { when: "Bike (the engine room)", items: [
        "60–90g carbs/hour — this is where you bank energy for the run",
        "Mix: bottles with carb drink + real food (bars, banana) early, gels later",
        "Drink to thirst + electrolytes every bottle; it'll likely be warm in Cervia",
      ]},
      { when: "Run", items: [
        "Switch to gels + cola + water at aid stations (~60g/hour)",
        "Smaller, frequent intake — your gut is tired by now",
      ]},
    ],
  },
};

// ---- GEAR & LOGISTICS CHECKLISTS ----
// Grouped checklist items per race. The app saves which are ticked (localStorage).
export const CHECKLIST = {
  beirut: [
    { group: "Gear", items: [
      "Race shoes (the ones you've trained in — not brand new)",
      "Socks (anti-blister), shorts, singlet",
      "Race bib + safety pins (or race belt)",
      "GPS watch — charged the night before",
      "Anti-chafe balm (Body Glide / Vaseline)",
      "Cap/visor + sunglasses",
    ]},
    { group: "Nutrition", items: [
      "4–5 gels (your tested brand)",
      "Pre-race breakfast packed/planned",
      "Electrolyte tabs",
      "Water bottle for the start",
    ]},
    { group: "Race morning", items: [
      "Breakfast 3h before",
      "Lay out kit the night before",
      "Pin bib / set up race belt",
      "Warm-up jog + strides",
      "Bag check / clothes for after",
    ]},
    { group: "Logistics", items: [
      "Know start time + corral location",
      "Plan travel to start (traffic, parking)",
      "Packet/bib pickup done in advance",
      "Sleep 8h two nights before (most important night)",
    ]},
  ],
  italy: [
    { group: "Swim", items: [
      "Wetsuit (tested, legal thickness)",
      "Goggles (+ spare pair)",
      "Swim cap (race-issued)",
      "Anti-chafe for neck/wetsuit",
    ]},
    { group: "Bike", items: [
      "Bike — serviced, tyres checked",
      "Helmet (mandatory, no helmet = no race)",
      "Cycling shoes",
      "2+ bottles + carb mix",
      "Spare tube, CO2/pump, multitool",
      "Bike computer charged",
      "Race nutrition taped to top tube",
    ]},
    { group: "Run", items: [
      "Run shoes",
      "Race belt + bib",
      "Cap + sunglasses",
      "Gels / run nutrition",
    ]},
    { group: "Transition bags", items: [
      "Swim-to-bike (T1) bag packed",
      "Bike-to-run (T2) bag packed",
      "Special needs bags (if used)",
      "Morning clothes bag",
      "Labelled with race number",
    ]},
    { group: "Logistics", items: [
      "Athlete check-in + briefing done",
      "Bike + bags racked the day before",
      "Know swim start / transition layout",
      "Accommodation near start booked",
      "Travel with bike planned",
      "Sleep banked across the week",
    ]},
  ],
};
