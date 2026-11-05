import { renderEmail } from '../email/templates/render';
import {
  CREDITS_STEPS,
  CREDITS_THUMB_CID,
} from '../email/templates/email-types';
import { firstNameOf } from '../email/templates/format';

/**
 * The credits email now lives with the other email types in
 * src/email/templates (themed, admin-editable copy). These exports keep the
 * old entry points for callers and tests that render it without a database.
 */
export { CREDITS_STEPS, CREDITS_THUMB_CID, firstNameOf };

export interface CreditsEmailInput {
  firstName: string;
  eventTitle: string;
  /** Tracked claim URL (our API, which redirects to the event's claim link). */
  claimUrl: string;
  /** Tracked video URL, or null when the event has no walkthrough video. */
  videoUrl: string | null;
  /** `<origin>/credits/<token>` — the one-button confirm page. */
  confirmUrl: string;
}

export function creditsSubject(eventTitle: string): string {
  // Header values must stay on one line.
  return `Claim your Google Cloud credits – ${eventTitle.replace(/[\r\n]+/g, ' ').trim()}`;
}

/** Default copy, default theme. */
export function renderCreditsEmail(
  input: CreditsEmailInput,
  theme?: string,
): { subject: string; html: string; text: string } {
  const r = renderEmail(
    'credits',
    {
      name: input.firstName,
      eventTitle: input.eventTitle,
      claimUrl: input.claimUrl,
      videoUrl: input.videoUrl,
      confirmUrl: input.confirmUrl,
    },
    { theme },
  );
  return { subject: r.subject, html: r.html, text: r.text };
}
