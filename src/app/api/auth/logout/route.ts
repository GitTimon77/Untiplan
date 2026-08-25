import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSessionAndSelectNext } from "@/lib/store";
import { ACCOUNT_GROUP_COOKIE, authCookieOptions, SESSION_COOKIE } from "@/lib/http";
export async function POST(){const jar=await cookies();const next=await deleteSessionAndSelectNext(jar.get(SESSION_COOKIE)?.value,jar.get(ACCOUNT_GROUP_COOKIE)?.value);const response=NextResponse.json({ok:true,hasActiveAccount:Boolean(next)});if(next)response.cookies.set(SESSION_COOKIE,next.sessionToken,authCookieOptions());else{response.cookies.set(SESSION_COOKIE,"",{httpOnly:true,path:"/",maxAge:0,sameSite:"lax"});response.cookies.set(ACCOUNT_GROUP_COOKIE,"",{httpOnly:true,path:"/",maxAge:0,sameSite:"lax"})}return response}
