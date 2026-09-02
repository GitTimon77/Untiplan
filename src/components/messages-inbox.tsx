"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { UntisMessage, UntisMessageAttachment, UntisMessageDetail, UntisMessageDetailPayload } from "@/lib/types";
import { PdfPreview } from "@/components/pdf-preview";

type DetailState = { message?: UntisMessageDetail; busy?: boolean; error?: string };

function messageDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function initial(value: string) {
  return value.trim().charAt(0).toLocaleUpperCase("de") || "?";
}

function Attachment({ messageId, attachment }: { messageId: number; attachment: UntisMessageAttachment }) {
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const path = `/api/messages/${messageId}/attachments/${encodeURIComponent(attachment.id)}`;
  return <article className={`message-attachment ${attachment.kind}`}>
    <div className="message-attachment-head">
      <span title={attachment.name}>{attachment.name}</span>
      <a href={`${path}?download=1`} download={attachment.name}>Herunterladen</a>
    </div>
    {attachment.kind === "image" && <Image src={path} alt={`Vorschau von ${attachment.name}`} width={1200} height={800} unoptimized />}
    {attachment.kind === "pdf" && !showPdfPreview && <button className="message-attachment-preview" type="button" onClick={() => setShowPdfPreview(true)}>PDF-Vorschau anzeigen</button>}
    {attachment.kind === "pdf" && showPdfPreview && <>
      <button className="message-attachment-preview" type="button" onClick={() => setShowPdfPreview(false)}>PDF-Vorschau schließen</button>
      <PdfPreview url={path} name={attachment.name} />
    </>}
  </article>;
}

export function MessagesInbox({ messages, busy, error, sourceUrl, retry }: { messages: UntisMessage[]; busy: boolean; error: string; sourceUrl: string; retry: () => void }) {
  const [search, setSearch] = useState("");
  const [details, setDetails] = useState<Record<number, DetailState>>({});
  const normalizedSearch = search.trim().toLocaleLowerCase("de");
  const visibleMessages = useMemo(() => messages.filter(message => !normalizedSearch || `${message.subject} ${message.senderName} ${message.contentPreview}`.toLocaleLowerCase("de").includes(normalizedSearch)), [messages, normalizedSearch]);
  const unreadCount = messages.filter(message => !message.isRead).length;

  async function loadDetail(message: UntisMessage) {
    if (details[message.id]?.message || details[message.id]?.busy) return;
    if (!sourceUrl) {
      setDetails(current => ({ ...current, [message.id]: { message: { ...message, content: message.contentPreview, attachmentCount: message.hasAttachments ? 1 : 0, attachments: [] } } }));
      return;
    }
    setDetails(current => ({ ...current, [message.id]: { busy: true } }));
    try {
      const response = await fetch(`/api/messages/${message.id}`, { cache: "no-store" });
      const body = await response.json() as UntisMessageDetailPayload & { error?: string };
      if (!response.ok) throw new Error(body.error || "Mitteilung konnte nicht geladen werden.");
      setDetails(current => ({ ...current, [message.id]: { message: body.message } }));
    } catch (requestError) {
      setDetails(current => ({ ...current, [message.id]: { error: requestError instanceof Error ? requestError.message : "Mitteilung konnte nicht geladen werden." } }));
    }
  }

  return <section className="messages-inbox" aria-labelledby="messages-heading">
    <div className="messages-inbox-head">
      <div><p className="eyebrow">WebUntis</p><h2 id="messages-heading">Mitteilungen</h2><p className="muted">Posteingang deiner Schule · getrennt von Nachrichten zum Tag</p></div>
      <div className="messages-count" aria-label={`${messages.length} Mitteilungen, ${unreadCount} ungelesen`}><b>{messages.length}</b><span>{unreadCount ? `${unreadCount} ungelesen` : "alle gelesen"}</span></div>
    </div>
    <label className="messages-search"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Inhalt oder Person suchen" aria-label="Mitteilungen durchsuchen" /></label>
    {error && <div className="messages-error" role="alert"><span>{error}</span><button onClick={retry}>Erneut versuchen</button></div>}
    {busy && !messages.length ? <div className="messages-state">Mitteilungen werden geladen …</div>
      : !messages.length && !error ? <div className="messages-state"><b>Keine Mitteilungen</b><span>Der WebUntis-Posteingang ist leer.</span></div>
      : !visibleMessages.length ? <div className="messages-state"><b>Keine Treffer</b><span>Für diese Suche wurde keine Mitteilung gefunden.</span></div>
      : <div className="messages-list">{visibleMessages.map(message => {
        const detail = details[message.id];
        return <details className={`message-row${message.isRead ? "" : " unread"}`} key={message.id} onToggle={event => { if (event.currentTarget.open) void loadDetail(message); }}>
          <summary>
            <span className="message-avatar" aria-hidden="true">{initial(message.senderName)}</span>
            <span className="message-summary"><span className="message-meta"><b>{message.senderName}</b><time dateTime={message.sentDateTime}>{messageDate(message.sentDateTime)}</time></span><strong>{message.subject}</strong><span>{message.contentPreview || "Mitteilung öffnen"}</span></span>
            {!message.isRead && <span className="message-unread" aria-label="Ungelesen" />}
          </summary>
          <div className="message-detail">
            {detail?.busy ? <p className="muted">Inhalt wird geladen …</p>
              : detail?.error ? <div className="messages-error compact" role="alert"><span>{detail.error}</span><button onClick={() => { setDetails(current => ({ ...current, [message.id]: {} })); void loadDetail(message); }}>Noch einmal</button></div>
              : <p>{detail?.message?.content || message.contentPreview || "Diese Mitteilung enthält keinen Text."}</p>}
            {(detail?.message?.attachmentCount || message.hasAttachments) && <div className="message-attachments">
              <span>{detail?.message?.attachmentCount || 1} {detail?.message?.attachmentCount === 1 ? "Anhang" : "Anhänge"}</span>
              {detail?.message?.attachments.map(attachment => <Attachment key={attachment.id} messageId={message.id} attachment={attachment} />)}
            </div>}
          </div>
        </details>;
      })}</div>}
  </section>;
}
