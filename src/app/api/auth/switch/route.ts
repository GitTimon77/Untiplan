import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ACCOUNT_GROUP_COOKIE, authCookieOptions, errorResponse, SESSION_COOKIE } from "@/lib/http";
import { switchAccount } from "@/lib/store";

const schema = z.object({ accountId: z.string().min(16).max(64) });

export async function POST(request: Request) {
  try {
    const { accountId } = schema.parse(await request.json());
    const jar = await cookies();
    const result = await switchAccount(jar.get(ACCOUNT_GROUP_COOKIE)?.value, accountId);
    if (!result) return NextResponse.json({ error: "Dieses Konto ist nicht mehr angemeldet." }, { status: 404 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, result.sessionToken, authCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse(error, "Ungültiges Konto.", 400);
    return errorResponse(error, "Konto konnte nicht gewechselt werden.", 500);
  }
}
