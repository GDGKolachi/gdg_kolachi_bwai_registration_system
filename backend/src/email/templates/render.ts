import {
  EMAIL_DEFINITIONS,
  EmailData,
  EmailDefinition,
  EmailType,
  AttachmentHints,
} from './email-types';
import {
  CopyOverrides,
  fillHtml,
  fillPlain,
  mergeCopy,
  unknownVariables,
} from './copy';
import { makeKit, ThemeId } from './kit';
import { renderLayout, themeTokens } from './themes';
import { htmlToText } from './format';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  /** Variables used in the copy that this email type does not provide. */
  unknownVariables: string[];
  attachments: AttachmentHints;
  theme: ThemeId;
}

/**
 * Renders one email: the type's body and the admin copy (defaults with any
 * overrides on top), inside the chosen theme. Pure: no DB, no network.
 */
export function renderEmail<T extends EmailType>(
  type: T,
  data: EmailData<T>,
  opts: { theme?: string | null; overrides?: CopyOverrides | null } = {},
): RenderedEmail {
  const def = EMAIL_DEFINITIONS[type] as unknown as EmailDefinition<
    EmailData<T>
  >;
  const tokens = themeTokens(opts.theme);
  const copy = mergeCopy(def.defaults, opts.overrides);
  const vars = def.vars(data);
  const cta =
    def.cta === 'none'
      ? null
      : copy.cta_label?.trim()
        ? fillPlain(copy.cta_label, vars)
        : null;

  const subject =
    fillPlain(copy.subject, vars) || fillPlain(def.defaults.subject, vars);
  const kit = makeKit(tokens, def.accent);
  const body = def.body(data, kit, {
    heading: fillPlain(copy.heading, vars),
    intro: fillHtml(copy.intro, vars),
    cta:
      def.cta === 'required'
        ? cta || fillPlain(def.defaults.cta_label || '', vars)
        : cta,
  });
  const html = renderLayout({
    tokens,
    accent: def.accent,
    label: def.label,
    preheader: fillPlain(def.preheader, vars),
    header: def.header,
    mascots: def.mascots,
    subject,
    body,
  });

  const used = [
    copy.subject,
    copy.heading,
    copy.intro,
    copy.cta_label || '',
  ].join('\n');
  return {
    subject,
    html,
    text: htmlToText(html),
    unknownVariables: unknownVariables(used, vars),
    attachments: def.attachments?.(data) ?? {},
    theme: tokens.id,
  };
}
