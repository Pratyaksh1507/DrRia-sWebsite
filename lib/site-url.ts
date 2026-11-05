/**
 * Resolves the canonical base URL for the current environment.
 * Priority:
 * 1. NEXT_PUBLIC_SITE_URL (custom domain or explicitly configured canonical URL)
 * 2. https://${VERCEL_URL} (Vercel automatic preview and branch deployment domain)
 * 3. http://localhost:3000 (local development fallback)
 */
export function getSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.trim() !== '') {
    const trimmed = vercelUrl.trim().replace(/\/+$/, '');
    return trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
  }

  return 'http://localhost:3000';
}
