/**
 * Deposit terms. Kept in one place because the amount and payee appear in the
 * email, on the public submission page and in the admin grid — three copies
 * that must never drift.
 */
export const TEAM_DEPOSIT = Object.freeze({
  amount: 1000,
  currency: 'PKR',
  /** Rendered as-is in the email and on the submission page. */
  display: 'Rs 1,000',
  payeeName: 'Hassam Jawed',
  bankName: 'Mashreq Bank',
  accountNumber: '089200104180',
  /** The one to lead with — a local transfer needs only this. */
  iban: 'PK24MSHQ0000089200104180',
  /** Only relevant for an international wire. */
  swift: 'MSHQPKKK',
  /** One deposit covers the whole roster, regardless of team size. */
  perTeam: true,
  windowHours: 24,
});

export type StoredPaymentStatus =
  | 'not_requested'
  | 'requested'
  | 'submitted'
  | 'paid'
  | 'rejected';

/** What the UI shows — the stored status plus the derived 'expired'. */
export type PaymentState = StoredPaymentStatus | 'expired';

/**
 * 'expired' is derived rather than stored, so a team is never stuck in a stale
 * expired row because a scheduled job did not run, and pushing the deadline out
 * un-expires them without a second write.
 */
export function paymentState(
  team: { payment_status?: string | null; payment_deadline?: Date | string | null },
  now: Date = new Date(),
): PaymentState {
  const status = (team.payment_status || 'not_requested') as StoredPaymentStatus;
  if (status !== 'requested') return status;
  if (!team.payment_deadline) return 'requested';
  const deadline = team.payment_deadline instanceof Date
    ? team.payment_deadline
    : new Date(team.payment_deadline);
  return deadline.getTime() < now.getTime() ? 'expired' : 'requested';
}

/** A team may submit proof while the window is open, or after a rejection. */
export function canSubmitPayment(team: { payment_status?: string | null; payment_deadline?: Date | string | null }) {
  const state = paymentState(team);
  return state === 'requested' || state === 'rejected';
}

export function hoursRemaining(
  deadline: Date | string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!deadline) return null;
  const d = deadline instanceof Date ? deadline : new Date(deadline);
  return Math.max(0, Math.ceil((d.getTime() - now.getTime()) / 3_600_000));
}
