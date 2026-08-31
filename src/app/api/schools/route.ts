import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/http";
import { searchSchools } from "@/lib/schools";

const querySchema = z.string().trim().min(3).max(100);

export async function GET(request: NextRequest) {
  try {
    const query = querySchema.parse(request.nextUrl.searchParams.get("q"));
    return NextResponse.json({ schools: await searchSchools(query) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Bitte mindestens drei Zeichen eingeben." }, { status: 400 });
    }
    return errorResponse(error, "Schulsuche ist momentan nicht verfügbar.", 502);
  }
}
