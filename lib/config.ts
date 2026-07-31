export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
  }

  const siteUrl = raw.replace(/\/+$/, "");
  const parsed = new URL(siteUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("NEXT_PUBLIC_SITE_URL must use http or https.");
  }

  return siteUrl;
}

export function getAllowedDevOrigins(): string[] {
  const csv = process.env.ALLOWED_DEV_ORIGINS?.trim();
  if (!csv) return [];

  return csv
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}
