import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createSession } from "@/lib/store";
import { verifyLogin } from "@/lib/webuntis";
import { ACCOUNT_GROUP_COOKIE, authCookieOptions, errorResponse, SESSION_COOKIE } from "@/lib/http";
const schema=z.object({server:z.string().min(3).max(255),school:z.string().min(1).max(255),username:z.string().min(1).max(255),password:z.string().min(1).max(1000)});
export async function POST(request:Request){try{const input=schema.parse(await request.json());const auth=await verifyLogin(input);const jar=await cookies();const result=await createSession(input,{personId:auth.personId,personType:auth.personType,klasseId:auth.klasseId,displayName:auth.displayName},jar.get(SESSION_COOKIE)?.value,jar.get(ACCOUNT_GROUP_COOKIE)?.value);const response=NextResponse.json({ok:true});response.cookies.set(SESSION_COOKIE,result.sessionToken,authCookieOptions());response.cookies.set(ACCOUNT_GROUP_COOKIE,result.accountGroupToken,authCookieOptions());return response}catch(error){if(error instanceof z.ZodError)return errorResponse(error,"Bitte alle Felder ausfüllen.",400);return errorResponse(error,"Anmeldung bei WebUntis fehlgeschlagen. Probiere es erneut.",401)}}
