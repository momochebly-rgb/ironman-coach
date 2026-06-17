"use client";
import { useState, useEffect } from "react";

// ---- STATIC PLAN DATA ----
const MARATHON = new Date("2026-11-29");
const IRONMAN = new Date("2027-09-19");

const SESSIONS = {
  0: { t: "Rest + Recovery", ic: "🛌", cls: "rest", meta: "Sunday · full rest", gym: null,
    cardio: "Complete rest. Walk 20 min max. Foam roll, stretch, sleep 8+ hrs. Recovery is where adaptation happens.",
    note: "Your body builds fitness during rest, not during workouts. Today: sleep 8 hours and hit your protein target." },
  1: { t: "Push + Easy Run", ic: "🏋️", cls: "push", meta: "6:00 AM · ~85 min", gymLbl: "Gym — push",
    gym: [["Bench Press","4 × 8","40kg"],["Incline DB Press","4 × 8","40kg"],["Seated DB Press","4 × 10","20kg"],["Lateral Raises","4 × 15","16kg"],["Pec Deck","3 × 15","30kg"],["Tricep Pushdown","4 × 12","17.5kg"]],
    cardioLbl: "After work",
    cardio: "Easy jog 6km — HR below 168 the entire run. If HR rises, slow down or walk. No exceptions.",
    note: "Push day + easy run. Lift heavy in the gym, run easy in zone 2. Two different intensities — respect both." },
  2: { t: "Bike", ic: "🚴", cls: "bike", meta: "6:00 AM · 60 min", gymLbl: "Spin session",
    gym: [["Warm-up","10 min","HR<150"],["Steady state","40 min","HR 150–165"],["Cadence","throughout","88–95 rpm"],["Cool-down","10 min","HR<150"]],
    cardioLbl: "Note",
    cardio: "Log average watts if the gym bike shows them. Base building — steady, not hard. Cadence over resistance.",
    note: "Spin day. If you're not sweating by minute 20, add resistance. Get your real bike soon — this is temporary." },
  3: { t: "Swim + Pull", ic: "🏊", cls: "swim", meta: "6:00 AM · ~90 min", gymLbl: "Pool",
    gym: [["Warm-up","400m","easy"],["Main set","4 × 100m","20s rest"],["Cool-down","400m","technique"]],
    cardioLbl: "Then — pull session",
    cardio: "• Barbell Row 4×8 @32.5kg\n• Lat Pulldown 4×10 @42.5kg\n• Cable Row 4×12 @42.5kg\n• Face Pull 4×15 @21.5kg\n• DB Bicep Curl 3×10 @16kg\n• Hammer Curl 3×12 @12kg",
    note: "Swim first, pull after. Time every 100m — track your pace. Target under 2:10/100m today, building toward 1:42." },
  4: { t: "Tempo Run + Legs", ic: "🏃", cls: "run", meta: "6:00 AM · ~90 min", gymLbl: "Run",
    gym: [["Warm-up","2km","HR<168"],["Tempo","3km","5:10–5:37/km"],["Cool-down","1km","HR<155"]],
    cardioLbl: "Then — legs session",
    cardio: "• Squat 4×8 @70kg\n• Romanian Deadlift 4×8 @52.5kg\n• Walking Lunge 3×12 @20kg\n• Bulgarian Split Squat 3×10 @15kg\n• Leg Press 3×15 @80kg\n• Calf Raise 4×20 @40kg",
    note: "Run first, legs after — legs will be pre-fatigued by design. Tempo is controlled hard, not a sprint. HR 179–191." },
  5: { t: "Swim", ic: "🏊", cls: "swim", meta: "6:00 AM · 45 min", gymLbl: "Pool",
    gym: [["Warm-up","200m","technique"],["Main set","6 × 100m","20s rest"],["Cool-down","200m","easy"]],
    cardioLbl: "Focus",
    cardio: "Bilateral breathing every 3 strokes. Time each 100m. High elbow catch. If your stroke breaks down, slow down and fix it.",
    note: "Friday technique swim. No ego in the water — quality over speed. This is your weakest discipline, so it matters most." },
  6: { t: "Long Run", ic: "🏃", cls: "run", meta: "6:00 AM · 12km", gymLbl: "Run",
    gym: [["Long run","12km","HR<168"],["Pace","none","time on feet"],["Fuel","500ml water","none <90min"]],
    cardioLbl: "Note",
    cardio: "HR below 168 the entire run. If you hit a hill and HR climbs, walk the hill. This is base building, not racing.",
    note: "Saturday long run — your most important aerobic session. Builds the engine everything else runs on. Stay easy." },
};

const MEALS = {
  lift: { lbl: "Lifting day", k: 3200, p: 172, c: 370, f: 90, m: [
    ["5:30 AM","Pre-workout","1 banana + 2 tbsp peanut butter + black coffee",8,42,18,360],
    ["8:00 AM","Post-workout breakfast","4 eggs + 2 egg whites + 100g oats + 200g Greek yogurt + honey + blueberries",58,85,22,780],
    ["11:00 AM","Mid-morning","1 scoop whey + 30g nuts + 1 apple",28,32,16,380],
    ["1:00 PM","Lunch","200g chicken + 120g dry rice + 200g roasted veg + olive oil",52,95,16,740],
    ["4:00 PM","Snack","200g cottage cheese + 2 rice cakes + almond butter + banana",24,48,10,380],
    ["7:00 PM","Dinner","200g salmon + 300g sweet potato + salad + olive oil",46,62,22,620],
    ["9:30 PM","Before bed","250g cottage cheese or casein + honey",30,14,4,210]] },
  long: { lbl: "Long session day", k: 3500, p: 163, c: 440, f: 85, m: [
    ["5:00 AM","Pre-session carb load","120g oats + honey + banana + 2 eggs",28,110,16,700],
    ["During","In-session fuel","Gel/banana every 45min + electrolytes · 60–90g carbs/hr",5,150,5,670],
    ["Post","Recovery (30min)","1 scoop whey + 500ml chocolate milk",40,60,8,470],
    ["Lunch","Full recovery","250g chicken + 150g rice + veg + olive oil",55,105,22,840],
    ["Snack","Afternoon","200g Greek yogurt + granola + berries",18,45,8,320],
    ["Dinner","Pasta recovery","150g pasta + 200g beef/tuna + sauce + parmesan",52,115,20,860],
    ["9:30 PM","Before bed","Casein + oat milk + almond butter",28,18,8,255]] },
  swim: { lbl: "Swim only day", k: 2980, p: 168, c: 330, f: 88, m: [
    ["5:30 AM","Pre-swim (light)","1 banana + 2 dates + coffee",2,35,1,155],
    ["7:30 AM","Post-swim breakfast","4 eggs + 2 whites omelette + 100g smoked salmon + 2 sourdough + ½ avocado",58,48,28,680],
    ["11:00 AM","Mid-morning","Whey + 200g Greek yogurt + honey",42,30,6,345],
    ["1:00 PM","Lunch","2 cans tuna + 100g rice + cucumber + tomato + olive oil",52,80,14,660],
    ["4:00 PM","Snack","30g nuts + apple + 200ml kefir",12,32,16,320],
    ["7:00 PM","Dinner","250g chicken thighs + 80g quinoa + roasted veg",52,72,20,680],
    ["9:30 PM","Before bed","250g cottage cheese + honey",30,12,4,205]] },
  rest: { lbl: "Rest day", k: 2660, p: 170, c: 240, f: 90, m: [
    ["7:30 AM","Breakfast","3 eggs + 3 whites + 80g oats + berries + coffee",48,65,20,640],
    ["11:00 AM","Mid-morning","Whey + apple + 20g dark chocolate",28,28,12,335],
    ["1:00 PM","Lunch (low carb)","250g salmon/chicken + big salad + avocado + olive oil",55,18,28,550],
    ["4:00 PM","Snack","200g Greek yogurt + walnuts + honey",20,22,18,330],
    ["7:00 PM","Dinner","200g beef mince stir fry + veg + 60g rice",48,65,18,620],
    ["9:30 PM","Before bed","Casein or cottage cheese",28,8,4,180]] },
};

const COACH_QS = [
  ["This week","What should I focus on most urgently to stay on track for sub-10?"],
  ["Bike","What road/tri bike should I buy in Lebanon under $2000? Specific models."],
  ["Swim","4-week program to get my pace from 2:05 to 1:50/100m."],
  ["Lifting","My bench 1RM is 60kg, squat 70kg. What weights this week?"],
  ["Nutrition","Exact meal plan for today's lifting day."],
  ["Sub-10","How does my training change for a sub-10 goal vs just finishing?"],
];

const ICONMAP = { swim:"🏊", bike:"🚴", run:"🏃", strength:"🏋️", push:"🏋️", pull:"🏋️", legs:"🏋️", brick:"⚡", rest:"🛌", other:"🚶" };
const NAMEMAP = { swim:"Swim", bike:"Bike", run:"Run", strength:"Strength", push:"Push", pull:"Pull", legs:"Legs", brick:"Brick", rest:"Rest", other:"Activity" };

export default function Dashboard() {
  const [tab, setTab] = useState("today");
  const [dt, setDt] = useState("lift");
  const [rpe, setRpe] = useState(null);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({ sport:"run", dist:"", dur:"", hr:"", pace:"", sleep:"", rhr:"", notes:"" });
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(null);

  // Strava state
  const [acts, setActs] = useState(null);
  const [stravaErr, setStravaErr] = useState(null);
  const [loadingStrava, setLoadingStrava] = useState(false);

  useEffect(() => {
    setNow(new Date());
    try { setLogs(JSON.parse(localStorage.getItem("maroun_logs") || "[]")); } catch {}
  }, []);

  // Fetch Strava when the Load tab is first opened
  useEffect(() => {
    if (tab === "load" && acts === null && !loadingStrava && !stravaErr) {
      setLoadingStrava(true);
      fetch("/api/strava")
        .then(r => r.json())
        .then(d => {
          if (d.ok) setActs(d.activities);
          else setStravaErr(d.error || "Could not load Strava");
        })
        .catch(e => setStravaErr(e.message))
        .finally(() => setLoadingStrava(false));
    }
  }, [tab, acts, loadingStrava, stravaErr]);

  const dayIdx = now ? now.getDay() : 1;
  const s = SESSIONS[dayIdx];
  const greet = now ? (now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening") : "Good morning";
  const dM = now ? Math.max(0, Math.ceil((MARATHON - now) / 864e5)) : "—";
  const dI = now ? Math.max(0, Math.ceil((IRONMAN - now) / 864e5)) : "—";

  function saveLog() {
    const entry = { ...form, rpe, date: new Date().toISOString() };
    const next = [entry, ...logs];
    setLogs(next);
    try { localStorage.setItem("maroun_logs", JSON.stringify(next)); } catch {}
    setForm({ sport:"run", dist:"", dur:"", hr:"", pace:"", sleep:"", rhr:"", notes:"" });
    setRpe(null);
  }
  function copyQ(q) {
    try { navigator.clipboard.writeText(q); } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  }

  // ---- Derive stats from real Strava data ----
  const stats = deriveStats(acts);
  const meal = MEALS[dt];

  return (
    <div>
      <div style={{ padding: "calc(env(safe-area-inset-top) + 18px) 18px 14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:13, color:"var(--txt2)" }}>{greet}</div>
            <div className="archivo" style={{ fontSize:24, fontWeight:800, letterSpacing:"-0.02em", marginTop:2 }}>Maroun</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(93,203,142,0.15)", color:"var(--green)", fontSize:12, fontWeight:600, padding:"6px 11px", borderRadius:99 }}>❤️ HRV 48 · Normal</div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"6px 18px 0" }}>
        <Cd num={dM} label="days to marathon" loc="Beirut · Nov 29, 2026" accent="var(--run)" />
        <Cd num={dI} label="days to Ironman" loc="Italy · Sep 19, 2027" accent="var(--swim)" />
      </div>

      <div style={{ padding: 18 }}>
        {tab === "today" && (
          <>
            <Lbl>Today's session</Lbl>
            <div style={card}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                <div style={{ ...sIcon, background: iconBg(s.cls) }}>{s.ic}</div>
                <div>
                  <div className="archivo" style={{ fontSize:17, fontWeight:700 }}>{s.t}</div>
                  <div style={{ fontSize:12, color:"var(--txt2)", marginTop:2 }}>{s.meta}</div>
                </div>
              </div>
              {s.gym && (<>
                <div style={miniLbl}>{s.gymLbl}</div>
                {s.gym.map((e,i) => (
                  <div key={i} style={exRow}>
                    <div><div style={{ fontSize:13, fontWeight:500 }}>{e[0]}</div><div style={{ fontSize:11, color:"var(--txt2)", marginTop:1 }}>{e[1]}</div></div>
                    <span style={{ ...exW, background: iconBg(s.cls), color: chipTxt(s.cls) }}>{e[2]}</span>
                  </div>
                ))}
                <div style={divider} />
              </>)}
              <div style={miniLbl}>{s.cardioLbl}</div>
              <div style={{ ...focus, whiteSpace:"pre-line" }}>{s.cardio}</div>
            </div>
            <Lbl>Coach's note</Lbl>
            <div style={note}>{s.note}</div>
            <div style={{ ...tip, marginTop:14 }}>💬 For live coaching, message your coach in the Claude chat. This app works offline and saves your logs on this phone.</div>
          </>
        )}

        {tab === "nutrition" && (
          <>
            <Lbl>Day type</Lbl>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
              {["lift","long","swim","rest"].map(t => (
                <button key={t} onClick={() => setDt(t)} style={chip(dt===t)}>
                  {t==="lift"?"Lifting":t==="long"?"Long session":t==="swim"?"Swim only":"Rest"}
                </button>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:16 }}>
              <Mt v={meal.k} l="kcal" /><Mt v={meal.p+"g"} l="protein" c="#8FC4F2" /><Mt v={meal.c+"g"} l="carbs" c="#B3E07F" /><Mt v={meal.f+"g"} l="fat" c="#F2C48F" />
            </div>
            <Lbl>{meal.lbl} meals</Lbl>
            {meal.m.map((m,i) => (
              <div key={i} style={mealCard}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <span style={{ fontSize:11, fontWeight:600, color:"var(--gold)" }}>{m[0]} · {m[1]}</span>
                  <span style={{ fontSize:11, color:"var(--txt3)" }}>{m[6]} kcal</span>
                </div>
                <div style={{ fontSize:12, color:"var(--txt2)", lineHeight:1.5 }}>{m[2]}</div>
                <div style={{ display:"flex", gap:6, marginTop:8 }}>
                  <span style={mm("#8FC4F2","rgba(61,155,233,0.18)")}>P {m[3]}g</span>
                  <span style={mm("#B3E07F","rgba(127,194,65,0.18)")}>C {m[4]}g</span>
                  <span style={mm("#F2C48F","rgba(242,160,61,0.18)")}>F {m[5]}g</span>
                </div>
              </div>
            ))}
            <Lbl>Daily non-negotiables</Lbl>
            <Alert c="g">✅ 5g creatine — every day, any drink, no exceptions</Alert>
            <Alert c="g">✅ Casein or 250g cottage cheese before bed — every night</Alert>
            <Alert c="i">💧 3.5–4L water · electrolytes in all sessions over 60 min</Alert>
          </>
        )}

        {tab === "load" && (
          <>
            <Lbl>Recovery status</Lbl>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:4 }}>
              <MCard label="Overnight HRV" val="48 ms" sub="Normal (44–56)" sc="var(--green)" />
              <MCard label="Resting HR" val="57 bpm" sub="Excellent base" sc="var(--green)" />
              <MCard label="Recovery" val="100%" sub="Full recovery" sc="var(--green)" />
              <MCard label="Status" val="Optimized" sub="EvoLab" sc="var(--green)" small />
            </div>

            {/* REAL STRAVA DATA */}
            <Lbl>This week — from Strava</Lbl>
            {loadingStrava && <div style={{ ...tip }}>Loading your Strava activities…</div>}
            {stravaErr && <Alert c="w">⚠️ Couldn't load Strava: {stravaErr}</Alert>}
            {acts && (
              <>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>
                  <Mt v={stats.week.swim.toFixed(1)} l="swim km" c="#8FC4F2" />
                  <Mt v={stats.week.bike.toFixed(0)} l="bike km" c="#B3E07F" />
                  <Mt v={stats.week.run.toFixed(1)} l="run km" c="#F2C48F" />
                </div>
                <Lbl>Ironman readiness — your longest single sessions</Lbl>
                <Pbar label={`Swim · ${stats.longest.swim.toFixed(2)} / 3.8 km`} pct={Math.min(100, Math.round(stats.longest.swim/3.8*100))} color="var(--swim)" />
                <Pbar label={`Bike · ${stats.longest.bike.toFixed(1)} / 180 km`} pct={Math.min(100, Math.round(stats.longest.bike/180*100))} color="var(--bike)" />
                <Pbar label={`Run · ${stats.longest.run.toFixed(1)} / 42.2 km`} pct={Math.min(100, Math.round(stats.longest.run/42.2*100))} color="var(--run)" />
                <Lbl>Recent activities</Lbl>
                {acts.slice(0,10).map((a,i) => (
                  <div key={a.id || i} style={logItem}>
                    <div style={{ display:"flex", alignItems:"center", gap:11 }}>
                      <div style={{ ...logBadge, background: iconBg(a.sport) }}>{ICONMAP[a.sport] || "🏃"}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600 }}>{a.name || NAMEMAP[a.sport]}</div>
                        <div style={{ fontSize:11, color:"var(--txt2)", marginTop:1 }}>
                          {new Date(a.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}{a.movingTimeMin?` · ${a.movingTimeMin} min`:""}{a.avgHr?` · ${Math.round(a.avgHr)} bpm`:""}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{a.distanceKm>0?`${a.distanceKm}km`:""}</div>
                      <div style={{ fontSize:11, color:"var(--txt2)" }}>{a.elevationM>0?`${a.elevationM}m`:""}</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            <Lbl>Key metrics</Lbl>
            <div style={{ ...card, padding:"6px 16px" }}>
              <MetricRow n="Threshold pace" d="COROS test" v="5:10/km" cls="run" />
              <MetricRow n="Swim pace" d="target 1:42/100m" v="2:05/100m" cls="swim" />
              <MetricRow n="Bench 1RM" d="target 80kg" v="60 kg" cls="push" />
              <MetricRow n="Squat 1RM" d="target 110kg" v="70 kg" cls="push" />
              <MetricRow n="Bike FTP" d="target 250W+" v="Pending" cls="bike" />
              <MetricRow n="Body fat" d="target 12%" v="20.3%" cls="run" last />
            </div>
            <Alert c="w">⚠️ Bike volume critically low — get your bike within 3 weeks. Sub-10 lives on cycling.</Alert>
            <Alert c="g">✅ HRV stable, recovery 100% — green light to train hard this week.</Alert>
          </>
        )}

        {tab === "log" && (
          <>
            <Lbl>Log a session</Lbl>
            <div style={card}>
              <Field label="Sport">
                <select value={form.sport} onChange={e=>setForm({...form,sport:e.target.value})} style={input}>
                  <option value="swim">Swim</option><option value="bike">Bike</option>
                  <option value="run">Run</option><option value="push">Push (gym)</option>
                  <option value="pull">Pull (gym)</option><option value="legs">Legs (gym)</option>
                  <option value="brick">Brick</option><option value="rest">Rest day</option>
                </select>
              </Field>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <Field label="Distance (km)"><input type="number" inputMode="decimal" value={form.dist} onChange={e=>setForm({...form,dist:e.target.value})} placeholder="0.0" style={input} /></Field>
                <Field label="Duration"><input value={form.dur} onChange={e=>setForm({...form,dur:e.target.value})} placeholder="1h 20m" style={input} /></Field>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <Field label="Avg HR"><input type="number" inputMode="numeric" value={form.hr} onChange={e=>setForm({...form,hr:e.target.value})} placeholder="148" style={input} /></Field>
                <Field label="Pace / speed"><input value={form.pace} onChange={e=>setForm({...form,pace:e.target.value})} placeholder="5:30/km" style={input} /></Field>
              </div>
              <Field label="Effort (RPE)">
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (<button key={n} onClick={()=>setRpe(n)} style={rpeBtn(rpe===n)}>{n}</button>))}
                </div>
              </Field>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <Field label="Sleep (hrs)"><input type="number" inputMode="decimal" value={form.sleep} onChange={e=>setForm({...form,sleep:e.target.value})} placeholder="7.5" style={input} /></Field>
                <Field label="Resting HR"><input type="number" inputMode="numeric" value={form.rhr} onChange={e=>setForm({...form,rhr:e.target.value})} placeholder="57" style={input} /></Field>
              </div>
              <Field label="Notes"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="How did it feel?" style={{...input, minHeight:64, resize:"vertical"}} /></Field>
              <button onClick={saveLog} style={btn}>Save session</button>
            </div>
            <Lbl>Manually logged sessions</Lbl>
            {logs.length === 0 ? (
              <div style={{ textAlign:"center", padding:"30px 16px", color:"var(--txt3)", fontSize:13 }}>No manual sessions yet. Your Strava activities show on the Load tab. Use this for gym sessions Strava doesn't capture in detail.</div>
            ) : logs.slice(0,12).map((w,i) => (
              <div key={i} style={logItem}>
                <div style={{ display:"flex", alignItems:"center", gap:11 }}>
                  <div style={{ ...logBadge, background: iconBg(w.sport) }}>{ICONMAP[w.sport]}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{NAMEMAP[w.sport]}</div>
                    <div style={{ fontSize:11, color:"var(--txt2)", marginTop:1 }}>
                      {new Date(w.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}{w.dur?` · ${w.dur}`:""}{w.rpe?` · RPE ${w.rpe}`:""}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{w.dist>0?`${w.dist}km`:""}</div>
                  <div style={{ fontSize:11, color:"var(--txt2)" }}>{w.hr?`${w.hr} bpm`:""}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "coach" && (
          <>
            <Lbl>Ask your coach</Lbl>
            <div style={{ ...tip, marginBottom:14 }}>💬 Tap a question to copy it, then paste into the Claude chat where your coach can answer with full analysis of your data.</div>
            {COACH_QS.map((q,i) => (
              <button key={i} onClick={()=>copyQ(q[1])} style={coachQ}>
                <b style={{ color:"var(--gold)", fontWeight:600 }}>{q[0]} → </b>{q[1]}
              </button>
            ))}
            {copied && <div style={{ ...tip, textAlign:"center", color:"var(--green)" }}>✅ Copied — paste it in the Claude chat</div>}
          </>
        )}
      </div>

      <div style={nav}>
        {[["today","🏠","Today"],["nutrition","🥗","Nutrition"],["load","📊","Load"],["log","➕","Log"],["coach","💬","Coach"]].map(([id,ic,lbl]) => (
          <button key={id} onClick={()=>{ setTab(id); window.scrollTo(0,0); }} style={navI(tab===id)}>
            <span style={{ fontSize:20 }}>{ic}</span><span>{lbl}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- derive weekly + longest stats from Strava activities ----
function deriveStats(acts) {
  const base = { week: { swim:0, bike:0, run:0 }, longest: { swim:0, bike:0, run:0 } };
  if (!acts) return base;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7*864e5);
  for (const a of acts) {
    const d = new Date(a.date);
    if (["swim","bike","run"].includes(a.sport)) {
      if (a.distanceKm > base.longest[a.sport]) base.longest[a.sport] = a.distanceKm;
      if (d >= weekAgo) base.week[a.sport] += a.distanceKm;
    }
  }
  return base;
}

// ---- sub-components ----
function Cd({ num, label, loc, accent }) {
  return (<div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:14, padding:14, position:"relative", overflow:"hidden" }}>
    <div style={{ position:"absolute", top:0, right:0, width:60, height:60, borderRadius:"50%", background:accent, opacity:0.12 }} />
    <div className="archivo" style={{ fontSize:32, fontWeight:800, lineHeight:1, letterSpacing:"-0.03em" }}>{num}</div>
    <div style={{ fontSize:11, color:"var(--txt2)", marginTop:5, fontWeight:500 }}>{label}</div>
    <div style={{ fontSize:10, color:"var(--txt3)", marginTop:1 }}>{loc}</div>
  </div>);
}
function Lbl({ children }) { return <div style={{ fontSize:11, fontWeight:600, color:"var(--txt3)", textTransform:"uppercase", letterSpacing:"0.08em", margin:"18px 0 10px" }}>{children}</div>; }
function Mt({ v, l, c }) { return <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:10, padding:"12px 6px", textAlign:"center" }}><div className="archivo" style={{ fontSize:18, fontWeight:700, color:c||"var(--txt)" }}>{v}</div><div style={{ fontSize:10, color:"var(--txt2)", marginTop:3 }}>{l}</div></div>; }
function MCard({ label, val, sub, sc, small }) { return <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:14, padding:14 }}><div style={{ fontSize:11, color:"var(--txt2)", marginBottom:5 }}>{label}</div><div className="archivo" style={{ fontSize: small?16:22, fontWeight:700, letterSpacing:"-0.02em" }}>{val}</div><div style={{ fontSize:11, marginTop:3, color:sc }}>{sub}</div></div>; }
function Pbar({ label, pct, color }) { return <div style={{ marginBottom:14 }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--txt2)", marginBottom:6 }}><span>{label}</span><b style={{ color:"var(--txt)", fontWeight:600 }}>{pct}%</b></div><div style={{ height:7, borderRadius:99, background:"var(--bg2)", overflow:"hidden" }}><div style={{ height:"100%", borderRadius:99, width:`${pct}%`, background:color }} /></div></div>; }
function MetricRow({ n, d, v, cls, last }) { return <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom: last?"none":"1px solid var(--line)" }}><div><div style={{ fontSize:13, fontWeight:500 }}>{n}</div><div style={{ fontSize:11, color:"var(--txt2)" }}>{d}</div></div><span style={{ fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:99, background:iconBg(cls), color:chipTxt(cls) }}>{v}</span></div>; }
function Field({ label, children }) { return <div style={{ marginBottom:13 }}><label style={{ fontSize:12, color:"var(--txt2)", marginBottom:6, display:"block", fontWeight:500 }}>{label}</label>{children}</div>; }
function Alert({ c, children }) { const bg = c==="w"?"rgba(242,160,61,0.12)":c==="g"?"rgba(93,203,142,0.12)":"rgba(61,155,233,0.12)"; const col = c==="w"?"#F2C48F":c==="g"?"#9CE0B8":"#9FCEF2"; return <div style={{ borderRadius:10, padding:"11px 13px", fontSize:13, lineHeight:1.5, marginBottom:8, background:bg, color:col }}>{children}</div>; }

const card = { background:"var(--card)", border:"1px solid var(--line)", borderRadius:14, padding:16, marginBottom:12 };
const sIcon = { width:42, height:42, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 };
const miniLbl = { fontSize:11, fontWeight:600, color:"var(--txt3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 };
const exRow = { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", background:"var(--bg2)", borderRadius:10, marginBottom:6 };
const exW = { fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:99, whiteSpace:"nowrap" };
const divider = { height:1, background:"var(--line)", margin:"14px 0" };
const focus = { background:"var(--bg2)", borderRadius:10, padding:12, fontSize:13, color:"var(--txt2)", lineHeight:1.6 };
const note = { background:"linear-gradient(135deg,rgba(242,193,78,0.12),rgba(242,193,78,0.04))", border:"1px solid rgba(242,193,78,0.2)", borderRadius:10, padding:"12px 14px", fontSize:13, color:"#F2D98E", lineHeight:1.6 };
const tip = { fontSize:12, color:"var(--txt3)", lineHeight:1.6, background:"var(--bg2)", borderRadius:10, padding:12 };
const mealCard = { background:"var(--card)", border:"1px solid var(--line)", borderRadius:14, padding:"13px 14px", marginBottom:10 };
const logItem = { display:"flex", justifyContent:"space-between", alignItems:"center", padding:12, background:"var(--card)", border:"1px solid var(--line)", borderRadius:10, marginBottom:8 };
const logBadge = { width:34, height:34, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 };
const input = { width:"100%", fontSize:15, padding:"11px 13px", border:"1px solid var(--line2)", borderRadius:10, background:"var(--bg2)", color:"var(--txt)", fontFamily:"inherit" };
const btn = { width:"100%", padding:14, fontSize:15, fontWeight:700, background:"var(--gold)", color:"#1a1206", border:"none", borderRadius:10, cursor:"pointer", marginTop:4 };
const coachQ = { display:"block", width:"100%", textAlign:"left", padding:"13px 14px", background:"var(--card)", border:"1px solid var(--line)", borderRadius:10, fontSize:13, color:"var(--txt)", marginBottom:8, cursor:"pointer", fontFamily:"inherit", lineHeight:1.5 };
const nav = { position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:"rgba(14,27,42,0.92)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderTop:"1px solid var(--line)", display:"flex", padding:"8px 6px calc(env(safe-area-inset-bottom) + 8px)", zIndex:100 };

function chip(on) { return { padding:"8px 14px", border:`1px solid ${on?"var(--gold)":"var(--line2)"}`, borderRadius:99, fontSize:12, fontWeight:600, background:on?"var(--gold)":"transparent", color:on?"#1a1206":"var(--txt2)", cursor:"pointer", fontFamily:"inherit" }; }
function rpeBtn(on) { return { flex:1, minWidth:30, height:38, border:`1px solid ${on?"var(--gold)":"var(--line2)"}`, borderRadius:10, fontSize:13, fontWeight:600, background:on?"var(--gold)":"var(--bg2)", color:on?"#1a1206":"var(--txt2)", cursor:"pointer", fontFamily:"inherit" }; }
function navI(on) { return { flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"6px 0", background:"none", border:"none", color:on?"var(--gold)":"var(--txt3)", cursor:"pointer", fontFamily:"inherit", fontSize:10, fontWeight:600 }; }
function mm(color, bg) { return { fontSize:10, fontWeight:600, padding:"3px 8px", borderRadius:99, color, background:bg }; }
function iconBg(cls) { return { push:"rgba(156,127,232,0.18)", pull:"rgba(156,127,232,0.18)", swim:"rgba(61,155,233,0.18)", bike:"rgba(127,194,65,0.18)", run:"rgba(242,160,61,0.18)", legs:"rgba(79,176,232,0.18)", strength:"rgba(156,127,232,0.18)", rest:"var(--card2)", brick:"rgba(242,160,61,0.18)", other:"var(--card2)" }[cls] || "var(--card2)"; }
function chipTxt(cls) { return { push:"#C4B0F2", pull:"#C4B0F2", swim:"#8FC4F2", bike:"#B3E07F", run:"#F2C48F", legs:"#8FC4F2", strength:"#C4B0F2", rest:"var(--txt2)", brick:"#F2C48F", other:"var(--txt2)" }[cls] || "var(--txt2)"; }
