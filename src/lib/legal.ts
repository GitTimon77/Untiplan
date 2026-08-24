import "server-only";

const placeholders = {
  name: "[Vor- und Nachname / Unternehmen]",
  street: "[Straße und Hausnummer]",
  postalCode: "[Postleitzahl]",
  city: "[Ort]",
  email: "[E-Mail-Adresse]",
};

function value(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function enabled(name: string, fallback = false) {
  const configured = process.env[name]?.trim().toLowerCase();
  if (!configured) return fallback;
  return configured === "true" || configured === "1" || configured === "yes";
}

export function getLegalConfig() {
  const operator = {
    name: value("LEGAL_NAME", placeholders.name),
    street: value("LEGAL_STREET", placeholders.street),
    postalCode: value("LEGAL_POSTAL_CODE", placeholders.postalCode),
    city: value("LEGAL_CITY", placeholders.city),
    country: value("LEGAL_COUNTRY", "Deutschland"),
    email: value("LEGAL_EMAIL", placeholders.email),
  };

  const configuredSessionDays = Number(process.env.SESSION_TTL_DAYS || 14);

  return {
    operator,
    representative: value("LEGAL_REPRESENTATIVE"),
    register: value("LEGAL_REGISTER"),
    registerNumber: value("LEGAL_REGISTER_NUMBER"),
    vatId: value("LEGAL_VAT_ID"),
    hostingProvider: value("LEGAL_HOSTING_PROVIDER"),
    hostingPrivacyUrl: value("LEGAL_HOSTING_PRIVACY_URL"),
    useCloudflare: enabled("LEGAL_USE_CLOUDFLARE", true),
    sessionDays: Number.isFinite(configuredSessionDays) && configuredSessionDays > 0
      ? configuredSessionDays
      : 14,
  };
}
