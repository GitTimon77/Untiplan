import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { errorResponse, SESSION_COOKIE } from "@/lib/http";
import { getSession } from "@/lib/store";
import { fetchUntisMessageDetail, UntisMessagesForbiddenError } from "@/lib/webuntis";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Sitzung abgelaufen." }, { status: 401 });
    const id = Number((await context.params).id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Ungültige Mitteilung." }, { status: 400 });
    return NextResponse.json(await fetchUntisMessageDetail(session.credentials, id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof UntisMessagesForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return errorResponse(error, "Mitteilung konnte nicht geladen werden.", 502);
  }
}
