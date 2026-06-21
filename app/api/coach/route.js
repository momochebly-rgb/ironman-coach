// app/api/coach/route.js
// Server-side endpoint for the AI coaches.
// Now supports SCHEDULE CHANGES: the coach can append a hidden JSON block
// that the app parses and applies to the calendar (with undo).

import { getIntervalsActivities } from "../../../lib/intervals";
import { getWellness } from "../../../lib/intervals";

const ATHLETE_PROFILE = `
Maroun Chebly, 23 (born Jan 7 2003), Beirut, Lebanon.
70.3kg, 177cm, 20.3% body fat, SMM 31.9kg.
Threshold pace 5:10/km, threshold HR 187, max HR 212, resting HR 57, HRV ~54ms (normal 46-56).
Bench 1RM 60kg, squat 70kg, deadlift untested, swim pace ~2:05/100m.
Bike: renting on weekends, planning to buy (~$1200 budget). FTP untested.
Watch: COROS Pace 4.
GOALS: Marathon Beirut Nov 29 2026 (sub 4:10, training race). Ironman Italy (Cervia, ~late Sep 2027) — A goal SUB 10:00, B goal sub 11:00.
Longest run ~10km, longest ride ~69km (rented), longest swim ~2km.
Weekly: Mon push+run, Tue bike, Wed swim+pull, Thu tempo+legs, Fri swim, Sat long ride, Sun long run. Trains 6-8am & 6-8pm.
`.trim();

const SCHEDULE_RULES = `
You can MODIFY Maroun's training calendar when he asks you to (add a race, move a session, change a day, add rest, etc.).
When — and ONLY when — a schedule change is needed, append a fenced code block at the very END of your reply, after your normal coaching text:

\`\`\`schedule-changes
[
  {"date":"2027-06-28","sport":"race","title":"🏁 10KM Race","detail":"Race moderate-hard ~85-90%","action":"set"},
  {"date":"2027-06-27","sport":"run","title":"Easy shakeout","detail":"20min + 3 strides","action":"set"}
]
\`\`\`

Rules for the block:
- Use action "set" to add/replace a day, "clear" to make a day rest/empty.
- sport must be one of: swim, bike, run, push, pull, legs, brick, race, rest, other.
- date format strictly YYYY-MM-DD. Today's date is provided below — use real future dates.
- Include the surrounding day adjustments too (e.g. easy days before a race), like a real coach would.
- If NO schedule change is requested, DO NOT output the block at all.
- Always explain the change in your normal text BEFORE the block, so Maroun understands it.
`.trim();

const HEAD_COACH = `You are Coach Vince, Maroun's no-nonsense Head Coach for a sub-10 Ironman.
Sarcastic, funny, brutally direct, never sugarcoat — but everything comes from wanting him to make it.
You own the master plan and make the final call. Reference the relevant specialist's view, then decide.
IMPORTANT: Base every opinion on his REAL recent Strava data below — never guess distances, paces, or load. If you don't see it in the data, say so.`;

const TEAM_MEETING = `You are running a TEAM MEETING for Maroun's Ironman coaching team. Roleplay ALL these coaches in one reply:
🧠 Vince (Head Coach — owns plan, final call, speaks last)
🏃 Naia (Running — endurance & durability first)
🏊 Kai (Swimming — technique first, 2:05/100m → target 1:42)
🚴 Bruno (Cycling — VOLUME, nags about buying the bike)
🏋️ Rhea (Strength — injury prevention & strength, PPL)
🥗 Sage (Dietitian — supportive, meal-by-meal, can't cancel training)
🩺 Dr. Hale (Doctor — HRV/HR/pain; critical injury overrides everyone; not a real doctor)
💰 Tariq (Accountant — only speaks when money is involved; zero decision power; Vince decides)
RULES: Most relevant coach speaks first. Others chime in ONLY if it touches their domain. They banter and can disagree. Dr. Hale flags health concerns. Vince speaks LAST and makes the final decision. Format each as "🏊 **Kai:** ...".
Tone: fun, sarcastic, direct, no sugarcoating.
IMPORTANT: Base everything on his REAL recent Strava data below — never guess.`;

function summarizeActivities(acts) {
  if (!acts || acts.length === 0) return "No recent Strava activities found.";
  const recent = acts.slice(0, 15);
  const lines = recent.map((a) => {
    const d = new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const bits = [`${d}: ${a.sport}`];
    if (a.distanceKm > 0) bits.push(`${a.distanceKm}km`);
    if (a.movingTimeMin > 0) bits.push(`${a.movingTimeMin}min`);
    if (a.avgHr) bits.push(`${Math.round(a.avgHr)}bpm`);
    if (a.elevationM > 0) bits.push(`${a.elevationM}m`);
    if (a.avgWatts) bits.push(`${Math.round(a.avgWatts)}W`);
    return "- " + bits.join(", ") + (a.name ? ` (${a.name})` : "");
  });
  const longest = { run: 0, bike: 0, swim: 0 };
  for (const a of acts) {
    if (["run", "bike", "swim"].includes(a.sport) && a.distanceKm > longest[a.sport]) longest[a.sport] = a.distanceKm;
  }
  const stats = `Longest recent — run ${longest.run.toFixed(1)}km, bike ${longest.bike.toFixed(1)}km, swim ${longest.swim.toFixed(2)}km.`;
  return `${stats}\n\nLast 15 activities:\n${lines.join("\n")}`;
}

function summarizeWellness(records) {
  if (!records || records.length === 0) return "No recent HRV/sleep data from intervals.icu.";
  const latest = records.find((r) => r.hrv != null) || records[0];
  const recent = records.slice(0, 7).reverse();
  const trend = recent
    .filter((r) => r.hrv != null)
    .map((r) => `${r.date.slice(5)}: HRV ${r.hrv}${r.restingHr ? `/RHR ${r.restingHr}` : ""}${r.sleepHrs ? `/sleep ${r.sleepHrs}h` : ""}`)
    .join("; ");
  const today = latest
    ? `Latest (${latest.date}): HRV ${latest.hrv ?? "—"}ms, resting HR ${latest.restingHr ?? "—"}bpm, sleep ${latest.sleepHrs ?? "—"}h.`
    : "No reading yet.";
  return `${today}\nMaroun's HRV normal range is 46–56ms.\n7-day trend: ${trend || "n/a"}`;
}

export async function POST(request) {
  try {
    const { message, mode, history } = await request.json();
    if (!message || !message.trim()) {
      return Response.json({ ok: false, error: "Empty message" }, { status: 400 });
    }

    let stravaSummary = "Activity data unavailable right now.";
    try { stravaSummary = summarizeActivities(await getIntervalsActivities(30)); } catch {}

    let wellnessSummary = "Wellness (HRV/sleep) data unavailable right now.";
    try { wellnessSummary = summarizeWellness(await getWellness(14)); } catch {}

    const today = new Date().toISOString().slice(0, 10);
    const persona = mode === "team" ? TEAM_MEETING : HEAD_COACH;
    const system = `${persona}\n\n${SCHEDULE_RULES}\n\nToday's date: ${today}\n\n--- ATHLETE PROFILE ---\n${ATHLETE_PROFILE}\n\n--- REAL RECENT STRAVA DATA ---\n${stravaSummary}\n\n--- REAL RECOVERY DATA (intervals.icu / COROS) ---\n${wellnessSummary}`;

    const messages = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        if (h.role && h.content) messages.push({ role: h.role, content: h.content });
      }
    }
    messages.push({ role: "user", content: message });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: mode === "team" ? 1400 : 900,
        system,
        messages,
      }),
    });

    if (!res.ok) {
      return Response.json({ ok: false, error: `AI request failed: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    let reply = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();

    // Extract optional schedule-changes block
    let changes = null;
    const m = reply.match(/```schedule-changes\s*([\s\S]*?)```/);
    if (m) {
      try { changes = JSON.parse(m[1].trim()); } catch { changes = null; }
      reply = reply.replace(/```schedule-changes[\s\S]*?```/, "").trim();
    }

    return Response.json({ ok: true, reply: reply || "Done.", changes });
  } catch (err) {
    return Response.json({ ok: false, error: err.message || "Server error" }, { status: 500 });
  }
}
