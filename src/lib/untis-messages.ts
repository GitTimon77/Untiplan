import type { UntisMessage, UntisMessageDetail } from "./types";
import { messagePlainText } from "./messages-of-day";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function text(value: unknown) {
  return messagePlainText(value);
}

function messageId(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function senderName(source: UnknownRecord) {
  const sender = record(source.sender);
  return text(sender?.displayName) || text(sender?.name) || text(source.senderName) || "Unbekannter Absender";
}

function sentDateTime(source: UnknownRecord) {
  return text(source.sentDateTime) || text(source.sentDate) || text(source.date);
}

function attachmentCount(source: UnknownRecord) {
  return [source.attachments, source.storageAttachments]
    .filter(Array.isArray)
    .reduce((count, attachments) => count + (attachments as unknown[]).length, 0)
    + (source.blobAttachment ? 1 : 0);
}

function messageCandidates(value: unknown) {
  const root = record(value);
  const data = record(root?.data);
  const candidates = root?.incomingMessages
    ?? root?.messages
    ?? data?.incomingMessages
    ?? data?.messages
    ?? (Array.isArray(root?.data) ? root.data : undefined);
  return Array.isArray(candidates) ? candidates : [];
}

export function normalizeUntisMessages(value: unknown): UntisMessage[] {
  return messageCandidates(value).flatMap(candidate => {
    const source = record(candidate);
    const id = source ? messageId(source.id) : null;
    if (!source || !id) return [];
    const count = attachmentCount(source);
    return [{
      id,
      subject: text(source.subject) || "(Kein Betreff)",
      contentPreview: text(source.contentPreview) || text(source.preview),
      senderName: senderName(source),
      sentDateTime: sentDateTime(source),
      isRead: source.isMessageRead === true || source.isRead === true || source.read === true || source.readFlag === true,
      hasAttachments: source.hasAttachments === true || count > 0,
    }];
  });
}

export function normalizeUntisMessageDetail(value: unknown, fallback: UntisMessage): UntisMessageDetail {
  const source = record(value);
  if (!source) return { ...fallback, content: fallback.contentPreview, attachmentCount: fallback.hasAttachments ? 1 : 0 };
  const content = text(source.content) || text(source.body) || fallback.contentPreview;
  const count = attachmentCount(source);
  const detailSender = senderName(source);
  return {
    id: messageId(source.id) ?? fallback.id,
    subject: text(source.subject) || fallback.subject,
    contentPreview: fallback.contentPreview || content,
    senderName: detailSender === "Unbekannter Absender" ? fallback.senderName : detailSender,
    sentDateTime: sentDateTime(source) || fallback.sentDateTime,
    isRead: fallback.isRead,
    hasAttachments: fallback.hasAttachments || count > 0,
    content,
    attachmentCount: count || (fallback.hasAttachments ? 1 : 0),
  };
}
