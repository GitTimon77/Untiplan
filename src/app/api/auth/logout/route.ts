import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/store";
import { SESSION_COOKIE } from "@/lib/http";
export async function POST(){const jar=await cookies();await deleteSession(jar.get(SESSION_COOKIE)?.value);const response=NextResponse.json({ok:true});response.cookies.set(SESSION_COOKIE,"",{httpOnly:true,path:"/",maxAge:0,sameSite:"lax"});return response}
