import { BadRequestException } from '@nestjs/common';
import { escapeHtml, emailAssetBase } from './format';
import type { Accent, ThemeId, ThemeTokens } from './kit';

export const DEFAULT_THEME: ThemeId = 'devfest-2026';

/** DevFest 2026 brand colours (Figma "DevFest 2026 · Design System"). */
export const DEVFEST = {
  night: '#010409',
  ink: '#0C0D0D',
  border: '#1F2328',
  white: '#FFFFFF',
  muted: '#9AA0A6',
  yellow: '#FDB402',
  shade: '#CF8E00',
  blue: '#2A79F9',
  red: '#EE3E32',
  green: '#35A453',
};

const devfest: ThemeTokens = {
  id: 'devfest-2026',
  name: 'DevFest 2026',
  scheme: 'dark',
  pageBg: DEVFEST.night,
  cardBg: DEVFEST.ink,
  surfaceBg: '#111315',
  border: DEVFEST.border,
  text: DEVFEST.white,
  muted: DEVFEST.muted,
  link: '#6EA4FF',
  headingFont: "'Pixelify Sans', 'Courier New', monospace",
  bodyFont: "'Google Sans', Roboto, Arial, sans-serif",
  monoFont: "'Google Sans Code', 'Courier New', monospace",
  headingSize: 28,
  buttonBg: DEVFEST.yellow,
  buttonText: DEVFEST.ink,
  buttonShade: DEVFEST.shade,
  buttonRadius: 0,
  buttonUppercase: true,
  accents: {
    blue: DEVFEST.blue,
    red: DEVFEST.red,
    green: DEVFEST.green,
    yellow: DEVFEST.yellow,
    grey: DEVFEST.muted,
    whatsapp: DEVFEST.green,
  },
  tones: {
    info: {
      bg: '#0E1626',
      border: DEVFEST.blue,
      title: '#6EA4FF',
      text: DEVFEST.white,
    },
    success: {
      bg: '#0D1A12',
      border: DEVFEST.green,
      title: '#5BC27A',
      text: DEVFEST.white,
    },
    warning: {
      bg: '#1C1607',
      border: DEVFEST.yellow,
      title: DEVFEST.yellow,
      text: DEVFEST.white,
    },
    danger: {
      bg: '#1F0D0C',
      border: DEVFEST.red,
      title: '#FF6B61',
      text: DEVFEST.white,
    },
    neutral: {
      bg: '#111315',
      border: DEVFEST.border,
      title: DEVFEST.white,
      text: DEVFEST.white,
    },
  },
};

/** The look the emails had before DevFest: light, coloured header bar, Arial. */
const buildWithAi: ThemeTokens = {
  id: 'build-with-ai',
  name: 'Build with AI (classic)',
  scheme: 'light',
  pageBg: '#FFFFFF',
  cardBg: '#F9F9F9',
  surfaceBg: '#FFFFFF',
  border: '#E0E0E0',
  text: '#202124',
  muted: '#5F6368',
  link: '#1A73E8',
  headingFont: 'Arial, sans-serif',
  bodyFont: 'Arial, sans-serif',
  monoFont: "'Courier New', monospace",
  headingSize: 24,
  buttonBg: null,
  buttonText: '#FFFFFF',
  buttonShade: null,
  buttonRadius: 8,
  buttonUppercase: false,
  accents: {
    blue: '#4285F4',
    red: '#EA4335',
    green: '#34A853',
    yellow: '#F4B400',
    grey: '#5F6368',
    whatsapp: '#25D366',
  },
  tones: {
    info: {
      bg: '#E8F0FE',
      border: '#4285F4',
      title: '#1A73E8',
      text: '#202124',
    },
    success: {
      bg: '#E6F4EA',
      border: '#34A853',
      title: '#1E8E3E',
      text: '#202124',
    },
    warning: {
      bg: '#FFF3CD',
      border: '#F9AB00',
      title: '#856404',
      text: '#5C4400',
    },
    danger: {
      bg: '#FDECEA',
      border: '#EA4335',
      title: '#9B1C1C',
      text: '#202124',
    },
    neutral: {
      bg: '#FFFFFF',
      border: '#5F6368',
      title: '#5F6368',
      text: '#202124',
    },
  },
};

export const THEMES: Record<ThemeId, ThemeTokens> = {
  'devfest-2026': devfest,
  'build-with-ai': buildWithAi,
};

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && v in THEMES;
}

/** Event payloads: '' / null clear the per-event theme; anything else must be a known theme. */
export function normalizeEmailTheme<T extends { email_theme?: string | null }>(
  data: T,
): T {
  if (data.email_theme === undefined) return data;
  if (
    data.email_theme === null ||
    (typeof data.email_theme === 'string' && !data.email_theme.trim())
  ) {
    data.email_theme = null;
  } else if (!isThemeId(data.email_theme)) {
    throw new BadRequestException(
      `email_theme must be one of: ${Object.keys(THEMES).join(', ')}`,
    );
  }
  return data;
}

export function themeTokens(id: string | null | undefined): ThemeTokens {
  return isThemeId(id) ? THEMES[id] : THEMES[DEFAULT_THEME];
}

export interface LayoutInput {
  tokens: ThemeTokens;
  accent: Accent;
  /** Short line under the header: "You're shortlisted", "Starting soon". */
  label: string;
  /** Inbox preview text. */
  preheader: string;
  /** 'hero': the full skyline banner. 'wordmark': the quieter header for sober emails. */
  header: 'hero' | 'wordmark';
  mascots: boolean;
  subject: string;
  body: string;
}

const FONT_LINKS = [
  'https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Google+Sans+Code:wght@400;600&display=swap',
];

function head(t: ThemeTokens, subject: string, extraCss = ''): string {
  // One <link> per family: if one fails to load the others still apply.
  const fonts =
    t.id === 'devfest-2026'
      ? FONT_LINKS.map((h) => `<link href="${h}" rel="stylesheet" />`).join(
          '\n',
        )
      : '';
  return `<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="${t.scheme === 'dark' ? 'dark' : 'light'}" />
<meta name="supported-color-schemes" content="${t.scheme === 'dark' ? 'dark' : 'light'}" />
<title>${escapeHtml(subject)}</title>
${fonts}
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
  :root { color-scheme: ${t.scheme}; supported-color-schemes: ${t.scheme}; }
  body { margin:0; padding:0; width:100% !important; background:${t.pageBg}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { border-collapse:collapse; mso-table-lspace:0; mso-table-rspace:0; }
  img { -ms-interpolation-mode:bicubic; }
  a.email-btn:hover { filter: brightness(0.92); }
  @media (max-width: 620px) {
    .email-container { width:100% !important; }
    .email-pad { padding-left:20px !important; padding-right:20px !important; }
    .email-h1 { font-size:24px !important; }
  }
  ${extraCss}
</style>
</head>`;
}

function preheader(text: string): string {
  return `<!--preheader--><div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;opacity:0;">${escapeHtml(text)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div><!--/preheader-->`;
}

function devfestLayout(i: LayoutInput): string {
  const t = i.tokens;
  const assets = `${emailAssetBase()}/email/devfest-2026`;
  const headerRow =
    i.header === 'hero'
      ? `<tr><td bgcolor="${DEVFEST.night}" style="background:${DEVFEST.night};line-height:0;font-size:0;">
          <img src="${assets}/header.png" alt="DevFest 2026 by Google Developer Group Kolachi" width="600" height="280" style="display:block;border:0;width:100%;max-width:600px;height:auto;" />
        </td></tr>`
      : `<tr><td bgcolor="${DEVFEST.night}" align="center" style="background:${DEVFEST.night};padding:36px 24px 28px;">
          <img src="${assets}/wordmark.png" alt="DevFest" width="320" height="63" style="display:block;border:0;width:100%;max-width:320px;height:auto;margin:0 auto;" />
          <p style="margin:12px 0 0;font-family:${t.monoFont};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${DEVFEST.yellow};">2026 &middot; GDG Kolachi</p>
        </td></tr>`;
  const stripe = [DEVFEST.blue, DEVFEST.red, DEVFEST.green, DEVFEST.yellow]
    .map(
      (c) =>
        `<td width="25%" height="6" bgcolor="${c}" style="background:${c};height:6px;line-height:6px;font-size:0;">&nbsp;</td>`,
    )
    .join('');
  const mascots = i.mascots
    ? `<tr><td bgcolor="${t.cardBg}" align="center" style="background:${t.cardBg};padding:0 40px 8px;">
        <img src="${assets}/mascots.png" alt="The DevFest mascots" width="300" height="200" style="display:block;border:0;width:100%;max-width:300px;height:auto;margin:0 auto;" />
      </td></tr>`
    : '';
  const tagline = [
    ['BUILD', DEVFEST.blue],
    ['SECURE', DEVFEST.red],
    ['SCALE', DEVFEST.green],
  ]
    .map(([w, c]) => `<span style="color:${c};">${w}</span>`)
    .join(`<span style="color:${DEVFEST.muted};"> &middot; </span>`);

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
${head(t, i.subject)}
<body bgcolor="${t.pageBg}" style="margin:0;padding:0;background:${t.pageBg};">
${preheader(i.preheader)}
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="${t.pageBg}" style="background:${t.pageBg};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" class="email-container" width="600" border="0" cellspacing="0" cellpadding="0" style="width:600px;max-width:600px;border:1px solid ${t.border};">
      ${headerRow}
      <tr><td style="padding:0;line-height:0;font-size:0;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr>${stripe}</tr></table>
      </td></tr>
      <tr><td bgcolor="${t.cardBg}" class="email-pad" style="background:${t.cardBg};padding:32px 40px 8px;">
        <p style="margin:0 0 12px;font-family:${t.monoFont};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${t.accents[i.accent]};">&#9632; ${escapeHtml(i.label)}</p>
        ${i.body}
      </td></tr>
      ${mascots}
      <tr><td bgcolor="${DEVFEST.night}" align="center" class="email-pad" style="background:${DEVFEST.night};border-top:1px solid ${t.border};padding:28px 40px 32px;">
        <img src="${assets}/lockup.png" alt="DevFest by Google Developer Group Kolachi" width="360" height="98" style="display:block;border:0;width:100%;max-width:360px;height:auto;margin:0 auto 16px;" />
        <p style="margin:0 0 10px;font-family:${t.monoFont};font-size:12px;letter-spacing:2px;font-weight:600;">${tagline}</p>
        <p style="margin:0 0 6px;font-family:${t.monoFont};font-size:12px;color:${DEVFEST.yellow};">#DevFest #DevFest2026 #GDGKolachi</p>
        <p style="margin:0 0 14px;font-family:${t.bodyFont};font-size:13px;"><a href="https://gdg.community.dev/gdg-kolachi/" style="color:${t.link};text-decoration:underline;">gdg.community.dev/gdg-kolachi</a></p>
        <p style="margin:0;font-family:${t.bodyFont};font-size:11px;line-height:1.5;color:${t.muted};">This is an automated message from GDG Kolachi. Please do not reply.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function buildWithAiLayout(i: LayoutInput): string {
  const t = i.tokens;
  const bar = t.accents[i.accent];
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
${head(t, i.subject)}
<body bgcolor="${t.pageBg}" style="margin:0;padding:0;background:${t.pageBg};">
${preheader(i.preheader)}
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="${t.pageBg}" style="background:${t.pageBg};">
  <tr><td align="center" style="padding:16px 12px;">
    <table role="presentation" class="email-container" width="600" border="0" cellspacing="0" cellpadding="0" style="width:600px;max-width:600px;border:1px solid ${t.border};">
      <tr><td bgcolor="${bar}" align="center" style="background:${bar};padding:24px;font-family:${t.bodyFont};color:#FFFFFF;">
        <p style="margin:0;font-size:22px;font-weight:bold;">GDG Kolachi - Build with AI</p>
        <p style="margin:8px 0 0;font-size:16px;">${escapeHtml(i.label)}</p>
      </td></tr>
      <tr><td bgcolor="${t.cardBg}" class="email-pad" style="background:${t.cardBg};padding:30px 30px 14px;">${i.body}</td></tr>
      <tr><td bgcolor="#202124" align="center" style="background:#202124;padding:16px;font-family:${t.bodyFont};font-size:12px;color:#9AA0A6;">
        <p style="margin:0;">GDG Kolachi - Build with AI Workshop Series</p>
        <p style="margin:4px 0 0;">This is an automated message. Please do not reply.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function renderLayout(i: LayoutInput): string {
  return i.tokens.id === 'devfest-2026'
    ? devfestLayout(i)
    : buildWithAiLayout(i);
}
