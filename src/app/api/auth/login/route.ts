import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/store";
import { verifyLogin } from "@/lib/webuntis";
import { errorResponse, SESSION_COOKIE } from "@/lib/http";
const schema=z.object({server:z.string().min(3).max(255),school:z.string().min(1).max(255),username:z.string().min(1).max(255),password:z.string().min(1).max(1000)});
export async function POST(request:Request){try{const input=schema.parse(await request.json());const auth=await verifyLogin(input);const token=await createSession(input,{personId:auth.personId,personType:auth.personType,displayName:auth.displayName});const response=NextResponse.json({ok:true});response.cookies.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:Number(process.env.SESSION_TTL_DAYS||14)*86400,priority:"high"});return response}catch(error){if(error instanceof z.ZodError)return errorResponse(error,"Bitte alle Felder ausfüllen.",400);return errorResponse(error,"Anmeldung bei WebUntis fehlgeschlagen.",401)}}
