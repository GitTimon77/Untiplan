import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { errorResponse, SESSION_COOKIE } from "@/lib/http";
import { getSession } from "@/lib/store";
import { fetchUntisMessages, UntisMessagesForbiddenError } from "@/lib/webuntis";

export async function GET() {
  try {
    const session = await getSession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Sitzung abgelaufen." }, { status: 401 });
    return NextResponse.json(await fetchUntisMessages(session.credentials), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof UntisMessagesForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return errorResponse(error, "Mitteilungen konnten nicht geladen werden.", 502);
  }
}
