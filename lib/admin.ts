// Server-only helpers for admin authorization.
// Admin addresses come from the protected ADMIN_EMAIL_ALLOWLIST environment
// variable (comma-separated). Never hardcode admin addresses in source.

export function getAdminEmailAllowlist(): string[] {
  return (process.env.ADMIN_EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAdminEmailAllowlist().includes(email.trim().toLowerCase());
}
