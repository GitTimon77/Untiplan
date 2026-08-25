import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { parseWeek, toUntisDate } from "@/lib/date";
import { errorResponse, SESSION_COOKIE } from "@/lib/http";
import { getSession } from "@/lib/store";
import { fetchTimetableElements } from "@/lib/webuntis";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Sitzung abgelaufen." }, { status: 401 });
    const targetDate = toUntisDate(parseWeek(request.nextUrl.searchParams.get("date")));
    return NextResponse.json(await fetchTimetableElements(session.credentials, session, targetDate));
  } catch (error) {
    return errorResponse(error, "Verfügbare Stundenpläne konnten nicht geladen werden.", 502);
  }
}
