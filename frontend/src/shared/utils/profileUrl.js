/**
 * Registrants type their LinkedIn/GitHub in every shape imaginable — a full
 * https URL, a scheme-less `www.linkedin.com/in/foo`, `in/foo`, `@foo`, or a
 * bare handle. Blindly prefixing the canonical base produced links like
 * `https://linkedin.com/in/www.linkedin.com/in/foo`, so every shape is
 * normalised here instead.
 */

/** Anything that is clearly not a profile reference — links are not rendered for these. */
const PLACEHOLDER_VALUES = new Set(['n/a', 'na', 'none', 'nil', 'null', 'no', '-', '--', 'nan']);

/** Only http(s) may become an href — blocks `javascript:` and friends. */
const SAFE_SCHEME = /^https?:\/\//i;
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** Trailing junk registrants paste along with the URL. */
function clean(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .replace(/^[<("']+/, '')
    .replace(/[>)"'.,;]+$/, '')
    .replace(/\/+$/, '')
    .trim();
}

/**
 * @param {string} value      raw user input
 * @param {object} opts
 * @param {RegExp} opts.hostPattern   matches the site's host, scheme optional
 * @param {string} opts.base          canonical origin, no trailing slash
 * @param {string} opts.handlePath    path prefix for a bare handle ('' for GitHub)
 * @param {RegExp} [opts.knownPaths]  paths that are valid straight after the origin
 * @returns {string|null} an https URL, or null when the value is not linkable
 */
function toProfileUrl(value, { hostPattern, base, handlePath, knownPaths }) {
  const input = clean(value);
  if (!input) return null;
  if (PLACEHOLDER_VALUES.has(input.toLowerCase())) return null;

  // Already absolute: keep the registrant's own URL, but only if it is http(s).
  if (ANY_SCHEME.test(input)) return SAFE_SCHEME.test(input) ? input : null;

  // Scheme-less but host-qualified: `linkedin.com/in/foo`, `www.github.com/foo`.
  if (hostPattern.test(input)) return `https://${input.replace(/^\/+/, '')}`;

  // A path fragment off the canonical origin: `in/foo`, `company/acme`.
  const path = input.replace(/^\/+/, '');
  if (knownPaths?.test(path)) return `${base}/${path}`;

  // Bare handle. Reject anything with whitespace or a stray slash — those are
  // free-text answers, not handles, and would build a nonsense URL.
  const handle = path.replace(/^@+/, '');
  if (!/^[\w.-]+$/.test(handle)) return null;

  return `${base}${handlePath}/${handle}`;
}

const LINKEDIN_HOST = /^(?:https?:\/\/)?(?:[\w-]+\.)*linkedin\.com(?:\/|$)/i;
const LINKEDIN_PATHS = /^(?:in|pub|company|school|profile)\//i;

const GITHUB_HOST = /^(?:https?:\/\/)?(?:[\w-]+\.)*github\.(?:com|io)(?:\/|$)/i;

/** Canonical https LinkedIn URL, or null when the value is not linkable. */
export function linkedinUrl(value) {
  return toProfileUrl(value, {
    hostPattern: LINKEDIN_HOST,
    base: 'https://www.linkedin.com',
    handlePath: '/in',
    knownPaths: LINKEDIN_PATHS,
  });
}

/** Canonical https GitHub URL, or null when the value is not linkable. */
export function githubUrl(value) {
  return toProfileUrl(value, {
    hostPattern: GITHUB_HOST,
    base: 'https://github.com',
    handlePath: '',
  });
}

/** Any registrant-supplied URL (portfolio) — linked only when it is safe http(s). */
export function externalUrl(value) {
  const input = clean(value);
  if (!input) return null;
  if (PLACEHOLDER_VALUES.has(input.toLowerCase())) return null;
  if (ANY_SCHEME.test(input)) return SAFE_SCHEME.test(input) ? input : null;
  if (/\s/.test(input) || !input.includes('.')) return null;
  return `https://${input}`;
}

/**
 * Short label for a profile link — the handle rather than the full URL, so the
 * grid and detail panel stay scannable.
 */
export function profileHandle(value) {
  const input = clean(value);
  if (!input) return '';
  const withoutScheme = input.replace(SAFE_SCHEME, '').replace(/^www\./i, '');
  const segments = withoutScheme.split('/').filter(Boolean);
  const last = segments[segments.length - 1] || withoutScheme;
  return last.replace(/^@+/, '');
}
