"use client";
import { useState, useEffect, useRef } from "react";
import { loadSchedule, saveSchedule, applyChanges, ymd } from "../lib/schedule";
import { WORKOUTS, workoutKeyFor } from "../lib/workouts";

const MARATHON = new Date("2026-11-29");
const IRONMAN = new Date("2027-09-19");

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

// Map a day's sport to the right nutrition plan
function nutritionTypeFor(entry) {
  if (!entry || entry.sport === "rest") return "rest";
  if (entry.sport === "race") return "long"; // race day fuels like a long session
  const t = (entry.title || "").toLowerCase();
  if (entry.sport === "bike" || entry.sport === "run" || entry.sport === "brick") {
    // long sessions get the long-day plan; short easy ones still need carbs but lighter
    if (t.includes("long") || t.includes("tempo") || t.includes("race")) return "long";
    return "long";
  }
  if (entry.sport === "swim") {
    // swim + gym (pull) days fuel like lifting; pure swim uses swim plan
    if (t.includes("pull") || t.includes("gym")) return "lift";
    return "swim";
  }
  if (["push","pull","legs"].includes(entry.sport)) return "lift";
  return "lift";
}

const QUICK_QS = [
  "What should I focus on most this week for sub-10?",
  "Analyse my last week of training from Strava.",
  "What's my longest run, ride and swim recently?",
  "Add a 10km race on the 4th of October and adjust the days around it.",
];

const SPORTS = ["swim","bike","run","push","pull","legs","brick","race","rest","other"];
const ICONMAP = { swim:"🏊", bike:"🚴", run:"🏃", strength:"🏋️", push:"🏋️", pull:"🏋️", legs:"🏋️", brick:"⚡", rest:"🛌", race:"🏁", other:"🚶" };
const NAMEMAP = { swim:"Swim", bike:"Bike", run:"Run", strength:"Strength", push:"Push", pull:"Pull", legs:"Legs", brick:"Brick", rest:"Rest", race:"Race", other:"Activity" };
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function Dashboard() {
  const [tab, setTab] = useState("today");
  const [dt, setDt] = useState("lift");
  const [now, setNow] = useState(null);

  // Activities (intervals.icu)
  const [acts, setActs] = useState(null);
  const [stravaErr, setStravaErr] = useState(null);
  const [loadingStrava, setLoadingStrava] = useState(false);
  const [openAct, setOpenAct] = useState(null);     // activity summary being viewed
  const [actDetail, setActDetail] = useState(null);  // {detail, streams}
  const [actLoading, setActLoading] = useState(false);

  // Wellness (intervals.icu)
  const [well, setWell] = useState(null);
  const [wellErr, setWellErr] = useState(null);

  // Schedule
  const [sched, setSched] = useState({});
  const [calMonth, setCalMonth] = useState(null); // {y, m} currently shown month
  const [editDay, setEditDay] = useState(null); // YYYY-MM-DD being viewed/edited
  const [dayMode, setDayMode] = useState("view"); // "view" | "edit"
  const [editForm, setEditForm] = useState({ sport:"run", title:"", detail:"" });
  const [undo, setUndo] = useState(null); // { prevSched, summary }

  // Coach chat
  const [coachMode, setCoachMode] = useState("head");
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const d = new Date();
    setNow(d);
    setCalMonth({ y: d.getFullYear(), m: d.getMonth() });
    setSched(loadSchedule());
    // fetch wellness once on mount for the header badge
    fetch("/api/wellness").then(r => r.json()).then(d => {
      if (d.ok) setWell(d.wellness); else setWellErr(d.error || "Could not load wellness");
    }).catch(e => setWellErr(e.message));
  }, []);

  useEffect(() => {
    if (tab === "load" && acts === null && !loadingStrava && !stravaErr) {
      setLoadingStrava(true);
      fetch("/api/activities").then(r => r.json()).then(d => {
        if (d.ok) setActs(d.activities); else setStravaErr(d.error || "Could not load activities");
      }).catch(e => setStravaErr(e.message)).finally(() => setLoadingStrava(false));
    }
  }, [tab, acts, loadingStrava, stravaErr]);

  // Load one activity's detail + streams when opened
  function openActivity(a) {
    setOpenAct(a); setActDetail(null); setActLoading(true);
    fetch(`/api/activity/${a.id}`).then(r => r.json()).then(d => {
      if (d.ok) setActDetail({ detail: d.detail, streams: d.streams || {} });
      else setActDetail({ error: d.error });
    }).catch(e => setActDetail({ error: e.message })).finally(() => setActLoading(false));
  }

  useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [chat, sending]);

  const todayKey = now ? ymd(now) : null;
  const today = todayKey ? sched[todayKey] : null;
  const greet = now ? (now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening") : "Good morning";
  const dM = now ? Math.max(0, Math.ceil((MARATHON - now) / 864e5)) : "—";
  const dI = now ? Math.max(0, Math.ceil((IRONMAN - now) / 864e5)) : "—";

  function shiftMonth(delta) {
    if (!calMonth) return;
    let m = calMonth.m + delta, y = calMonth.y;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCalMonth({ y, m });
  }

  function openEdit(key) {
    const d = sched[key] || { sport:"rest", title:"", detail:"" };
    setEditForm({ sport: d.sport || "run", title: d.title || "", detail: d.detail || "" });
    setDayMode("view");
    setEditDay(key);
  }
  function saveEdit() {
    const next = { ...sched, [editDay]: { ...editForm, edited: true } };
    setSched(next); saveSchedule(next); setEditDay(null);
  }
  function clearDay() {
    const next = { ...sched }; delete next[editDay];
    setSched(next); saveSchedule(next); setEditDay(null);
  }

  async function sendToCoach(text) {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput("");
    const newChat = [...chat, { role: "user", content: msg }];
    setChat(newChat); setSending(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, mode: coachMode, history: chat }),
      });
      const data = await res.json();
      if (data.ok) {
        let suffix = "";
        if (data.changes && Array.isArray(data.changes) && data.changes.length) {
          const { next, applied } = applyChanges(sched, data.changes);
          if (applied.length) {
            setUndo({ prevSched: sched });
            setSched(next); saveSchedule(next);
            const days = applied.map(a => fmtKeyShort(a.date)).join(", ");
            suffix = `\n\n📅 Updated your calendar: ${days}. (Undo available on the Calendar tab.)`;
          }
        }
        setChat([...newChat, { role: "assistant", content: data.reply + suffix }]);
      } else {
        setChat([...newChat, { role: "assistant", content: "⚠️ " + (data.error || "Something went wrong.") }]);
      }
    } catch (e) {
      setChat([...newChat, { role: "assistant", content: "⚠️ Couldn't reach the coach." }]);
    } finally { setSending(false); }
  }

  function doUndo() {
    if (undo) { setSched(undo.prevSched); saveSchedule(undo.prevSched); setUndo(null); }
  }

  const meal = MEALS[dt];

  return (
    <div>
      <div style={{ padding: "calc(env(safe-area-inset-top) + 18px) 18px 14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:13, color:"var(--txt2)" }}>{greet}</div>
            <div className="archivo" style={{ fontSize:24, fontWeight:800, letterSpacing:"-0.02em", marginTop:2 }}>Maroun</div>
          </div>
          {(() => {
            const latest = well && well.find(r => r.hrv != null);
            const hrv = latest && latest.hrv != null ? latest.hrv : null;
            const label = hrv == null ? "HRV —" : `HRV ${hrv} · ${hrv < 46 ? "Low" : hrv > 56 ? "Elevated" : "Normal"}`;
            const good = hrv == null || hrv >= 46;
            return (
              <div style={{ display:"flex", alignItems:"center", gap:5, background: good ? "rgba(93,203,142,0.15)" : "rgba(232,104,95,0.15)", color: good ? "var(--green)" : "var(--red)", fontSize:12, fontWeight:600, padding:"6px 11px", borderRadius:99 }}>❤️ {label}</div>
            );
          })()}
        </div>
      </div>

      <div style={{ padding: 18 }}>
        {tab === "today" && (
          <>
            {/* RACE COUNTDOWN CARDS with banners */}
            <RaceCard
              img="/beirut.png"
              fallbackBg="linear-gradient(135deg,#C8102E,#7A0A1C)"
              name="Beirut Marathon"
              loc="Beirut, Lebanon"
              dateLabel="Nov 29, 2026"
              days={dM}
              accent="var(--run)"
            />
            <RaceCard
              img="/ironman.png"
              fallbackBg="linear-gradient(135deg,#1A1A1A,#000)"
              name="IRONMAN Italy"
              loc="Emilia-Romagna · Cervia"
              dateLabel="Sep 2027"
              days={dI}
              accent="var(--swim)"
            />

            <Lbl>Today's session</Lbl>
            {today ? (
              <div style={card}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div style={{ ...sIcon, background: iconBg(today.sport) }}>{ICONMAP[today.sport] || "🏃"}</div>
                  <div>
                    <div className="archivo" style={{ fontSize:17, fontWeight:700 }}>{today.title}</div>
                    <div style={{ fontSize:12, color:"var(--txt2)", marginTop:2 }}>{now && `${DOW[now.getDay()]} · ${now.getDate()} ${MON[now.getMonth()]}`}</div>
                  </div>
                </div>
                <div style={{ ...focus, whiteSpace:"pre-line" }}>{today.detail}</div>
                <button style={{ ...ghostBtn, marginTop:12 }} onClick={()=>{ setTab("calendar"); openEdit(todayKey); }}>View full workout & nutrition</button>
              </div>
            ) : <div style={{ ...tip }}>Rest day — nothing scheduled. Enjoy it.</div>}

            {/* RECOVERY SNAPSHOT */}
            <Lbl>Recovery snapshot</Lbl>
            {(() => {
              const latest = well && well.find(r => r.hrv != null);
              const hrv = latest ? latest.hrv : null;
              const shr = latest ? (latest.sleepingHr ?? latest.restingHr) : null;
              const slp = latest ? latest.sleepHrs : null;
              const hrvState = hrv == null ? "—" : hrv < 46 ? "Low" : hrv > 56 ? "Elevated" : "In range";
              const hrvColor = hrv == null ? "var(--txt3)" : hrv < 46 ? "var(--red)" : "var(--green)";
              return (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:4 }}>
                  <Mt v={hrv != null ? hrv : "—"} l="HRV ms" c={hrvColor} />
                  <Mt v={shr != null ? shr : "—"} l="sleep HR" c="#F2A0A0" />
                  <Mt v={slp != null ? slp : "—"} l="sleep h" c="#9CB8F2" />
                </div>
              );
            })()}
            <div style={{ ...tip, marginTop:8 }}>
              {(() => {
                const latest = well && well.find(r => r.hrv != null);
                if (!latest || latest.hrv == null) return "Connect your wellness data to see today's readiness.";
                const hrv = latest.hrv;
                if (hrv < 46) return "⚠️ HRV below your range — favour easy/recovery today.";
                if (hrv > 56) return "✅ HRV elevated — you're well recovered.";
                return "✅ HRV in your normal range — good to train as planned.";
              })()}
            </div>

            <button style={{ ...primaryBtn, marginTop:14 }} onClick={() => { setTab("coach"); window.scrollTo(0,0); }}>💬 Ask your coach about today</button>
          </>
        )}

        {tab === "calendar" && calMonth && (
          <>
            {undo && (
              <div style={{ ...Alert2("i"), display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
                <span>📅 Coach updated your calendar.</span>
                <button onClick={doUndo} style={undoBtn}>Undo</button>
              </div>
            )}

            {/* Month navigation */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", margin:"6px 0 14px" }}>
              <button onClick={()=>shiftMonth(-1)} style={navArrow}>‹</button>
              <div className="archivo" style={{ fontSize:18, fontWeight:800 }}>{MONTHS_FULL[calMonth.m]} {calMonth.y}</div>
              <button onClick={()=>shiftMonth(1)} style={navArrow}>›</button>
            </div>

            {/* Weekday headers */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5, marginBottom:6 }}>
              {["S","M","T","W","T","F","S"].map((d,i) => (
                <div key={i} style={{ textAlign:"center", fontSize:10, fontWeight:700, color:"var(--txt3)" }}>{d}</div>
              ))}
            </div>

            {/* Date grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5 }}>
              {buildMonthCells(calMonth, sched).map((cell, i) => {
                if (!cell) return <div key={i} />;
                const { key, day, entry, isToday } = cell;
                return (
                  <button key={i} onClick={()=>openEdit(key)} style={{
                    aspectRatio:"1", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start",
                    gap:2, padding:"5px 2px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
                    background: isToday ? "rgba(242,193,78,0.14)" : "var(--card)",
                    border: `1px solid ${isToday ? "var(--gold)" : "var(--line)"}`,
                  }}>
                    <span style={{ fontSize:12, fontWeight:700, color: isToday ? "var(--gold)" : "var(--txt)" }}>{day}</span>
                    {entry ? (
                      entry.sport === "race"
                        ? <span style={{ fontSize:13, lineHeight:1 }}>🏁</span>
                        : <span style={{ width:18, height:18, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, background: iconBg(entry.sport) }}>{ICONMAP[entry.sport] || "•"}</span>
                    ) : (
                      <span style={{ width:5, height:5, borderRadius:99, background:"var(--line2)", marginTop:5 }} />
                    )}
                    {entry && entry.edited && <span style={{ width:4, height:4, borderRadius:99, background:"var(--gold)" }} />}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:16, justifyContent:"center" }}>
              {[["swim","Swim"],["bike","Bike"],["run","Run"],["push","Gym"],["race","Race"]].map(([sp,lbl]) => (
                <div key={sp} style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:16, height:16, borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, background: sp==="race"?"transparent":iconBg(sp) }}>{sp==="race"?"🏁":ICONMAP[sp]}</span>
                  <span style={{ fontSize:11, color:"var(--txt2)" }}>{lbl}</span>
                </div>
              ))}
            </div>
            <div style={{ ...tip, marginTop:14 }}>Tap any day to see the full workout and nutrition, or edit it. Coaches can change it too — ask on the Coach tab.</div>
          </>
        )}

        {tab === "wellness" && (
          <>
            <Lbl>Recovery & wellness</Lbl>
            {well === null && !wellErr && <div style={{ ...tip }}>Loading your COROS wellness data…</div>}
            {wellErr && <div style={Alert2("w")}>⚠️ Couldn't load wellness: {wellErr}</div>}
            {well && (() => {
              const asc = [...well].reverse(); // oldest-first for charts
              const latestHrv = well.find(r => r.hrv != null);
              const hrvData = asc.map(r => ({ date: r.date, value: r.hrv }));
              const sleepHrData = asc.map(r => ({ date: r.date, value: r.sleepingHr != null ? r.sleepingHr : r.restingHr }));
              const sleepHrLatest = well.find(r => r.sleepingHr != null) || well.find(r => r.restingHr != null);
              const sleepData = asc.map(r => ({ date: r.date, value: r.sleepHrs }));
              const sleepLatest = well.find(r => r.sleepHrs != null);
              const fitData = asc.map(r => ({ date: r.date, value: r.fitness }));
              const fatData = asc.map(r => ({ date: r.date, value: r.fatigue }));
              const fitLatest = well.find(r => r.fitness != null);
              const fatLatest = well.find(r => r.fatigue != null);
              const stepsData = asc.map(r => ({ date: r.date, value: r.steps != null ? r.steps : null }));
              const hrvStatus = latestHrv ? (latestHrv.hrv < 46 ? "Below your normal range (46–56) — prioritise recovery." : latestHrv.hrv > 56 ? "Above normal — relaxed/well recovered." : "Within your normal range (46–56) — good to train.") : "";
              return (
                <>
                  <WellCard title="HRV (rMSSD)" latest={latestHrv ? latestHrv.hrv : null} unit="ms" sub={`Today's average: ${latestHrv ? latestHrv.hrv + "ms" : "—"}. ${hrvStatus}`}>
                    <LineChart data={hrvData} color="var(--swim)" band={[46,56]} />
                  </WellCard>

                  <WellCard title="Sleeping heart rate" latest={sleepHrLatest ? (sleepHrLatest.sleepingHr ?? sleepHrLatest.restingHr) : null} unit="bpm" sub="Lower while well-rested. A jump up can signal fatigue or illness.">
                    <LineChart data={sleepHrData} color="var(--red)" />
                  </WellCard>

                  <WellCard title="Sleep duration" latest={sleepLatest ? sleepLatest.sleepHrs : null} unit="h" sub="Target 7–9h. Sleep is your #1 recovery driver.">
                    <LineChart data={sleepData} color="var(--push)" band={[7,9]} />
                  </WellCard>

                  <Lbl>Training load — fitness & fatigue</Lbl>
                  <WellCard title="Fitness (CTL)" latest={fitLatest ? Math.round(fitLatest.fitness) : null} sub="Your long-term training load — this is your fitness trend. Rising = building.">
                    <LineChart data={fitData} color="var(--bike)" />
                  </WellCard>
                  <WellCard title="Fatigue (ATL)" latest={fatLatest ? Math.round(fatLatest.fatigue) : null} sub="Short-term load. When fatigue spikes well above fitness, back off.">
                    <LineChart data={fatData} color="var(--amber)" />
                  </WellCard>

                  <Lbl>Activity</Lbl>
                  <WellCard title="Daily steps" latest={well.find(r=>r.steps!=null)?.steps ?? null} sub="Non-training movement — easy aerobic base.">
                    <LineChart data={stepsData} color="var(--green)" />
                  </WellCard>

                  <div style={{ ...tip, marginTop:4 }}>📡 All synced from COROS via intervals.icu. Sleep stages, VO2max and SpO2 aren't exported by COROS, so they're not shown.</div>
                </>
              );
            })()}
          </>
        )}

        {tab === "load" && (
          <>
            <Lbl>Recovery status</Lbl>
            {(() => {
              const latest = well && well.find(r => r.hrv != null);
              const hrv = latest && latest.hrv != null ? `${latest.hrv} ms` : "—";
              const rhr = latest && latest.restingHr != null ? `${latest.restingHr} bpm` : "57 bpm";
              const sleep = latest && latest.sleepHrs != null ? `${latest.sleepHrs} h` : "—";
              const hrvRange = latest && latest.hrv != null
                ? (latest.hrv < 46 ? "Below normal — ease off" : latest.hrv > 56 ? "Elevated — relaxed" : "Normal (46–56)")
                : "Connect intervals.icu";
              const hrvColor = latest && latest.hrv != null
                ? (latest.hrv < 46 ? "var(--red)" : "var(--green)")
                : "var(--txt3)";
              return (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:4 }}>
                  <MCard label="Overnight HRV" val={hrv} sub={hrvRange} sc={hrvColor} />
                  <MCard label="Resting HR" val={rhr} sub="from COROS" sc="var(--green)" />
                  <MCard label="Sleep" val={sleep} sub={latest && latest.sleepHrs >= 7 ? "Good" : "Track it"} sc="var(--green)" />
                  <MCard label="Status" val={latest ? "Synced" : "—"} sub={wellErr ? "Check sync" : "intervals.icu"} sc={wellErr ? "var(--amber)" : "var(--green)"} small />
                </div>
              );
            })()}
            {wellErr && <div style={Alert2("w")}>⚠️ Wellness sync issue: {wellErr}</div>}
            <Lbl>This week — from COROS</Lbl>
            {loadingStrava && <div style={{ ...tip }}>Loading your activities…</div>}
            {stravaErr && <div style={Alert2("w")}>⚠️ Couldn't load activities: {stravaErr}</div>}
            {acts && (() => {
              const stats = deriveStats(acts);
              return (<>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>
                  <Mt v={stats.week.swim.toFixed(1)} l="swim km" c="#8FC4F2" />
                  <Mt v={stats.week.bike.toFixed(0)} l="bike km" c="#B3E07F" />
                  <Mt v={stats.week.run.toFixed(1)} l="run km" c="#F2C48F" />
                </div>
                <Lbl>Ironman readiness — longest single sessions</Lbl>
                <Pbar label={`Swim · ${stats.longest.swim.toFixed(2)} / 3.8 km`} pct={Math.min(100, Math.round(stats.longest.swim/3.8*100))} color="var(--swim)" />
                <Pbar label={`Bike · ${stats.longest.bike.toFixed(1)} / 180 km`} pct={Math.min(100, Math.round(stats.longest.bike/180*100))} color="var(--bike)" />
                <Pbar label={`Run · ${stats.longest.run.toFixed(1)} / 42.2 km`} pct={Math.min(100, Math.round(stats.longest.run/42.2*100))} color="var(--run)" />
                <Lbl>Recent activities — tap for details</Lbl>
                {acts.slice(0,15).map((a,i) => (
                  <button key={a.id || i} onClick={()=>openActivity(a)} style={{ ...logItem, width:"100%", cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:11, minWidth:0 }}>
                      <div style={{ ...logBadge, background: iconBg(a.sport) }}>{ICONMAP[a.sport] || "🏃"}</div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"var(--txt)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.name || NAMEMAP[a.sport]}</div>
                        <div style={{ fontSize:11, color:"var(--txt2)", marginTop:1 }}>
                          {new Date(a.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}{a.movingTimeMin?` · ${a.movingTimeMin} min`:""}{a.avgHr?` · ${Math.round(a.avgHr)} bpm`:""}{a.trainingLoad?` · load ${Math.round(a.trainingLoad)}`:""}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"var(--txt)" }}>{a.distanceKm>0?`${a.distanceKm}km`:""}</div>
                      <div style={{ fontSize:11, color:"var(--txt2)" }}>{a.elevationM>0?`${a.elevationM}m`:""}</div>
                    </div>
                  </button>
                ))}
              </>);
            })()}
          </>
        )}

        {tab === "coach" && (
          <>
            <Lbl>Your coach</Lbl>
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              <button onClick={()=>setCoachMode("head")} style={chip(coachMode==="head")}>🧠 Head Coach</button>
              <button onClick={()=>setCoachMode("team")} style={chip(coachMode==="team")}>👥 Team Meeting</button>
            </div>
            <div style={{ minHeight:200 }}>
              {chat.length === 0 && (
                <div style={{ ...tip, marginBottom:12 }}>
                  {coachMode === "head"
                    ? "Talk to Coach Vince. He reads your real Strava data, and can change your calendar when you ask."
                    : "Full team meeting — all coaches weigh in, Vince decides. Reads Strava, can update your calendar."}
                </div>
              )}
              {chat.map((m, i) => (
                <div key={i} style={{ marginBottom:12, display:"flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={m.role === "user" ? userBubble : coachBubble}>{m.content}</div>
                </div>
              ))}
              {sending && <div style={{ ...coachBubble, color:"var(--txt3)" }}>Coach is thinking…</div>}
              <div ref={chatEndRef} />
            </div>
            {chat.length === 0 && (
              <div style={{ marginTop:6 }}>
                {QUICK_QS.map((q,i) => (<button key={i} onClick={()=>sendToCoach(q)} style={coachQ}>{q}</button>))}
              </div>
            )}
            <div style={{ display:"flex", gap:8, marginTop:14, position:"sticky", bottom:8 }}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") sendToCoach(); }}
                placeholder={coachMode==="head" ? "Ask Coach Vince…" : "Bring it to the team…"}
                style={{ flex:1, fontSize:15, padding:"12px 14px", border:"1px solid var(--line2)", borderRadius:12, background:"var(--bg2)", color:"var(--txt)", fontFamily:"inherit" }} />
              <button onClick={()=>sendToCoach()} disabled={sending} style={{ ...primaryBtn, width:"auto", padding:"12px 18px", marginTop:0, opacity: sending?0.5:1 }}>Send</button>
            </div>
          </>
        )}
      </div>

      {/* DAY PANEL — view (workout + nutrition) or edit */}
      {editDay && (() => {
        const entry = sched[editDay] || null;
        const ntype = nutritionTypeFor(entry);
        const meal = MEALS[ntype];
        return (
          <div style={modalBg} onClick={()=>setEditDay(null)}>
            <div style={modalCard} onClick={e=>e.stopPropagation()}>
              {dayMode === "view" ? (
                <div style={{ maxHeight:"75vh", overflowY:"auto" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                    <div>
                      <div className="archivo" style={{ fontSize:18, fontWeight:800 }}>{fmtKeyLong(editDay)}</div>
                      <div style={{ fontSize:12, color:"var(--txt2)", marginTop:2 }}>{entry ? entry.title : "Rest day"}</div>
                    </div>
                    <div style={{ ...sIcon, background: entry ? iconBg(entry.sport) : "var(--card2)" }}>{entry ? (ICONMAP[entry.sport] || "🏃") : "🛌"}</div>
                  </div>

                  <Lbl>Workout</Lbl>
                  {(() => {
                    const wkey = workoutKeyFor(entry);
                    const wk = wkey ? WORKOUTS[wkey] : null;
                    if (wk) {
                      return wk.blocks.map((b, bi) => (
                        <div key={bi} style={{ marginBottom:12 }}>
                          <div style={blockHead}>
                            <span style={{ fontSize:11, fontWeight:700, color:"var(--gold)" }}>{b.time}</span>
                            <span style={{ fontSize:11, color:"var(--txt2)" }}>{b.label}</span>
                          </div>
                          {b.kind === "strength" ? (
                            <div style={{ ...card, padding:"4px 0", marginBottom:0 }}>
                              {b.ex.map((e, ei) => (
                                <div key={ei} style={{ padding:"9px 14px", borderBottom: ei < b.ex.length-1 ? "1px solid var(--line)" : "none" }}>
                                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                                    <span style={{ fontSize:13, fontWeight:600 }}>{e[0]}</span>
                                    <span style={{ fontSize:11, fontWeight:600, padding:"3px 9px", borderRadius:99, background:"rgba(156,127,232,0.18)", color:"#C4B0F2", whiteSpace:"nowrap" }}>{e[1]} × {e[2]}{e[3] && e[3] !== "—" ? ` · ${e[3]}` : ""}</span>
                                  </div>
                                  {e[4] && <div style={{ fontSize:11, color:"var(--txt3)", marginTop:3 }}>{e[4]}</div>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ ...focus }}>
                              {b.lines.map((ln, li) => (
                                <div key={li} style={{ display:"flex", gap:7, marginBottom: li < b.lines.length-1 ? 5 : 0 }}>
                                  <span style={{ color:"var(--gold)", flexShrink:0 }}>•</span>
                                  <span>{ln}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ));
                    }
                    // fallback: coach-added / custom day with only free text
                    return entry ? (
                      <div style={{ ...focus, whiteSpace:"pre-line", marginBottom:4 }}>{entry.detail || "No details — tap Edit to add them."}</div>
                    ) : (
                      <div style={{ ...tip }}>Rest day. Recovery is where adaptation happens — sleep, eat, stretch.</div>
                    );
                  })()}

                  <Lbl>Nutrition — {meal.lbl}</Lbl>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:12 }}>
                    <Mt v={meal.k} l="kcal" /><Mt v={meal.p+"g"} l="protein" c="#8FC4F2" /><Mt v={meal.c+"g"} l="carbs" c="#B3E07F" /><Mt v={meal.f+"g"} l="fat" c="#F2C48F" />
                  </div>
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

                  <div style={{ display:"flex", gap:8, marginTop:10 }}>
                    <button onClick={()=>setDayMode("edit")} style={{ ...primaryBtn, marginTop:0 }}>Edit this day</button>
                    <button onClick={()=>setEditDay(null)} style={{ ...ghostBtn, marginTop:0, width:"auto", padding:"0 18px" }}>Close</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="archivo" style={{ fontSize:17, fontWeight:700, marginBottom:4 }}>Edit {fmtKeyLong(editDay)}</div>
                  <Field label="Type">
                    <select value={editForm.sport} onChange={e=>setEditForm({...editForm,sport:e.target.value})} style={input2}>
                      {SPORTS.map(s => <option key={s} value={s}>{NAMEMAP[s]}</option>)}
                    </select>
                  </Field>
                  <Field label="Title"><input value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})} placeholder="e.g. Long Run" style={input2} /></Field>
                  <Field label="Details"><textarea value={editForm.detail} onChange={e=>setEditForm({...editForm,detail:e.target.value})} placeholder="Session details…" style={{...input2, minHeight:80, resize:"vertical"}} /></Field>
                  <div style={{ display:"flex", gap:8, marginTop:6 }}>
                    <button onClick={saveEdit} style={{ ...primaryBtn, marginTop:0 }}>Save</button>
                    <button onClick={clearDay} style={{ ...ghostBtn, marginTop:0, width:"auto", padding:"0 16px", color:"var(--red)" }}>Make rest</button>
                  </div>
                  <button onClick={()=>setDayMode("view")} style={{ ...ghostBtn, marginTop:8 }}>Back</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ACTIVITY DETAIL MODAL */}
      {openAct && (
        <div style={modalBg} onClick={()=>{ setOpenAct(null); setActDetail(null); }}>
          <div style={{ ...modalCard, maxHeight:"90vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div style={{ minWidth:0 }}>
                <div className="archivo" style={{ fontSize:18, fontWeight:800, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{openAct.name || NAMEMAP[openAct.sport]}</div>
                <div style={{ fontSize:12, color:"var(--txt2)", marginTop:2 }}>{new Date(openAct.date).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</div>
              </div>
              <div style={{ ...sIcon, background: iconBg(openAct.sport) }}>{ICONMAP[openAct.sport] || "🏃"}</div>
            </div>

            {/* top-line stats */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>
              <Mt v={openAct.distanceKm>0?`${openAct.distanceKm}`:"—"} l="km" />
              <Mt v={openAct.movingTimeMin||"—"} l="min" />
              <Mt v={openAct.elevationM||0} l="m elev" />
              <Mt v={openAct.avgHr?Math.round(openAct.avgHr):"—"} l="avg bpm" c="#F2A0A0" />
              <Mt v={openAct.avgWatts?Math.round(openAct.avgWatts):"—"} l="avg W" c="#B3E07F" />
              <Mt v={openAct.trainingLoad?Math.round(openAct.trainingLoad):"—"} l="load" c="#F2C48F" />
            </div>

            {actLoading && <div style={{ ...tip }}>Loading map & graphs…</div>}
            {actDetail && actDetail.error && <div style={Alert2("w")}>⚠️ {actDetail.error}</div>}
            {actDetail && !actDetail.error && (() => {
              const s = actDetail.streams || {};
              const latlng = s.latlng || s.location || null;
              const hr = s.heartrate || s.heart_rate || null;
              const alt = s.altitude || null;
              const vel = s.velocity_smooth || null;
              const watts = s.watts || null;
              const dist = s.distance || null;
              return (
                <>
                  {latlng && latlng.length > 1 && <><Lbl>Route</Lbl><MapView latlng={latlng} sport={openAct.sport} /></>}
                  {hr && <><Lbl>Heart rate</Lbl><StreamChart data={hr} xdist={dist} color="var(--red)" unit="bpm" /></>}
                  {openAct.sport==="bike" && watts && <><Lbl>Power</Lbl><StreamChart data={watts} xdist={dist} color="var(--bike)" unit="W" /></>}
                  {vel && <><Lbl>{openAct.sport==="run"?"Pace":"Speed"}</Lbl><StreamChart data={vel.map(v=>+(v*3.6).toFixed(1))} xdist={dist} color="var(--swim)" unit="km/h" /></>}
                  {alt && <><Lbl>Elevation</Lbl><StreamChart data={alt} xdist={dist} color="var(--push)" unit="m" fill /></>}
                  {!latlng && !hr && !alt && !vel && !watts && <div style={{ ...tip }}>No detailed streams available for this activity.</div>}
                </>
              );
            })()}
            <button onClick={()=>{ setOpenAct(null); setActDetail(null); }} style={{ ...ghostBtn, marginTop:14 }}>Close</button>
          </div>
        </div>
      )}

      <div style={nav}>
        {[["today","🏠","Today"],["calendar","📅","Calendar"],["wellness","❤️","Wellness"],["load","📊","Load"],["coach","💬","Coach"]].map(([id,ic,lbl]) => (
          <button key={id} onClick={()=>{ setTab(id); window.scrollTo(0,0); }} style={navI(tab===id)}>
            <span style={{ fontSize:20 }}>{ic}</span><span>{lbl}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// build month grid cells: leading nulls for offset, then each day of the month
function buildMonthCells(calMonth, sched) {
  if (!calMonth) return [];
  const { y, m } = calMonth;
  const first = new Date(y, m, 1);
  const startDow = first.getDay(); // 0=Sun
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayKey = ymd(new Date());
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const dd = String(day).padStart(2, "0");
    const mm = String(m + 1).padStart(2, "0");
    const key = `${y}-${mm}-${dd}`;
    cells.push({ key, day, entry: sched[key] || null, isToday: key === todayKey });
  }
  return cells;
}
function fmtKeyShort(key) { const d = new Date(key); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; }
function fmtKeyLong(key) { const d = new Date(key); return `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; }

function deriveStats(acts) {
  const base = { week: { swim:0, bike:0, run:0 }, longest: { swim:0, bike:0, run:0 } };
  if (!acts) return base;
  const now = new Date(); const weekAgo = new Date(now.getTime() - 7*864e5);
  for (const a of acts) {
    const d = new Date(a.date);
    if (["swim","bike","run"].includes(a.sport)) {
      if (a.distanceKm > base.longest[a.sport]) base.longest[a.sport] = a.distanceKm;
      if (d >= weekAgo) base.week[a.sport] += a.distanceKm;
    }
  }
  return base;
}

function Cd({ num, label, loc, accent }) {
  return (<div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:14, padding:14, position:"relative", overflow:"hidden" }}>
    <div style={{ position:"absolute", top:0, right:0, width:60, height:60, borderRadius:"50%", background:accent, opacity:0.12 }} />
    <div className="archivo" style={{ fontSize:32, fontWeight:800, lineHeight:1, letterSpacing:"-0.03em" }}>{num}</div>
    <div style={{ fontSize:11, color:"var(--txt2)", marginTop:5, fontWeight:500 }}>{label}</div>
    <div style={{ fontSize:10, color:"var(--txt3)", marginTop:1 }}>{loc}</div>
  </div>);
}

function RaceCard({ img, fallbackBg, name, loc, dateLabel, days, accent }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
      {/* banner */}
      <div style={{ height:96, background: fallbackBg, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
        {imgOk ? (
          <img src={img} alt={name} onError={()=>setImgOk(false)}
            style={{ maxHeight:"78%", maxWidth:"82%", objectFit:"contain" }} />
        ) : (
          <span className="archivo" style={{ color:"#fff", fontSize:20, fontWeight:800, opacity:0.92, letterSpacing:"0.02em" }}>{name}</span>
        )}
      </div>
      {/* info row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px" }}>
        <div style={{ minWidth:0 }}>
          <div className="archivo" style={{ fontSize:15, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{name}</div>
          <div style={{ fontSize:11, color:"var(--txt2)", marginTop:1 }}>{loc} · {dateLabel}</div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0, paddingLeft:10 }}>
          <div className="archivo" style={{ fontSize:26, fontWeight:800, lineHeight:1, color:accent }}>{days}</div>
          <div style={{ fontSize:10, color:"var(--txt3)" }}>days to go</div>
        </div>
      </div>
    </div>
  );
}
function Lbl({ children }) { return <div style={{ fontSize:11, fontWeight:600, color:"var(--txt3)", textTransform:"uppercase", letterSpacing:"0.08em", margin:"18px 0 10px" }}>{children}</div>; }

// Simple responsive SVG line chart. data = [{date, value}], newest-last.
function LineChart({ data, color, unit, band }) {
  const pts = data.filter(d => d.value != null);
  if (pts.length < 2) return <div style={{ ...tipStyle }}>Not enough data yet — keep syncing.</div>;
  const W = 320, H = 110, padL = 28, padR = 8, padT = 10, padB = 18;
  const vals = pts.map(p => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (band) { min = Math.min(min, band[0]); max = Math.max(max, band[1]); }
  const range = max - min || 1;
  const pad = range * 0.15;
  min -= pad; max += pad;
  const x = i => padL + (i / (pts.length - 1)) * (W - padL - padR);
  const y = v => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${path} L${x(pts.length-1).toFixed(1)},${(H-padB).toFixed(1)} L${x(0).toFixed(1)},${(H-padB).toFixed(1)} Z`;
  const last = pts[pts.length - 1];
  const gid = "g" + color.replace(/[^a-z0-9]/gi, "");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto", display:"block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {band && (
        <rect x={padL} y={y(band[1])} width={W-padL-padR} height={Math.max(0,y(band[0])-y(band[1]))} fill="rgba(93,203,142,0.10)" />
      )}
      <text x={padL-4} y={y(max)+3} textAnchor="end" fontSize="8" fill="var(--txt3)">{Math.round(max)}</text>
      <text x={padL-4} y={y(min)+3} textAnchor="end" fontSize="8" fill="var(--txt3)">{Math.round(min)}</text>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(pts.length-1)} cy={y(last.value)} r="3.5" fill={color} />
      <text x={x(0)} y={H-5} textAnchor="start" fontSize="8" fill="var(--txt3)">{pts[0].date.slice(5)}</text>
      <text x={x(pts.length-1)} y={H-5} textAnchor="end" fontSize="8" fill="var(--txt3)">{last.date.slice(5)}</text>
    </svg>
  );
}

function WellCard({ title, latest, unit, sub, children }) {
  return (
    <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:14, padding:14, marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:8 }}>
        <span style={{ fontSize:13, fontWeight:600, color:"var(--txt2)" }}>{title}</span>
        <span><b className="archivo" style={{ fontSize:20, fontWeight:800 }}>{latest != null ? latest : "—"}</b>{latest != null && unit ? <span style={{ fontSize:12, color:"var(--txt3)" }}> {unit}</span> : null}</span>
      </div>
      {children}
      {sub && <div style={{ fontSize:11, color:"var(--txt3)", marginTop:8 }}>{sub}</div>}
    </div>
  );
}
const tipStyle = { fontSize:12, color:"var(--txt3)", lineHeight:1.6, background:"var(--bg2)", borderRadius:10, padding:12 };

// Leaflet map loaded from CDN (no npm install needed).
function MapView({ latlng, sport }) {
  const ref = useRef(null);
  useEffect(() => {
    let map;
    let cancelled = false;
    function ensureLeaflet() {
      return new Promise((resolve) => {
        if (window.L) return resolve(window.L);
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(css);
        const sc = document.createElement("script");
        sc.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        sc.onload = () => resolve(window.L);
        document.head.appendChild(sc);
      });
    }
    ensureLeaflet().then((L) => {
      if (cancelled || !ref.current || !L) return;
      const pts = latlng.filter(p => Array.isArray(p) && p.length === 2);
      if (pts.length < 2) return;
      map = L.map(ref.current, { zoomControl: false, attributionControl: false });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
      const color = sport === "run" ? "#F2A03D" : sport === "bike" ? "#7FC241" : "#3D9BE9";
      const line = L.polyline(pts, { color, weight: 4, opacity: 0.9 }).addTo(map);
      map.fitBounds(line.getBounds(), { padding: [20, 20] });
      L.circleMarker(pts[0], { radius: 5, color: "#5DCB8E", fillOpacity: 1 }).addTo(map);
      L.circleMarker(pts[pts.length-1], { radius: 5, color: "#E8685F", fillOpacity: 1 }).addTo(map);
    });
    return () => { cancelled = true; if (map) map.remove(); };
  }, [latlng, sport]);
  return <div ref={ref} style={{ width:"100%", height:200, borderRadius:12, overflow:"hidden", border:"1px solid var(--line)", background:"var(--bg2)", marginBottom:12 }} />;
}

// SVG area/line chart for an activity stream. data = number[]; xdist optional for x-axis.
function StreamChart({ data, color, unit, fill }) {
  if (!data || data.length < 2) return null;
  // downsample to ~200 points for performance
  const step = Math.max(1, Math.floor(data.length / 200));
  const pts = [];
  for (let i = 0; i < data.length; i += step) {
    const v = data[i];
    if (typeof v === "number" && !isNaN(v)) pts.push(v);
  }
  if (pts.length < 2) return null;
  const W = 320, H = 90, padL = 26, padR = 6, padT = 8, padB = 14;
  const min = Math.min(...pts), max = Math.max(...pts);
  const x = i => padL + (i / (pts.length - 1)) * (W - padL - padR);
  const y = v => padT + (1 - (v - min) / ((max - min) || 1)) * (H - padT - padB);
  const path = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const gid = "s" + color.replace(/[^a-z0-9]/gi, "") + (unit||"");
  const avg = (pts.reduce((a,b)=>a+b,0)/pts.length);
  return (
    <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:12, padding:"10px 12px", marginBottom:12 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto", display:"block" }}>
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient></defs>
        <text x={padL-4} y={y(max)+3} textAnchor="end" fontSize="8" fill="var(--txt3)">{Math.round(max)}</text>
        <text x={padL-4} y={y(min)+3} textAnchor="end" fontSize="8" fill="var(--txt3)">{Math.round(min)}</text>
        {fill && <path d={`${path} L${x(pts.length-1)},${H-padB} L${x(0)},${H-padB} Z`} fill={`url(#${gid})`} />}
        <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      <div style={{ fontSize:11, color:"var(--txt3)", marginTop:2 }}>avg {unit==="km/h"?avg.toFixed(1):Math.round(avg)} {unit} · max {unit==="km/h"?max.toFixed(1):Math.round(max)} {unit}</div>
    </div>
  );
}
function Mt({ v, l, c }) { return <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:10, padding:"12px 6px", textAlign:"center" }}><div className="archivo" style={{ fontSize:18, fontWeight:700, color:c||"var(--txt)" }}>{v}</div><div style={{ fontSize:10, color:"var(--txt2)", marginTop:3 }}>{l}</div></div>; }
function MCard({ label, val, sub, sc, small }) { return <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:14, padding:14 }}><div style={{ fontSize:11, color:"var(--txt2)", marginBottom:5 }}>{label}</div><div className="archivo" style={{ fontSize: small?16:22, fontWeight:700 }}>{val}</div><div style={{ fontSize:11, marginTop:3, color:sc }}>{sub}</div></div>; }
function Pbar({ label, pct, color }) { return <div style={{ marginBottom:14 }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--txt2)", marginBottom:6 }}><span>{label}</span><b style={{ color:"var(--txt)", fontWeight:600 }}>{pct}%</b></div><div style={{ height:7, borderRadius:99, background:"var(--bg2)", overflow:"hidden" }}><div style={{ height:"100%", borderRadius:99, width:`${pct}%`, background:color }} /></div></div>; }
function Field({ label, children }) { return <div style={{ marginBottom:13 }}><label style={{ fontSize:12, color:"var(--txt2)", marginBottom:6, display:"block", fontWeight:500 }}>{label}</label>{children}</div>; }
function Alert2(c) { const bg = c==="w"?"rgba(242,160,61,0.12)":c==="g"?"rgba(93,203,142,0.12)":"rgba(61,155,233,0.12)"; const col = c==="w"?"#F2C48F":c==="g"?"#9CE0B8":"#9FCEF2"; return { borderRadius:10, padding:"11px 13px", fontSize:13, lineHeight:1.5, marginBottom:8, background:bg, color:col }; }

const card = { background:"var(--card)", border:"1px solid var(--line)", borderRadius:14, padding:16, marginBottom:12 };
const sIcon = { width:42, height:42, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 };
const sIconSm = { width:34, height:34, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 };
const focus = { background:"var(--bg2)", borderRadius:10, padding:12, fontSize:13, color:"var(--txt2)", lineHeight:1.6 };
const tip = { fontSize:12, color:"var(--txt3)", lineHeight:1.6, background:"var(--bg2)", borderRadius:10, padding:12 };
const mealCard = { background:"var(--card)", border:"1px solid var(--line)", borderRadius:14, padding:"13px 14px", marginBottom:10 };
const blockHead = { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, padding:"0 2px" };
const logItem = { display:"flex", justifyContent:"space-between", alignItems:"center", padding:12, background:"var(--card)", border:"1px solid var(--line)", borderRadius:10, marginBottom:8 };
const logBadge = { width:34, height:34, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 };
const dayRow = { display:"flex", alignItems:"center", gap:12, width:"100%", padding:"10px 12px", background:"var(--card)", border:"1px solid var(--line)", borderRadius:12, marginBottom:8, cursor:"pointer", fontFamily:"inherit", color:"var(--txt)" };
const editedTag = { fontSize:9, fontWeight:600, color:"var(--gold)", background:"rgba(242,193,78,0.15)", padding:"2px 7px", borderRadius:99, flexShrink:0 };
const input2 = { width:"100%", fontSize:15, padding:"11px 13px", border:"1px solid var(--line2)", borderRadius:10, background:"var(--bg2)", color:"var(--txt)", fontFamily:"inherit" };
const primaryBtn = { width:"100%", padding:14, fontSize:15, fontWeight:700, background:"var(--gold)", color:"#1a1206", border:"none", borderRadius:10, cursor:"pointer", marginTop:4 };
const ghostBtn = { width:"100%", padding:12, fontSize:14, fontWeight:600, background:"transparent", color:"var(--txt2)", border:"1px solid var(--line2)", borderRadius:10, cursor:"pointer", fontFamily:"inherit" };
const undoBtn = { fontSize:12, fontWeight:700, background:"var(--gold)", color:"#1a1206", border:"none", borderRadius:8, padding:"6px 14px", cursor:"pointer", flexShrink:0 };
const navArrow = { width:38, height:38, borderRadius:10, background:"var(--card)", border:"1px solid var(--line)", color:"var(--txt)", fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" };
const coachQ = { display:"block", width:"100%", textAlign:"left", padding:"12px 14px", background:"var(--card)", border:"1px solid var(--line)", borderRadius:10, fontSize:13, color:"var(--txt)", marginBottom:8, cursor:"pointer", fontFamily:"inherit", lineHeight:1.4 };
const userBubble = { maxWidth:"82%", background:"var(--gold)", color:"#1a1206", padding:"10px 14px", borderRadius:"14px 14px 4px 14px", fontSize:14, lineHeight:1.5, whiteSpace:"pre-wrap" };
const coachBubble = { maxWidth:"90%", background:"var(--card)", border:"1px solid var(--line)", color:"var(--txt)", padding:"12px 14px", borderRadius:"14px 14px 14px 4px", fontSize:14, lineHeight:1.6, whiteSpace:"pre-wrap" };
const modalBg = { position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:200, padding:0 };
const modalCard = { width:"100%", maxWidth:480, background:"var(--bg)", borderTop:"1px solid var(--line2)", borderRadius:"18px 18px 0 0", padding:"20px 18px calc(env(safe-area-inset-bottom) + 20px)" };
const nav = { position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:"rgba(14,27,42,0.92)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderTop:"1px solid var(--line)", display:"flex", padding:"8px 6px calc(env(safe-area-inset-bottom) + 8px)", zIndex:100 };

function chip(on) { return { padding:"8px 14px", border:`1px solid ${on?"var(--gold)":"var(--line2)"}`, borderRadius:99, fontSize:12, fontWeight:600, background:on?"var(--gold)":"transparent", color:on?"#1a1206":"var(--txt2)", cursor:"pointer", fontFamily:"inherit" }; }
function navI(on) { return { flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"6px 0", background:"none", border:"none", color:on?"var(--gold)":"var(--txt3)", cursor:"pointer", fontFamily:"inherit", fontSize:10, fontWeight:600 }; }
function mm(color, bg) { return { fontSize:10, fontWeight:600, padding:"3px 8px", borderRadius:99, color, background:bg }; }
function iconBg(cls) { return { push:"rgba(156,127,232,0.18)", pull:"rgba(156,127,232,0.18)", swim:"rgba(61,155,233,0.18)", bike:"rgba(127,194,65,0.18)", run:"rgba(242,160,61,0.18)", legs:"rgba(79,176,232,0.18)", strength:"rgba(156,127,232,0.18)", rest:"var(--card2)", brick:"rgba(242,160,61,0.18)", race:"rgba(232,104,95,0.20)", other:"var(--card2)" }[cls] || "var(--card2)"; }
