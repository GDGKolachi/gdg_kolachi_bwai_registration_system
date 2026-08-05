/**
 * How each deposit state is labelled and coloured. Mirrors the backend's
 * paymentState(), including 'expired' — which the server derives rather than
 * stores, so the client never has to compare clocks itself.
 */
export const PAYMENT_LABELS = {
  not_requested: 'Not asked',
  requested: 'Awaiting deposit',
  submitted: 'Needs review',
  paid: 'Paid',
  rejected: 'Rejected',
  expired: 'Overdue',
};

export const PAYMENT_COLORS = {
  not_requested: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80',
  requested:     'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70',
  submitted:     'bg-violet-50 text-violet-900 ring-1 ring-violet-200/70',
  paid:          'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70',
  rejected:      'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70',
  expired:       'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70',
};

export const PAYMENT_FILTER_OPTIONS = Object.entries(PAYMENT_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/** "6h left" while the window is open; nothing once it no longer applies. */
export function paymentCountdown(state, hoursRemaining) {
  if (state !== 'requested' || hoursRemaining == null) return null;
  if (hoursRemaining <= 0) return 'due now';
  return `${hoursRemaining}h left`;
}
