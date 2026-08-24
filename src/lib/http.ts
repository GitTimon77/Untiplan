import { NextResponse } from "next/server";
export const SESSION_COOKIE = "bwu_session";
export function errorResponse(error: unknown, fallback: string, status = 500) { const raw = error instanceof Error ? error.message : fallback; const message = /password|credential|secret/i.test(raw) ? fallback : raw; return NextResponse.json({ error: message }, { status }); }
