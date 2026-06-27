// lib/weekly.js
// Aggregates the last 7 days (and prior 7 for comparison) of activities + wellness
// into a weekly summary. Pure functions.

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }

// Monday-start: returns the Monday 00:00 of the week containing `d`.
function mondayOf(d) {
  const x = startOfDay(d);
  const day = x.getDay();              // 0=Sun,1=Mon,...6=Sat
  const diff = (day === 0 ? -6 : 1 - day); // shift back to Monday
  x.setDate(x.getDate() + diff);
  return x;
}

export function buildWeekly(activities, wellness) {
  const now = new Date();
  const thisMon = mondayOf(now);                              // start of this week (Mon)
  const lastMon = new Date(thisMon.getTime() - 7 * 864e5);    // start of last week
  const nextMon = new Date(thisMon.getTime() + 7 * 864e5);    // start of next week

  const acts = Array.isArray(activities) ? activities : [];

  function windowStats(from, to) {
    const inWin = acts.filter((a) => {
      const d = new Date(a.date);
      return d >= from && d < to;
    });
    const s = { count: inWin.length, swimKm: 0, bikeKm: 0, runKm: 0, timeMin: 0, load: 0, elevation: 0 };
    for (const a of inWin) {
      if (a.sport === "swim") s.swimKm += a.distanceKm || 0;
      else if (a.sport === "bike") s.bikeKm += a.distanceKm || 0;
      else if (a.sport === "run") s.runKm += a.distanceKm || 0;
      s.timeMin += a.movingTimeMin || 0;
      s.load += a.trainingLoad || 0;
      s.elevation += a.elevationM || 0;
    }
    return s;
  }

  const thisWeek = windowStats(thisMon, nextMon);
  const lastWeek = windowStats(lastMon, thisMon);

  // wellness averages this week (since Monday)
  const wRecs = (wellness || []).filter((r) => {
    const d = new Date(r.date);
    return d >= thisMon;
  });
  function avg(arr, key) {
    const vals = arr.map((r) => r[key]).filter((v) => v != null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  const wellnessAvg = {
    hrv: avg(wRecs, "hrv"),
    sleepHrs: avg(wRecs, "sleepHrs"),
    restingHr: avg(wRecs, "restingHr") ?? avg(wRecs, "sleepingHr"),
    fitness: wRecs.length ? wRecs[0].fitness : null, // latest CTL
  };

  function delta(now_, prev) {
    if (!prev) return null;
    return ((now_ - prev) / prev) * 100;
  }

  return {
    thisWeek, lastWeek, wellnessAvg,
    deltas: {
      timeMin: delta(thisWeek.timeMin, lastWeek.timeMin),
      load: delta(thisWeek.load, lastWeek.load),
      totalKm: delta(
        thisWeek.swimKm + thisWeek.bikeKm + thisWeek.runKm,
        lastWeek.swimKm + lastWeek.bikeKm + lastWeek.runKm
      ),
    },
  };
}
