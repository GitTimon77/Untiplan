import { NextResponse } from "next/server";
export const SESSION_COOKIE = "bwu_session";
export const ACCOUNT_GROUP_COOKIE = "bwu_accounts";
export const authCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: Number(process.env.SESSION_TTL_DAYS || 14) * 86400,
  priority: "high" as const,
});
export function errorResponse(error: unknown, fallback: string, status = 500) { const raw = error instanceof Error ? error.message : fallback; const message = /password|credential|secret/i.test(raw) ? fallback : raw; return NextResponse.json({ error: message }, { status }); }
