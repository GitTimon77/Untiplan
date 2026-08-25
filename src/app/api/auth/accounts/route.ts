import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCOUNT_GROUP_COOKIE, authCookieOptions, SESSION_COOKIE } from "@/lib/http";
import { listAccounts } from "@/lib/store";

export async function GET() {
  const jar = await cookies();
  const result = await listAccounts(
    jar.get(SESSION_COOKIE)?.value,
    jar.get(ACCOUNT_GROUP_COOKIE)?.value,
  );
  if (!result) return NextResponse.json({ error: "Sitzung abgelaufen." }, { status: 401 });
  const response = NextResponse.json({ accounts: result.accounts });
  response.cookies.set(ACCOUNT_GROUP_COOKIE, result.accountGroupToken, authCookieOptions());
  return response;
}
