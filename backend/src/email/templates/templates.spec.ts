/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- sample data is untyped */
import { renderEmail } from './render';
import { EMAIL_DEFINITIONS, EMAIL_TYPES, SAMPLE_VARIANTS } from './email-types';
import { fillHtml, fillPlain, mergeCopy, unknownVariables } from './copy';
import { htmlToText, formatInstant } from './format';
import { normalizeEmailTheme, THEMES } from './themes';

const sample = (type: string, variant?: string) =>
  (EMAIL_DEFINITIONS as Record<string, { sample(v?: string): any }>)[
    type
  ].sample(variant);

describe('every email type, in every theme', () => {
  for (const theme of Object.keys(THEMES)) {
    for (const type of EMAIL_TYPES) {
      for (const variant of SAMPLE_VARIANTS[type] ?? [undefined]) {
        it(`${theme} / ${type}${variant ? ` / ${variant}` : ''} renders a complete email`, () => {
          const r = renderEmail(type, sample(type, variant), { theme });
          expect(r.theme).toBe(theme);
          expect(r.subject).toBeTruthy();
          expect(r.subject).not.toMatch(/\{\{|\n/);
          expect(r.html).toMatch(/^<!doctype html>/);
          expect(r.html).toContain('width="600"');
          expect(r.html).not.toMatch(/\{\{|undefined|NaN|\[object Object\]/);
          expect(r.text.length).toBeGreaterThan(50);
          expect(r.unknownVariables).toEqual([]);
        });
      }
    }
  }
});

describe('DevFest 2026 theme', () => {
  const r = renderEmail('shortlisted', sample('shortlisted', 'in_person'), {
    theme: 'devfest-2026',
  });

  it('uses the design tokens and hosted images with alt text and sizes', () => {
    expect(r.html).toContain('#010409');
    expect(r.html).toContain('#FDB402');
    expect(r.html).toContain("'Pixelify Sans'");
    expect(r.html).toMatch(
      /<img src="https:\/\/register\.gdgkolachi\.com\/email\/devfest-2026\/header\.png" alt="[^"]+" width="600" height="280"/,
    );
    expect(r.html).toContain(
      'lockup.png" alt="DevFest by Google Developer Group Kolachi" width="360"',
    );
    expect(r.html).toContain('#DevFest #DevFest2026 #GDGKolachi');
    expect(r.html).toContain('gdg.community.dev/gdg-kolachi');
  });

  it('has an Outlook (VML) button and keeps the QR ticket', () => {
    expect(r.html).toContain('v:roundrect');
    expect(r.html).toContain('CONFIRM MY SPOT');
    expect(r.html).toContain('cid:qrcode');
    expect(r.attachments.qr).toBeTruthy();
  });

  it('shows the join card instead of a QR for online events', () => {
    const online = renderEmail('shortlisted', sample('shortlisted', 'online'), {
      theme: 'devfest-2026',
    });
    expect(online.html).not.toContain('cid:qrcode');
    expect(online.attachments.qr).toBeUndefined();
    expect(online.html).toContain('/join/');
    expect(online.html).toContain('meet.google.com/abc-defg-hij');
  });

  it('serves images from EMAIL_ASSET_BASE_URL when set', () => {
    process.env.EMAIL_ASSET_BASE_URL = 'https://cdn.example.com/';
    try {
      expect(renderEmail('rejection', sample('rejection')).html).toContain(
        'https://cdn.example.com/email/devfest-2026/wordmark.png',
      );
    } finally {
      delete process.env.EMAIL_ASSET_BASE_URL;
    }
  });
});

describe('admin copy', () => {
  it('fills variables, escapes, keeps bold and line breaks', () => {
    const vars = { name: '<Eve>', event_title: 'DevFest' };
    expect(
      fillHtml('Hi {{ name }},\n**{{event_title}}** soon\n\nBye', vars),
    ).toBe('Hi &lt;Eve&gt;,<br /><strong>DevFest</strong> soon\n\nBye');
    expect(fillHtml('<script>x</script>', vars)).toBe(
      '&lt;script&gt;x&lt;/script&gt;',
    );
    expect(fillPlain('Hi {{name}}\r\n{{nope}}!', vars)).toBe('Hi <Eve> !');
    expect(unknownVariables('{{name}} {{nope}} {{ venue }}', vars)).toEqual([
      'nope',
      'venue',
    ]);
  });

  it('falls back to the default for blank overrides', () => {
    const d = { subject: 'S', heading: 'H', intro: 'I', cta_label: 'C' };
    expect(
      mergeCopy(d, { subject: '  ', heading: 'New', cta_label: null }),
    ).toEqual({ ...d, heading: 'New' });
  });

  it('applies overrides to the rendered email', () => {
    const r = renderEmail('shortlisted', sample('shortlisted'), {
      overrides: {
        subject: 'Seat for {{first_name}} at {{event_title}}',
        cta_label: 'Yes, I will be there',
        intro: 'Hello **{{venue}}**',
      },
    });
    expect(r.subject).toBe('Seat for Ayesha at DevFest Karachi 2026');
    expect(r.html).toContain('YES, I WILL BE THERE');
    expect(r.html).toContain(
      'Hello <strong>Expo Centre Karachi, Hall 3</strong>',
    );
  });

  it('keeps a required CTA even when the label is cleared, and reports unknown variables', () => {
    const r = renderEmail('credits', sample('credits'), {
      overrides: { cta_label: '', heading: 'Hi {{team_name}}' },
    });
    expect(r.html).toContain('CLAIM YOUR CREDITS');
    expect(r.unknownVariables).toEqual(['team_name']);
  });

  it('shows the optional rejection button only when a label is set', () => {
    expect(renderEmail('rejection', sample('rejection')).html).not.toContain(
      'v:roundrect',
    );
    expect(
      renderEmail('rejection', sample('rejection'), {
        overrides: { cta_label: 'See upcoming events' },
      }).html,
    ).toContain('SEE UPCOMING EVENTS');
  });
});

describe('helpers', () => {
  it('turns HTML into readable text without the preheader', () => {
    const text = htmlToText(
      '<!--preheader--><div>hidden</div><!--/preheader--><p>Hi &amp; bye</p><a href="https://x.y/a?b=1&amp;c=2">Go</a>',
    );
    expect(text).toBe('Hi & bye\nGo (https://x.y/a?b=1&c=2)');
  });

  it('formats instants in event time', () => {
    expect(formatInstant(new Date('2026-11-20T13:00:00Z'))).toBe(
      'Fri, 20 Nov 2026, 6:00 PM PKT',
    );
  });

  it('validates the per-event theme', () => {
    expect(normalizeEmailTheme({ email_theme: '' }).email_theme).toBeNull();
    expect(
      normalizeEmailTheme({ email_theme: 'build-with-ai' }).email_theme,
    ).toBe('build-with-ai');
    expect(() => normalizeEmailTheme({ email_theme: 'neon' })).toThrow();
  });
});
