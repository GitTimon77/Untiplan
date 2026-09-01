import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { errorResponse, SESSION_COOKIE } from "@/lib/http";
import { getSession } from "@/lib/store";
import {
  fetchUntisMessageAttachment,
  UntisMessageAttachmentNotFoundError,
  UntisMessageAttachmentTooLargeError,
  UntisMessagesForbiddenError,
} from "@/lib/webuntis";

function safeFileName(value: string) {
  return value.replace(/[\r\n"\\/]/g, "_").trim() || "Anhang";
}

function contentDisposition(name: string, download: boolean) {
  const safeName = safeFileName(name);
  const asciiName = safeName.replace(/[^\x20-\x7e]/g, "_");
  return `${download ? "attachment" : "inline"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}

export async function GET(request: Request, context: { params: Promise<{ id: string; attachmentId: string }> }) {
  try {
    const session = await getSession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Sitzung abgelaufen." }, { status: 401 });
    const params = await context.params;
    const messageId = Number(params.id);
    const attachmentId = params.attachmentId;
    if (!Number.isInteger(messageId) || messageId <= 0 || !attachmentId || attachmentId.length > 260) {
      return NextResponse.json({ error: "Ungültiger Anhang." }, { status: 400 });
    }
    const file = await fetchUntisMessageAttachment(session.credentials, messageId, attachmentId);
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new Response(file.bytes, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": contentDisposition(file.name, download),
        "Content-Type": file.contentType,
        "Cross-Origin-Resource-Policy": "same-origin",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof UntisMessageAttachmentNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    if (error instanceof UntisMessageAttachmentTooLargeError) return NextResponse.json({ error: error.message }, { status: 413 });
    if (error instanceof UntisMessagesForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    return errorResponse(error, "Anhang konnte nicht geladen werden.", 502);
  }
}
