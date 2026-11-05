import { escapeHtml } from './format';

export type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';
export type Accent = 'blue' | 'red' | 'green' | 'yellow' | 'grey' | 'whatsapp';

export interface ThemeTokens {
  id: ThemeId;
  name: string;
  scheme: 'dark' | 'light';
  pageBg: string;
  cardBg: string;
  surfaceBg: string;
  border: string;
  text: string;
  muted: string;
  link: string;
  headingFont: string;
  bodyFont: string;
  monoFont: string;
  headingSize: number;
  /** null: the button takes the email's accent colour (legacy look). */
  buttonBg: string | null;
  buttonText: string;
  buttonShade: string | null;
  buttonRadius: number;
  buttonUppercase: boolean;
  accents: Record<Accent, string>;
  tones: Record<
    Tone,
    { bg: string; border: string; title: string; text: string }
  >;
}

export type ThemeId = 'devfest-2026' | 'build-with-ai';

/**
 * Email-safe building blocks bound to a theme: tables, inline styles and a
 * VML button for Outlook. Every email body is composed from these, so a theme
 * change restyles every email at once. Arguments named `html` are trusted
 * markup; everything else is escaped here.
 */
export function makeKit(t: ThemeTokens, accent: Accent) {
  const accentColor = t.accents[accent];
  const font = `font-family:${t.bodyFont};`;

  const kit = {
    t,
    accentColor,

    heading(text: string): string {
      return `<h1 class="email-h1" style="margin:0 0 16px;font-family:${t.headingFont};font-size:${t.headingSize}px;line-height:1.25;font-weight:700;color:${t.text};">${escapeHtml(text)}</h1>`;
    },

    p(
      html: string,
      opts: { muted?: boolean; size?: number; center?: boolean } = {},
    ): string {
      return `<p style="margin:0 0 16px;${font}font-size:${opts.size ?? 16}px;line-height:1.6;color:${opts.muted ? t.muted : t.text};${opts.center ? 'text-align:center;' : ''}">${html}</p>`;
    },

    /** Admin-written copy that is already escaped and formatted into paragraphs. */
    copy(html: string): string {
      return html
        .split('\n\n')
        .filter((para) => para.trim())
        .map((para) => kit.p(para))
        .join('');
    },

    link(label: string, url: string): string {
      return `<a href="${escapeHtml(url)}" style="color:${t.link};text-decoration:underline;word-break:break-all;">${escapeHtml(label)}</a>`;
    },

    mono(text: string, color = t.muted): string {
      return `<span style="font-family:${t.monoFont};font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${color};">${escapeHtml(text)}</span>`;
    },

    /**
     * Bulletproof button: a table cell carries the colour (so it survives
     * image blocking) and Outlook gets a VML shape of the same size.
     */
    button(
      label: string,
      url: string,
      opts: { variant?: 'primary' | 'secondary'; color?: string } = {},
    ): string {
      const secondary = opts.variant === 'secondary';
      const bg = opts.color ?? t.buttonBg ?? accentColor;
      const fill = secondary ? t.cardBg : bg;
      const fg = secondary ? (t.buttonBg ?? accentColor) : t.buttonText;
      const border = secondary ? `2px solid ${bg}` : `2px solid ${bg}`;
      const shade =
        !secondary && t.buttonShade
          ? `border-bottom:4px solid ${t.buttonShade};`
          : '';
      const text = t.buttonUppercase ? label.toUpperCase() : label;
      const safeUrl = escapeHtml(url);
      const arc = t.buttonRadius
        ? Math.min(50, Math.round((t.buttonRadius / 48) * 100))
        : 0;
      const width = Math.min(520, Math.max(220, text.length * 11 + 64));
      return `
<table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:8px auto 24px;">
  <tr><td align="center">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:52px;v-text-anchor:middle;width:${width}px;" arcsize="${arc}%" strokecolor="${bg}" strokeweight="2px" fillcolor="${fill}">
      <w:anchorlock/>
      <center style="color:${fg};font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${escapeHtml(text)}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-- -->
    <a href="${safeUrl}" class="email-btn" style="display:inline-block;background:${fill};color:${fg};border:${border};${shade}border-radius:${t.buttonRadius}px;padding:14px 28px;${font}font-size:15px;font-weight:700;letter-spacing:${t.buttonUppercase ? '1px' : '0'};line-height:20px;text-decoration:none;text-align:center;mso-hide:all;">${escapeHtml(text)}</a>
    <!--<![endif]-->
  </td></tr>
</table>`;
    },

    /** "If the button does not work" line with the raw URL. */
    fallbackLink(
      url: string,
      lead = 'If the button does not work, copy this link into your browser:',
    ): string {
      return kit.p(`${escapeHtml(lead)}<br />${kit.link(url, url)}`, {
        muted: true,
        size: 13,
      });
    },

    panel(opts: {
      tone: Tone;
      title?: string;
      html: string;
      dashed?: boolean;
      center?: boolean;
    }): string {
      const tone = t.tones[opts.tone];
      const borderCss = opts.dashed
        ? `border:2px dashed ${tone.border};`
        : `border:1px solid ${t.border};border-left:4px solid ${tone.border};`;
      const title = opts.title
        ? `<p style="margin:0 0 8px;${font}font-size:15px;font-weight:700;line-height:1.4;color:${tone.title};">${escapeHtml(opts.title)}</p>`
        : '';
      return `
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
  <tr><td bgcolor="${tone.bg}" style="background:${tone.bg};${borderCss}border-radius:${t.buttonRadius ? 8 : 0}px;padding:18px 20px;${font}font-size:15px;line-height:1.6;color:${tone.text};${opts.center ? 'text-align:center;' : ''}">${title}${opts.html}</td></tr>
</table>`;
    },

    /** Label/value rows (event details, bank details). Values are trusted HTML. */
    details(title: string | null, rows: Array<[string, string]>): string {
      const body = rows
        .filter(([, v]) => v)
        .map(
          ([label, value]) => `
    <tr>
      <td valign="top" style="padding:6px 12px 6px 0;width:96px;font-family:${t.monoFont};font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${t.muted};white-space:nowrap;">${escapeHtml(label)}</td>
      <td valign="top" style="padding:6px 0;${font}font-size:15px;line-height:1.5;color:${t.text};">${value}</td>
    </tr>`,
        )
        .join('');
      const head = title
        ? `<p style="margin:0 0 10px;font-family:${t.headingFont};font-size:18px;line-height:1.3;font-weight:700;color:${t.text};">${escapeHtml(title)}</p>`
        : '';
      return `
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
  <tr><td bgcolor="${t.surfaceBg}" style="background:${t.surfaceBg};border:1px solid ${t.border};border-left:4px solid ${accentColor};border-radius:${t.buttonRadius ? 8 : 0}px;padding:18px 20px;">
    ${head}
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">${body}</table>
  </td></tr>
</table>`;
    },

    list(items: string[], color = t.text): string {
      return `<ul style="margin:4px 0 0;padding-left:20px;${font}font-size:15px;line-height:1.6;color:${color};">${items.map((i) => `<li style="margin:2px 0;">${i}</li>`).join('')}</ul>`;
    },

    olist(items: string[]): string {
      return `<ol style="margin:4px 0 0;padding-left:20px;${font}font-size:15px;line-height:1.6;color:${t.text};">${items.map((i) => `<li style="margin:4px 0;">${i}</li>`).join('')}</ol>`;
    },

    /** Free text kept as written: escaped, line breaks preserved. */
    preformatted(text: string): string {
      return `<div style="white-space:pre-line;${font}font-size:15px;line-height:1.6;color:${t.text};">${escapeHtml(text.trim())}</div>`;
    },

    image(
      src: string,
      alt: string,
      width: number,
      height: number,
      opts: { link?: string } = {},
    ): string {
      const img = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" width="${width}" height="${height}" style="display:block;border:0;outline:none;width:100%;max-width:${width}px;height:auto;margin:0 auto;" />`;
      return opts.link
        ? `<a href="${escapeHtml(opts.link)}" style="text-decoration:none;">${img}</a>`
        : img;
    },
  };
  return kit;
}

export type Kit = ReturnType<typeof makeKit>;
