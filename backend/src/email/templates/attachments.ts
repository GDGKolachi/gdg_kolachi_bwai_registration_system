import * as fs from 'fs';
import * as path from 'path';
import * as QRCode from 'qrcode';
import { AttachmentHints, CREDITS_THUMB_CID } from './email-types';

export const FROM_ADDRESS = 'GDG Kolachi <hello@gdgkolachi.com>';

export interface InlineAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
  contentId: string;
}

let thumb: Buffer | null | undefined;

/** The credits walkthrough thumbnail, loaded once; null when the file is missing. */
export function creditsThumbnail(): Buffer | null {
  if (thumb === undefined) {
    try {
      thumb = fs.readFileSync(
        path.join(
          __dirname,
          '..',
          '..',
          'credits',
          'assets',
          'credits-video-thumb.png',
        ),
      );
    } catch {
      thumb = null;
    }
  }
  return thumb;
}

/** CID attachments the rendered email refers to (ticket QR, video thumbnail). */
export async function buildAttachments(
  hints: AttachmentHints,
): Promise<InlineAttachment[]> {
  const out: InlineAttachment[] = [];
  if (hints.qr) {
    const dataUrl = await QRCode.toDataURL(hints.qr, { width: 400, margin: 1 });
    out.push({
      filename: 'ticket-qrcode.png',
      content: Buffer.from(
        dataUrl.replace('data:image/png;base64,', ''),
        'base64',
      ),
      contentType: 'image/png',
      contentId: 'qrcode',
    });
  }
  if (hints.creditsThumb) {
    const img = creditsThumbnail();
    if (img)
      out.push({
        filename: 'credits-video-thumb.png',
        content: img,
        contentType: 'image/png',
        contentId: CREDITS_THUMB_CID,
      });
  }
  return out;
}

/** For browser previews: swaps cid: references for data URLs. */
export function inlineAttachments(
  html: string,
  attachments: InlineAttachment[],
): string {
  let out = html;
  for (const a of attachments) {
    out = out
      .split(`cid:${a.contentId}`)
      .join(`data:${a.contentType};base64,${a.content.toString('base64')}`);
  }
  return out;
}
