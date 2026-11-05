import { escapeHtml } from './format';

/** The four admin-editable parts of an email. */
export interface EmailCopy {
  subject: string;
  heading: string;
  intro: string;
  cta_label: string | null;
}

export type CopyOverrides = Partial<Record<keyof EmailCopy, string | null>>;

const VAR = /\{\{\s*([a-z_]+)\s*\}\}/gi;

/** Variable names used in `text` that are not in `vars`. */
export function unknownVariables(
  text: string,
  vars: Record<string, string>,
): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(VAR))
    if (!(m[1].toLowerCase() in vars)) out.add(m[1]);
  return [...out];
}

/** Plain substitution for subjects: no HTML, one line. Unknown variables become empty. */
export function fillPlain(text: string, vars: Record<string, string>): string {
  return text
    .replace(VAR, (_m, k: string) => vars[k.toLowerCase()] ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Admin copy to HTML: the text and every value are escaped, **bold** is kept,
 * a blank line starts a new paragraph (split on "\n\n" by the kit) and a
 * single line break stays a line break.
 */
export function fillHtml(text: string, vars: Record<string, string>): string {
  const escaped = escapeHtml(text.replace(/\r\n/g, '\n').trim());
  return escaped
    .replace(VAR, (_m, k: string) => escapeHtml(vars[k.toLowerCase()] ?? ''))
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .split(/\n{2,}/)
    .map((para) => para.replace(/\n/g, '<br />'))
    .join('\n\n');
}

/** Defaults, with any non-empty override on top. A blank override means "use the default". */
export function mergeCopy(
  defaults: EmailCopy,
  overrides?: CopyOverrides | null,
): EmailCopy {
  const out = { ...defaults };
  if (!overrides) return out;
  for (const key of Object.keys(defaults) as Array<keyof EmailCopy>) {
    const v = overrides[key];
    if (typeof v === 'string' && v.trim())
      (out as Record<string, unknown>)[key] = v;
  }
  return out;
}
