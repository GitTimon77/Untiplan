import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { fromUntisDate, toUntisDate } from "@/lib/date";
import { errorResponse, SESSION_COOKIE } from "@/lib/http";
import { getSession } from "@/lib/store";
import { fetchHomeworks, UntisHomeworksForbiddenError } from "@/lib/webuntis";

function requestedDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  const untisDate = toUntisDate(date);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    && toUntisDate(fromUntisDate(untisDate)) === untisDate ? untisDate : null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Sitzung abgelaufen." }, { status: 401 });
    const startDate = requestedDate(request.nextUrl.searchParams.get("start"));
    const endDate = requestedDate(request.nextUrl.searchParams.get("end"));
    if (!startDate || !endDate || startDate > endDate) {
      return NextResponse.json({ error: "Ungültiger Zeitraum." }, { status: 400 });
    }
    const start = fromUntisDate(startDate);
    const end = fromUntisDate(endDate);
    if ((end.getTime() - start.getTime()) / 86400000 > 366) {
      return NextResponse.json({ error: "Der Zeitraum darf höchstens ein Jahr umfassen." }, { status: 400 });
    }
    return NextResponse.json(await fetchHomeworks(session.credentials, startDate, endDate), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof UntisHomeworksForbiddenError) {
      return NextResponse.json({ error: error.message, code: "HOMEWORKS_FORBIDDEN" }, { status: 403 });
    }
    return errorResponse(error, "Hausaufgaben konnten nicht geladen werden.", 502);
  }
}
