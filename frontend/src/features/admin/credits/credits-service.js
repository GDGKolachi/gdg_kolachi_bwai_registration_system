import toast from 'react-hot-toast';

// Wording for the status the attend / hackathon-checkin responses carry.
// `action` is the button offered next to it, if any.
const SCAN_STATUS = {
  pending: { label: 'Credits email queued', tone: 'ok' },
  sending: { label: 'Credits email queued', tone: 'ok' },
  sent: { label: 'Credits email sent', tone: 'ok' },
  failed: { label: 'Credits email failed', tone: 'bad', action: 'Retry' },
  not_sent: { label: 'Credits email not sent yet', tone: 'warn', action: 'Send' },
  not_queued: { label: 'Credits email is off for this event', tone: 'muted' },
  queue_error: { label: "Couldn't queue the credits email", tone: 'bad', action: 'Retry' },
};

export function scanStatusInfo(status) {
  return SCAN_STATUS[status] ?? { label: `Credits email: ${status}`, tone: 'muted' };
}

// Email status as stored on a credits row ('none' means no row yet).
const EMAIL_STATUS = {
  none: { label: 'Not sent', cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80' },
  not_sent: { label: 'Not sent', cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80' },
  pending: { label: 'Queued', cls: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70' },
  sending: { label: 'Sending', cls: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70' },
  sent: { label: 'Sent', cls: 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/70' },
  failed: { label: 'Failed', cls: 'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70' },
};

export function emailStatusInfo(status) {
  return EMAIL_STATUS[status] ?? EMAIL_STATUS.none;
}

export function sendButtonLabel(status) {
  return status === 'none' || status === 'not_sent' || !status ? 'Send email' : 'Resend email';
}

export function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function errorMessage(err, fallback) {
  return err?.response?.data?.message || fallback;
}

export async function copyText(value, label) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy the ${label.toLowerCase()}`);
  }
}
