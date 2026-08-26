import { NextResponse } from "next/server";

function fingerprints() {
  return (process.env.ANDROID_SHA256_CERT_FINGERPRINTS || "")
    .split(",")
    .map(value => value.trim().toUpperCase())
    .filter(value => /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value));
}

export async function GET() {
  const packageName = (process.env.ANDROID_PACKAGE_NAME || "de.untiplan.app").trim();
  const sha256CertFingerprints = fingerprints();
  const statements = sha256CertFingerprints.length ? [{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: packageName,
      sha256_cert_fingerprints: sha256CertFingerprints,
    },
  }] : [];

  return NextResponse.json(statements, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
