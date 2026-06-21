// app/api/coach/route.js
// Server-side endpoint for the AI coaches.
// The Anthropic API key stays on the server — never sent to the browser.
// The browser POSTs the user's message + which mode (head coach vs team meeting),
// we inject the persona + athlete profile + recent Strava data, then return the reply.

import { getActivities } from "../../../lib/strava";

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

const HEAD_COACH = `You are Coach Vince, Maroun's no-nonsense Head Coach for a sub-10 Ironman.
Sarcastic, funny, brutally direct, never sugarcoat — but everything comes from wanting him to make it.
You own the master plan and make the final call. You reference the relevant specialist's view, then decide.
IMPORTANT: Base every opinion on his REAL recent Strava data provided below — never guess distances, paces, or load. If you don't see it in the data, say so.`;

const TEAM_MEETING = `You are running a TEAM MEETING for Maroun's Ironman coaching team. Roleplay ALL these coaches in one reply:
🧠 Vince (Head Coach — owns plan, final call, speaks last)
🏃 Naia (Running — endurance & durability first)
🏊 Kai (Swimming — technique first, current 2:05/100m → target 1:42)
🚴 Bruno (Cycling — VOLUME, nags about buying the bike)
🏋️ Rhea (Strength — injury prevention & strength, PPL)
🥗 Sage (Dietitian — supportive, meal-by-meal, can't cancel training)
🩺 Dr. Hale (Doctor — HRV/HR/pain; critical injury overrides everyone; not a real doctor)
💰 Tariq (Accountant — only speaks when money is involved; zero decision power; Vince decides)
RULES: Most relevant in-field coach speaks first. Others chime in ONLY if it touches their domain (don't force everyone in). They banter and can disagree. Dr. Hale flags health concerns. Vince speaks LAST and makes the final decision. Format each as "🏊 **Kai:** ...".
Tone: fun, sarcastic, direct, no sugarcoating.
IMPORTANT: Base everything on his REAL recent Strava data below — never guess distances, paces, or load.`;

function summarizeActivities(acts) {
  if (!acts || acts.length === 0) return "No recent Strava activities found.";
  const recent = acts.slice(0, 15);
  const lines = recent.map((a) => {
    const d = new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const bits = [`${d}: ${a.sport}`];
    if (a.distanceKm > 0) bits.push(`${a.distanceKm}km`);
    if (a.movingTimeMin > 0) bits.push(`${a.movingTimeMin}min`);
    if (a.avgHr) bits.push(`${Math.round(a.avgHr)}bpm avg`);
    if (a.elevationM > 0) bits.push(`${a.elevationM}m elev`);
    if (a.avgWatts) bits.push(`${Math.round(a.avgWatts)}W`);
    return "- " + bits.join(", ") + (a.name ? ` (${a.name})` : "");
  });
  // quick stats
  const longest = { run: 0, bike: 0, swim: 0 };
  for (const a of acts) {
    if (["run", "bike", "swim"].includes(a.sport) && a.distanceKm > longest[a.sport]) {
      longest[a.sport] = a.distanceKm;
    }
  }
  const stats = `Longest recent — run ${longest.run.toFixed(1)}km, bike ${longest.bike.toFixed(1)}km, swim ${longest.swim.toFixed(2)}km.`;
  return `${stats}\n\nLast 15 activities:\n${lines.join("\n")}`;
}

export async function POST(request) {
  try {
    const { message, mode, history } = await request.json();

    if (!message || !message.trim()) {
      return Response.json({ ok: false, error: "Empty message" }, { status: 400 });
    }

    // Pull real Strava data so the coaches speak from actual numbers
    let stravaSummary = "Strava data unavailable right now.";
    try {
      const acts = await getActivities(30);
      stravaSummary = summarizeActivities(acts);
    } catch (e) {
      // non-fatal — coaches still answer, just without live data
    }

    const persona = mode === "team" ? TEAM_MEETING : HEAD_COACH;
    const system = `${persona}\n\n--- ATHLETE PROFILE ---\n${ATHLETE_PROFILE}\n\n--- REAL RECENT STRAVA DATA ---\n${stravaSummary}`;

    // Build messages array (include short history for context)
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
        max_tokens: mode === "team" ? 1200 : 700,
        system,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ ok: false, error: `AI request failed: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const reply = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return Response.json({ ok: true, reply: reply || "No response generated." });
  } catch (err) {
    return Response.json({ ok: false, error: err.message || "Server error" }, { status: 500 });
  }
}
