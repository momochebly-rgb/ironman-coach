// app/api/wellness/route.js
// Serves normalized wellness data from intervals.icu (COROS source).

import { getWellness } from "../../../lib/intervals";

export async function GET() {
  try {
    const wellness = await getWellness(30);
    return Response.json({ ok: true, wellness });
  } catch (err) {
    return Response.json({ ok: false, error: err.message || "Failed to fetch wellness" }, { status: 500 });
  }
}
