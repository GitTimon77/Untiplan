import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { fromUntisDate, toUntisDate } from "@/lib/date";
import { errorResponse, SESSION_COOKIE } from "@/lib/http";
import { getSession } from "@/lib/store";
import { fetchMessagesOfDay } from "@/lib/webuntis";

function requestedDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  const untisDate = toUntisDate(date);
  return toUntisDate(fromUntisDate(untisDate)) === untisDate ? untisDate : null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Sitzung abgelaufen." }, { status: 401 });
    const date = requestedDate(request.nextUrl.searchParams.get("date"));
    if (!date) return NextResponse.json({ error: "Ungültiges Datum." }, { status: 400 });
    return NextResponse.json(await fetchMessagesOfDay(session.credentials, date), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error, "Nachrichten zum Tag konnten nicht geladen werden.", 502);
  }
}
