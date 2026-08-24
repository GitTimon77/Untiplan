import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse,SESSION_COOKIE } from "@/lib/http";
import { getSession,updateFilters } from "@/lib/store";
const schema=z.object({selectedCourseKeys:z.array(z.string().regex(/^\d+-\d+$/)).max(2000),filterEnabled:z.boolean()});
export async function PUT(request:Request){try{const token=(await cookies()).get(SESSION_COOKIE)?.value;if(!await getSession(token))return NextResponse.json({error:"Sitzung abgelaufen."},{status:401});const body=schema.parse(await request.json());await updateFilters(token!,body.selectedCourseKeys,body.filterEnabled);return NextResponse.json({ok:true})}catch(error){return errorResponse(error,"Filter konnten nicht gespeichert werden.",400)}}
