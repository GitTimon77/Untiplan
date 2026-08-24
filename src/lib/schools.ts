export type SchoolSearchResult = {
  id: string;
  displayName: string;
  address?: string;
  server: string;
  loginName: string;
};

type SchoolQueryResponse = {
  result?: { schools?: unknown[] };
  error?: { message?: string };
};

const SCHOOL_QUERY_URL = "https://mobile.webuntis.com/ms/schoolquery2";

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeWebUntisServer(server: string) {
  const raw = server.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(raw) || raw.includes("..")) {
    throw new Error("Ungültiger WebUntis-Server.");
  }
  if (raw !== "webuntis.com" && !raw.endsWith(".webuntis.com")) {
    throw new Error("Der Server gehört nicht zu WebUntis.");
  }
  return raw;
}

function schoolFromUnknown(value: unknown): SchoolSearchResult | null {
  if (!value || typeof value !== "object") return null;
  const school = value as Record<string, unknown>;
  const displayName = textValue(school.displayName);
  const loginName = textValue(school.loginName);
  const address = textValue(school.address);
  let rawServer = textValue(school.server);

  if (!rawServer) {
    const serverUrl = textValue(school.serverUrl);
    try {
      rawServer = new URL(serverUrl).hostname;
    } catch {
      return null;
    }
  }

  if (!loginName || !displayName) return null;

  try {
    const server = normalizeWebUntisServer(rawServer);
    const rawId = school.schoolId;
    const id = typeof rawId === "string" || typeof rawId === "number"
      ? String(rawId)
      : `${server}:${loginName}`;
    return { id, displayName, ...(address ? { address } : {}), server, loginName };
  } catch {
    return null;
  }
}

export function parseSchoolSearchResponse(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Ungültige Antwort der WebUntis-Schulsuche.");
  const response = value as SchoolQueryResponse;
  if (response.error) throw new Error(response.error.message || "WebUntis-Schulsuche fehlgeschlagen.");
  if (!Array.isArray(response.result?.schools)) throw new Error("WebUntis lieferte keine Schulergebnisse.");

  const seen = new Set<string>();
  return response.result.schools
    .map(schoolFromUnknown)
    .filter((school): school is SchoolSearchResult => {
      if (!school) return false;
      const key = `${school.server}:${school.loginName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 25);
}

export async function searchSchools(query: string) {
  const search = query.trim();
  const response = await fetch(SCHOOL_QUERY_URL, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "untiplan-school-search",
      method: "searchSchool",
      params: [{ search }],
      jsonrpc: "2.0",
    }),
  });
  if (!response.ok) throw new Error(`WebUntis-Schulsuche antwortet mit HTTP ${response.status}.`);
  return parseSchoolSearchResponse(await response.json());
}
