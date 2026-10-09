# Google Cloud credits email

At an event, the first thing attendees do is claim the Google Cloud credits that come with
attending. Today an organizer presents slides and walks each person through it. This module
moves that into the check-in flow: the moment an attendee's QR is scanned, they get an email
with a walkthrough video, the claim link, and an "I've redeemed my credits" button, so we
record redemption alongside attendance.

## Decisions

| Question | Decision |
|---|---|
| Claim link | One universal link per event, entered by an organizer on the event. No per-person codes. |
| Proof of redemption | The attendee's own confirmation. Nothing else is collected. Google does not report redemptions back to us, so this is a self-report. |
| What sends the email | A QR-scan check-in (QR scan page, mobile check-in, hackathon scanner), or an admin action. Desk check-in by name, bulk status changes and "mark attended" do **not** send it. |
| Where the attendee confirms | From the email. The "I've redeemed" button opens a one-button confirm page (click, then confirm), so link scanners in university/work mail can't confirm on someone's behalf. |

## Flow

```
QR scan → "Mark attended" → check-in saved (unchanged)
                          └─ credit_redemptions row inserted, email_status = pending
                             (unique per registration: re-scans never queue a second email)
Sender (in-process, every second, ≤ CREDITS_EMAIL_PER_SECOND) → Resend → attendee inbox
Email: ▶ video thumbnail · [Claim your credits] · quick steps · [I've redeemed my credits]
Attendee → /credits/<token> → [Yes, I've redeemed] → redeemed_at
```

Links in the email go through our API first (`/api/public/credits/<token>/claim` and `/video`)
so we record the click, then redirect to the event's claim / video URL.

## Data

**`events`** gains three columns:

| Column | Type | Notes |
|---|---|---|
| `credits_enabled` | boolean, default false | Nothing is sent unless this is on. |
| `credits_claim_url` | varchar, null | The universal claim link. Must be `https://`. |
| `credits_video_url` | varchar, null | Walkthrough video (unlisted YouTube recommended). Must be `https://`. Optional: the email drops the video block without it. |

**`credit_redemptions`** (new, one row per registration):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `registration_id` | uuid, unique, FK → registrations, on delete cascade | The uniqueness is what makes sending idempotent. |
| `event_id` | uuid, FK → events | Denormalised for per-event stats. |
| `token` | varchar(64), unique | 32 random bytes, base64url. Used in attendee links instead of the registration id, which is printed in every QR. |
| `source` | varchar | What created the row: `qr_scan`, `hackathon_scan`, `admin`, `volunteer_qr`. |
| `created_by_admin_id` | uuid, null | Who scanned / sent. |
| `email_status` | varchar | `not_sent` · `pending` · `sending` · `sent` · `failed` |
| `email_attempts` | int, default 0 | Attempts in the current send generation. |
| `email_generation` | int, default 1 | Bumped by every explicit resend; part of the Resend idempotency key. |
| `email_next_attempt_at` | timestamptz, null | Backoff. |
| `email_queued_at` / `email_sent_at` | timestamptz, null | |
| `email_last_error` | text, null | Shown to admins next to a Resend button. |
| `confirm_page_opened_at` / `claim_clicked_at` / `video_clicked_at` | timestamptz, null | Funnel tracking. First occurrence only. |
| `redeemed_at` | timestamptz, null | |
| `redeemed_via` | varchar, null | `attendee` or `volunteer` |
| `redeemed_by_admin_id` | uuid, null | Set when a volunteer confirms. |
| `created_at` / `updated_at` | timestamptz | |

All timestamps are `TIMESTAMPTZ` (see the convention note in the TeamPaymentConfirmation migration).

## Sending

- **Queueing never breaks check-in.** The check-in is saved first; queueing runs after, inside
  its own try/catch, and only inserts a row (`INSERT … ON CONFLICT (registration_id) DO NOTHING`).
  The scan response gains a `credits` field with the resulting status for the scanner to show.
- **Conditions to queue:** event has `credits_enabled` and a `credits_claim_url`, registration
  is not soft-deleted, and it is checked in.
- **Sender:** a provider started on module init (`setInterval`, no new dependencies), disabled
  with `CREDITS_WORKER_ENABLED=false`. Each tick it
  1. returns rows stuck in `sending` for more than 2 minutes to `pending` (a crash mid-send),
  2. claims due `pending` rows with `UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED LIMIT n) RETURNING …`,
  3. sends them one at a time, spaced to stay under `CREDITS_EMAIL_PER_SECOND` (default 4;
     Resend's documented default is 10 requests/second per team, shared with every other email).
- **Retries:** rate limits, 5xx and network errors retry after 15 s, 1 min, 5 min, 15 min, then
  the row is `failed`. Validation errors (e.g. a malformed address) fail immediately. Without a
  `RESEND_API_KEY` the send fails with that reason, visibly, rather than pretending to succeed.
- **No duplicates after a crash:** each send passes the Resend idempotency key
  `credits-<row id>-<email_generation>`, so retrying a send Resend already accepted is a no-op.
- **Resend:** an admin resend sets the row back to `pending`, resets attempts and bumps
  `email_generation`.

## Email

Subject: `Claim your Google Cloud credits – <event title>`. HTML plus a plain-text part. Every
interpolated value is HTML-escaped. Same from-address and visual style as the existing emails.

1. Greeting and one line: thanks for joining, claiming takes about five minutes.
2. Video thumbnail (`<APP_URL>/images/credits-video-thumb.png` with a play icon) linking to the
   tracked video URL, captioned "Watch the 2-minute walkthrough". Omitted when the event has no video.
3. **Claim your credits** button → tracked claim URL.
4. Quick steps: open the link in an Incognito/private window · sign in with a personal
   @gmail.com account · click **Claim Credit** · create a Google Developer Program profile if
   asked · scan the "verify you're human" QR with your phone · wait 3–5 minutes, click
   **Open Billing Account** and look for a billing account with "GDP Credit" in its name.
5. **I've redeemed my credits** button → `<APP_URL>/credits/<token>`.
6. "Stuck? Raise your hand and a volunteer will come to you."

## Attendee endpoints (public, `public/credits`)

| Endpoint | Behaviour |
|---|---|
| `GET /:token` | `{ first_name, event_title, claim_url, video_url, redeemed, redeemed_at }` (URLs are the tracked ones). Records `confirm_page_opened_at`. 404 for an unknown token or a deleted registration. |
| `POST /:token/redeem` | Sets `redeemed_at`, `redeemed_via = attendee`. Idempotent: a repeat returns the original time. |
| `GET /:token/claim`, `GET /:token/video` | Record the first click, then 302 to the event's URL. 404 if the event has no such URL. |
| `POST /resend` `{ email, event_id }` | "Didn't get the email?" Re-queues only an **existing** row for a checked-in registration with that email, at most once every 2 minutes. Always answers with the same message, so it reveals nothing about who is registered. |

Rate limits are per IP and deliberately generous, because a whole venue shares one public IP on
its Wi-Fi. Tokens are unguessable, so the limits are about load, not secrecy; the resend
endpoint is additionally protected by the per-row cooldown.

## Admin endpoints (`admin/credits`)

| Endpoint | Roles | Purpose |
|---|---|---|
| `GET events/:eventId/summary` | check-in | Checked in, emails by status, claim clicks, redeemed (attendee / volunteer). |
| `GET events/:eventId/follow-up?filter=not_redeemed\|failed` | check-in | Checked-in attendees sorted by check-in time, with minutes since check-in and credits status. |
| `GET registrations/:id` | check-in | Credits status for the record drawer and scanner. |
| `POST registrations/:id/send` | check-in | First send or resend for one person (the desk "Send credits email" button). |
| `GET registrations/:id/qr` | check-in | Creates the row if needed (without emailing) and returns the confirm URL plus a QR image, for "Show credits QR". |
| `POST registrations/:id/confirm` | check-in | Volunteer-confirmed redemption, recording who. |
| `DELETE registrations/:id/confirm` | organizer | Undo a confirmation. |
| `POST send-bulk` `{ event_id, registration_ids? }` | organizer | Send to the given people, or to everyone checked in who has no email yet. Per-person results. |

The registrations list gains credits status and redemption fields plus a `credits` filter
(`redeemed`, `not_redeemed`, `failed`), and the CSV export gains "Credits Email" and
"Credits Redeemed At".

## Fallbacks

The claim link is universal, so getting credits never depends on the email; only tracking
who confirmed does. The fallbacks protect that tracking.

| Situation | Fallback |
|---|---|
| Send fails | Automatic retries, then `failed` with the error and a Resend button; failed count on the credits page. |
| Email late, in spam, or to an inbox not on their phone | Volunteer taps "Show credits QR" on the attendee's record; the attendee scans it and lands on the confirm page. Or the projector shows a QR for `/credits/resend?event=<id>`. |
| Checked in at the desk without a QR | One-tap "Send credits email" on the desk row. |
| Claimed but didn't confirm | Live follow-up list (checked in, not confirmed, oldest first) for volunteers to walk the room. |
| No email access at all | Volunteer sees the "GDP Credit" billing account on their screen and marks them redeemed (volunteer-confirmed). |

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `CREDITS_WORKER_ENABLED` | `true` | Turn the sender off (tests drive it directly). |
| `CREDITS_EMAIL_PER_SECOND` | `4` | Send rate cap. |

Existing `RESEND_API_KEY` and `APP_URL` are reused.

## Testing

- **Backend e2e** (`backend/test/credits.e2e-spec.ts`): the real app against a throwaway
  Postgres database, with the mailer replaced by a recording fake that can be told to fail.
  Covers: one email per QR check-in; double scan, concurrent scans and re-check-in still one
  email; credits off / no claim URL / desk check-in / bulk status send nothing; provider
  failure leaves check-in working, retries, ends `failed`, and resend recovers; restart with
  pending rows still sends; token endpoints, idempotent redeem, resend cooldown and generic
  answer; admin summary, follow-up, filter, CSV, roles; a burst of check-ins sends exactly one
  email each without exceeding the rate cap.
- **Frontend** (Playwright): scan by manual paste → credits status shown → confirm page on a
  phone viewport → redeemed shown in admin.
- **Rehearsal** before an event, with real inboxes (Gmail, Outlook, university) and phones:
  scan-to-inbox time, spam placement, video playback on mobile data.

## Rollout

1. Merge and deploy; the migration adds the columns and table on startup.
2. Upload the walkthrough video (unlisted) and fill in the event's claim URL and video URL.
3. Turn on `credits_enabled` for the event and run the rehearsal.
