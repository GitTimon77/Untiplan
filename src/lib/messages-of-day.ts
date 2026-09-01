import type { MessageOfDay } from "./types";

type UnknownRecord = Record<string, unknown>;

const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function decodeEntity(entity: string) {
  const normalized = entity.toLowerCase();
  if (namedEntities[normalized] !== undefined) return namedEntities[normalized];
  const numeric = normalized.startsWith("#x")
    ? Number.parseInt(normalized.slice(2), 16)
    : normalized.startsWith("#")
      ? Number.parseInt(normalized.slice(1), 10)
      : Number.NaN;
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 0x10ffff) return `&${entity};`;
  try { return String.fromCodePoint(numeric); } catch { return `&${entity};`; }
}

export function messagePlainText(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:address|article|blockquote|div|h[1-6]|li|p|section|tr)\s*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "• ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_match, entity: string) => decodeEntity(entity))
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function messageId(value: unknown, index: number) {
  return typeof value === "number" || typeof value === "string" ? value : `message-${index + 1}`;
}

export function normalizeMessagesOfDay(value: unknown): MessageOfDay[] {
  const root = record(value);
  const data = record(root?.data);
  const candidates = Array.isArray(data?.messagesOfDay)
    ? data.messagesOfDay
    : Array.isArray(root?.messagesOfDay)
      ? root.messagesOfDay
      : [];

  return candidates.flatMap((candidate, index) => {
    const source = record(candidate);
    if (!source) return [];
    const text = messagePlainText(source.text);
    const rawSubject = messagePlainText(source.subject);
    const subject = rawSubject || "Mitteilung";
    const attachments = Array.isArray(source.attachments) ? source.attachments : [];
    if (!rawSubject && !text && attachments.length === 0) return [];
    return [{
      id: messageId(source.id, index),
      subject,
      text,
      isExpanded: source.isExpanded === true,
      attachmentCount: attachments.length,
    }];
  });
}
