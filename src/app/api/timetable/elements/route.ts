import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { errorResponse, SESSION_COOKIE } from "@/lib/http";
import { getSession } from "@/lib/store";
import { fetchTimetableElements } from "@/lib/webuntis";

export async function GET() {
  try {
    const session = await getSession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Sitzung abgelaufen." }, { status: 401 });
    return NextResponse.json(await fetchTimetableElements(session.credentials, session));
  } catch (error) {
    return errorResponse(error, "Verfügbare Stundenpläne konnten nicht geladen werden.", 502);
  }
}
