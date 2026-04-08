/** Matches valid IANA timezone names (e.g. "Asia/Jakarta", "America/New_York", "UTC") */
const TZ_RE = /^[A-Za-z][A-Za-z0-9_/+\-]{0,49}$/

/** Returns the browser's local timezone, with a safe fallback. Client-side only. */
export function getBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return TZ_RE.test(tz) ? tz : 'Asia/Jakarta'
  } catch {
    return 'Asia/Jakarta'
  }
}

/** Server-side: validate a raw tz query/header param before using in SQL. */
export function sanitizeTz(raw: string | null | undefined): string {
  if (!raw || !TZ_RE.test(raw)) return 'Asia/Jakarta'
  return raw
}
