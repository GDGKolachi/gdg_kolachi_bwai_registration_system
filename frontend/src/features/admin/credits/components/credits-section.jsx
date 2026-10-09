import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCurrentUser } from '../../auth/use-current-user';
import { MANAGEMENT_ROLES } from '../../auth/roles';
import {
  useRegistrationCredits,
  useSendCredits,
  useConfirmCredits,
  useUnconfirmCredits,
} from '../credits-repository';
import { emailStatusInfo, sendButtonLabel, formatDateTime, errorMessage } from '../credits-service';
import CreditsQrModal from './credits-qr-modal';
import ConfirmDialog from './confirm-dialog';

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <dt className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="text-right text-slate-800">{value}</dd>
    </div>
  );
}

/**
 * The "Google Cloud credits" block in the registration drawer: email status,
 * the funnel timestamps, and the volunteer fallbacks (resend, QR, mark redeemed).
 */
export default function CreditsSection({ registrationId, name }) {
  const { data, isLoading, isError } = useRegistrationCredits(registrationId);
  const send = useSendCredits();
  const confirm = useConfirmCredits();
  const unconfirm = useUnconfirmCredits();
  const { hasRole } = useCurrentUser();
  const isOrganizer = hasRole(MANAGEMENT_ROLES);

  const [showQr, setShowQr] = useState(false);
  const [askConfirm, setAskConfirm] = useState(false);
  const [askUndo, setAskUndo] = useState(false);

  const run = async (mutation, okMsg, failMsg) => {
    try {
      await mutation.mutateAsync(registrationId);
      if (okMsg) toast.success(okMsg);
      return true;
    } catch (err) {
      toast.error(errorMessage(err, failMsg));
      return false;
    }
  };

  const status = data?.email_status ?? 'none';
  const badge = emailStatusInfo(status);
  const busy = send.isPending || confirm.isPending || unconfirm.isPending;

  return (
    <section className="border-t border-slate-100 px-5 py-4 sm:px-6" data-testid="credits-section">
      <h3 className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-400">Google Cloud credits</h3>

      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
      {isError && <p className="text-sm font-medium text-gdg-red">Could not load credits status.</p>}

      {data && (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              data-testid="credits-email-badge"
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}
            >
              Email: {badge.label}
            </span>
            {data.redeemed && (
              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200/70">
                Redeemed ✓ {data.redeemed_via === 'volunteer' ? '(confirmed by volunteer)' : '(by attendee)'}
              </span>
            )}
          </div>

          {status === 'failed' && data.email_last_error && (
            <p className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-900 ring-1 ring-rose-200/70">
              {data.email_last_error}
            </p>
          )}

          <dl className="divide-y divide-slate-100">
            <Row label="Email queued" value={formatDateTime(data.email_queued_at)} />
            <Row label="Email sent" value={formatDateTime(data.email_sent_at)} />
            <Row label="Claim link clicked" value={formatDateTime(data.claim_clicked_at)} />
            <Row label="Confirm page opened" value={formatDateTime(data.confirm_page_opened_at)} />
            <Row
              label={data.redeemed_via === 'volunteer' ? 'Redeemed (confirmed by volunteer)' : 'Redeemed (by attendee)'}
              value={data.redeemed ? formatDateTime(data.redeemed_at) : null}
            />
          </dl>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="ui-btn-secondary !px-3 !py-1.5 text-xs"
              disabled={busy || status === 'pending' || status === 'sending'}
              onClick={() => run(send, 'Credits email queued', 'Could not send the credits email')}
            >
              {sendButtonLabel(status)}
            </button>
            <button type="button" className="ui-btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setShowQr(true)}>
              Show credits QR
            </button>
            {!data.redeemed && (
              <button
                type="button"
                className="ui-btn-primary !px-3 !py-1.5 text-xs"
                disabled={busy}
                onClick={() => setAskConfirm(true)}
              >
                Mark redeemed
              </button>
            )}
            {data.redeemed && isOrganizer && (
              <button
                type="button"
                className="ui-btn-secondary !px-3 !py-1.5 text-xs"
                disabled={busy}
                onClick={() => setAskUndo(true)}
              >
                Undo
              </button>
            )}
          </div>
        </>
      )}

      {showQr && <CreditsQrModal registrationId={registrationId} name={name} onClose={() => setShowQr(false)} />}

      {askConfirm && (
        <ConfirmDialog
          title="Mark credits as redeemed?"
          confirmLabel="Mark redeemed"
          busy={confirm.isPending}
          onCancel={() => setAskConfirm(false)}
          onConfirm={async () => {
            if (await run(confirm, 'Marked as redeemed', 'Could not mark as redeemed')) setAskConfirm(false);
          }}
        >
          Only do this after you&apos;ve seen the GDP Credit billing account on their screen.
        </ConfirmDialog>
      )}

      {askUndo && (
        <ConfirmDialog
          title="Undo redemption?"
          confirmLabel="Undo"
          danger
          busy={unconfirm.isPending}
          onCancel={() => setAskUndo(false)}
          onConfirm={async () => {
            if (await run(unconfirm, 'Redemption undone', 'Could not undo')) setAskUndo(false);
          }}
        >
          This clears the redeemed mark for {name || 'this attendee'}.
        </ConfirmDialog>
      )}
    </section>
  );
}
