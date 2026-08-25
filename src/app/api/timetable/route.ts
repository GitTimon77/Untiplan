import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { deriveCourses } from "@/lib/courses";
import { addDays, parseWeek, toUntisDate } from "@/lib/date";
import { errorResponse, SESSION_COOKIE } from "@/lib/http";
import { getSession } from "@/lib/store";
import { fetchTimetable } from "@/lib/webuntis";
import { defaultTimetableElement, isTimetableElementType } from "@/lib/timetable-elements";

type TimetableElementSelection = {
  id: number;
  type: number;
};

function selectedElementFromRequest(
  request: NextRequest,
): TimetableElementSelection | null | "invalid" {
  const typeParam = request.nextUrl.searchParams.get("elementType");
  const idParam = request.nextUrl.searchParams.get("elementId");
  const requestedType = Number(typeParam);
  const requestedId = Number(idParam);

  if ((typeParam || idParam)
    && (!isTimetableElementType(requestedType) || !Number.isInteger(requestedId) || requestedId <= 0)) {
    return "invalid";
  }

  if (!typeParam || !idParam) {
    return null;
  }

  return { type: requestedType, id: requestedId };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Sitzung abgelaufen." }, { status: 401 });

    const requestedElement = selectedElementFromRequest(request);
    if (requestedElement === "invalid") {
      return NextResponse.json({ error: "Ungültiger Stundenplan ausgewählt." }, { status: 400 });
    }

    const element = requestedElement ?? defaultTimetableElement(session);
    if (!element) {
      return NextResponse.json({ error: "Bitte zuerst einen Stundenplan auswählen." }, { status: 400 });
    }

    const start = parseWeek(request.nextUrl.searchParams.get("week"));
    const end = addDays(start, 4);
    const startDate = toUntisDate(start);
    const endDate = toUntisDate(end);
    const result = await fetchTimetable(
      session.credentials,
      { personId: element.id, personType: element.type },
      startDate,
      endDate,
    );
    const courses = deriveCourses(result.lessons);

    return NextResponse.json({
      ...result,
      courses,
      range: { startDate, endDate },
    });
  } catch (error) {
    return errorResponse(error, "Stundenplan konnte nicht geladen werden.", 502);
  }
}
