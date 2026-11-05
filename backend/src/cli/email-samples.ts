/**
 * Renders every email type with sample data, and optionally sends them.
 *
 *   npm run email:samples -- --out ./email-previews              # HTML + text files
 *   npm run email:samples -- --send you@example.com               # [TEST] emails via Resend
 *   npm run email:samples -- --send you@example.com --theme build-with-ai --only credits
 *
 * Uses the built-in default copy (no database), RESEND_API_KEY for sending
 * and EMAIL_ASSET_BASE_URL (default https://register.gdgkolachi.com) for images.
 */
import * as fs from 'fs';
import * as path from 'path';
import { Resend } from 'resend';
import { renderEmail } from '../email/templates/render';
import {
  EMAIL_DEFINITIONS,
  EMAIL_TYPES,
  SAMPLE_VARIANTS,
} from '../email/templates/email-types';
import { THEMES } from '../email/templates/themes';
import {
  buildAttachments,
  inlineAttachments,
  FROM_ADDRESS,
} from '../email/templates/attachments';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const out = arg('out');
  const to = arg('send');
  const theme = arg('theme') || 'devfest-2026';
  const only = arg('only')?.split(',');
  if (!out && !to) {
    console.error('Pass --out <dir> and/or --send <email>.');
    process.exit(1);
  }
  if (!(theme in THEMES))
    throw new Error(
      `Unknown theme ${theme}; use one of ${Object.keys(THEMES).join(', ')}`,
    );
  if (to && !process.env.RESEND_API_KEY)
    throw new Error('RESEND_API_KEY is not set, cannot send.');
  if (out) fs.mkdirSync(out, { recursive: true });
  const resend = to ? new Resend(process.env.RESEND_API_KEY) : null;

  for (const type of EMAIL_TYPES) {
    if (only && !only.includes(type)) continue;
    for (const variant of SAMPLE_VARIANTS[type] ?? ['default']) {
      const def = EMAIL_DEFINITIONS[type] as { sample(v?: string): any };
      const r = renderEmail(type, def.sample(variant), { theme });
      const name = `${type}${variant === 'default' ? '' : `-${variant}`}`;
      const attachments = await buildAttachments(r.attachments);
      if (out) {
        fs.writeFileSync(
          path.join(out, `${name}.html`),
          inlineAttachments(r.html, attachments),
        );
        fs.writeFileSync(
          path.join(out, `${name}.txt`),
          `Subject: ${r.subject}\n\n${r.text}\n`,
        );
      }
      if (resend && to) {
        const { data, error } = await resend.emails.send({
          from: FROM_ADDRESS,
          to: [to],
          subject: `[TEST] ${r.subject}`,
          html: r.html,
          text: r.text,
          attachments,
        });
        if (error) console.error(`✗ ${name}: ${error.message}`);
        else console.log(`✓ ${name} sent (${data?.id})`);
        await new Promise((res) => setTimeout(res, 600)); // Resend default: 2 requests/second
      } else {
        console.log(`${name}\t${r.subject}`);
      }
    }
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
