export const COPY_FIELDS = ['subject', 'heading', 'intro', 'cta_label'];

/** What the editor shows: the saved override, or the default when there is none. */
export function effectiveCopy(type) {
  const out = {};
  for (const f of COPY_FIELDS) out[f] = type?.overrides?.[f] ?? type?.defaults?.[f] ?? '';
  return out;
}

/**
 * What gets saved: only fields that differ from the default. A field equal to
 * the default (or blank) is stored as null, so a later change to the built-in
 * default reaches it.
 */
export function overridesFrom(form, defaults) {
  const out = {};
  for (const f of COPY_FIELDS) {
    const v = (form[f] ?? '').trim();
    out[f] = v && v !== (defaults?.[f] ?? '').trim() ? v : null;
  }
  return out;
}

export function isDirty(form, type) {
  const saved = effectiveCopy(type);
  return COPY_FIELDS.some((f) => (form[f] ?? '').trim() !== (saved[f] ?? '').trim());
}

/** {{variables}} in the form that this email type does not provide. */
export function unknownVariables(form, variables) {
  const known = new Set(Object.keys(variables || {}));
  const found = new Set();
  for (const f of COPY_FIELDS) {
    for (const m of String(form[f] ?? '').matchAll(/\{\{\s*([a-z_]+)\s*\}\}/gi)) {
      if (!known.has(m[1].toLowerCase())) found.add(m[1]);
    }
  }
  return [...found];
}

export const VARIANT_LABELS = { in_person: 'In person', online: 'Online' };
