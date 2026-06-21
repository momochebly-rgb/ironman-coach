// app/api/activities/route.js
import { getIntervalsActivities } from "../../../lib/intervals";

export async function GET() {
  try {
    const activities = await getIntervalsActivities(90);
    return Response.json({ ok: true, activities });
  } catch (err) {
    return Response.json({ ok: false, error: err.message || "Failed to fetch activities" }, { status: 500 });
  }
}
