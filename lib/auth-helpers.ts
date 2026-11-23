/**
 * Sanitizes the OAuth `next` destination parameter.
 * Strictly prevents open redirect attacks by ensuring the path starts with
 * a single forward slash and rejects protocol-relative ('//') or backslash ('/\') bypasses.
 */
export function sanitizeNext(rawNext: string | null | undefined): string {
  if (
    rawNext &&
    typeof rawNext === 'string' &&
    rawNext.startsWith('/') &&
    !rawNext.startsWith('//') &&
    !rawNext.startsWith('/\\')
  ) {
    return rawNext;
  }
  return '/account';
}

