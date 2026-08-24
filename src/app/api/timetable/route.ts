import { cookies } from "next/headers";
import { NextRequest,NextResponse } from "next/server";
import { deriveCourses,applyCourseFilter } from "@/lib/courses";
import { addDays,parseWeek,toUntisDate } from "@/lib/date";
import { errorResponse,SESSION_COOKIE } from "@/lib/http";
import { getSession } from "@/lib/store";
import { fetchTimetable } from "@/lib/webuntis";
export async function GET(request:NextRequest){try{const session=await getSession((await cookies()).get(SESSION_COOKIE)?.value);if(!session)return NextResponse.json({error:"Sitzung abgelaufen."},{status:401});const start=parseWeek(request.nextUrl.searchParams.get("week"));const end=addDays(start,4);const result=await fetchTimetable(session.credentials,{personId:session.personId,personType:session.personType},toUntisDate(start),toUntisDate(end));const courses=deriveCourses(result.lessons);return NextResponse.json({...result,lessons:applyCourseFilter(result.lessons,session.selectedCourseKeys,session.filterEnabled),courses,selectedCourseKeys:session.selectedCourseKeys,filterEnabled:session.filterEnabled,range:{startDate:toUntisDate(start),endDate:toUntisDate(end)}})}catch(error){return errorResponse(error,"Stundenplan konnte nicht geladen werden.",502)}}
