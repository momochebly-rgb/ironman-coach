// app/api/activity/[id]/route.js
import { getActivity, getActivityStreams } from "../../../../lib/intervals";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const [detail, streams] = await Promise.all([
      getActivity(id).catch(() => null),
      getActivityStreams(id).catch(() => ({})),
    ]);
    return Response.json({ ok: true, detail, streams });
  } catch (err) {
    return Response.json({ ok: false, error: err.message || "Failed to fetch activity" }, { status: 500 });
  }
}
