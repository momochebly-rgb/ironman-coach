// lib/readiness.js
// Computes a morning readiness verdict from real COROS/intervals.icu wellness
// data plus any active injuries. Pure functions, no storage.
// Returns { score 0-100, level: "green"|"yellow"|"red", headline, reasons[] }

// Maroun's personal baselines
const HRV_LOW = 46;
const HRV_HIGH = 56;
const SLEEP_GOOD = 7;     // hours
const SLEEP_LOW = 6;
const RHR_BASE = 57;      // typical resting HR

export function computeReadiness(wellness, injuries) {
  // wellness: array newest-first from /api/wellness
  const latest = (wellness || []).find((r) => r.hrv != null) || (wellness || [])[0] || null;
  const reasons = [];
  let score = 100;

  if (!latest) {
    return {
      score: null, level: "none",
      headline: "No recent recovery data",
      reasons: ["Connect/sync COROS via intervals.icu to get a readiness score."],
    };
  }

  // --- HRV (most weight) ---
  if (latest.hrv != null) {
    if (latest.hrv < HRV_LOW) {
      score -= 30;
      reasons.push(`HRV ${latest.hrv}ms is below your normal range (${HRV_LOW}-${HRV_HIGH}) — a sign of fatigue or incomplete recovery.`);
    } else if (latest.hrv > HRV_HIGH) {
      reasons.push(`HRV ${latest.hrv}ms is elevated — typically well-recovered (or sometimes distorted by alcohol/illness).`);
    } else {
      reasons.push(`HRV ${latest.hrv}ms is within your normal range — good autonomic recovery.`);
    }
  }

  // --- Sleep ---
  if (latest.sleepHrs != null) {
    if (latest.sleepHrs < SLEEP_LOW) {
      score -= 25;
      reasons.push(`Only ${latest.sleepHrs}h sleep — under-recovered. Your body repairs during sleep.`);
    } else if (latest.sleepHrs < SLEEP_GOOD) {
      score -= 12;
      reasons.push(`${latest.sleepHrs}h sleep — a bit short of the 7-9h target.`);
    } else {
      reasons.push(`${latest.sleepHrs}h sleep — solid recovery.`);
    }
  }

  // --- Resting / sleeping HR ---
  const rhr = latest.sleepingHr ?? latest.restingHr;
  if (rhr != null) {
    if (rhr > RHR_BASE + 7) {
      score -= 15;
      reasons.push(`Resting HR ${rhr}bpm is elevated vs your ~${RHR_BASE} baseline — possible fatigue, stress, or illness.`);
    } else if (rhr <= RHR_BASE) {
      reasons.push(`Resting HR ${rhr}bpm is at/below baseline — well recovered.`);
    }
  }

  // --- Fatigue (ATL) vs Fitness (CTL) form ---
  if (latest.fitness != null && latest.fatigue != null) {
    const form = latest.fitness - latest.fatigue; // TSB-like
    if (form < -15) {
      score -= 15;
      reasons.push(`Training load is high right now (fatigue well above fitness) — you're carrying deep fatigue.`);
    } else if (form > 5) {
      reasons.push(`You're fresh — fatigue is below fitness, legs should feel good.`);
    }
  }

  // --- Active injuries (override-ish) ---
  let injuryCap = null;
  if (Array.isArray(injuries) && injuries.length) {
    for (const inj of injuries) {
      if (inj.pain >= 6 || inj.when === "walking") {
        score -= 40; injuryCap = "red";
        reasons.push(`⚠️ ${inj.part} pain ${inj.pain}/10 (${inj.when}) — do not load it. This caps your readiness regardless of recovery numbers.`);
      } else if (inj.pain >= 3) {
        score -= 20; if (injuryCap !== "red") injuryCap = "yellow";
        reasons.push(`${inj.part} niggle ${inj.pain}/10 (${inj.when}, ${inj.trend}) — train around it, avoid aggravating movements.`);
      } else if (inj.pain > 0) {
        reasons.push(`${inj.part} minor (${inj.pain}/10, ${inj.trend}) — keep an eye on it.`);
      }
    }
  }

  score = Math.max(0, Math.min(100, score));

  // determine level
  let level;
  if (injuryCap === "red" || score < 50) level = "red";
  else if (injuryCap === "yellow" || score < 75) level = "yellow";
  else level = "green";

  const headline =
    level === "green" ? "Good to train as planned"
    : level === "yellow" ? "Train, but manage it"
    : "Recovery / easy day";

  return { score, level, headline, reasons };
}
