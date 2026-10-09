import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminEvents } from '../../event-management/admin-event-repository';
import { useCurrentUser } from '../../auth/use-current-user';
import { MANAGEMENT_ROLES } from '../../auth/roles';
import {
  useCreditsSummary,
  useCreditsFollowUp,
  useSendCredits,
  useConfirmCredits,
  useSendBulkCredits,
  useResendQr,
} from '../credits-repository';
import { emailStatusInfo, errorMessage, copyText } from '../credits-service';
import CreditsQrModal from '../components/credits-qr-modal';
import ConfirmDialog from '../components/confirm-dialog';

function StatCard({ label, value, hint, testId }) {
  return (
    <div className="ui-card p-4" data-testid={testId}>
      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Summary({ eventId }) {
  const { data, isLoading, isError } = useCreditsSummary(eventId);
  if (isLoading) return <p className="mb-6 text-sm text-slate-400">Loading summary…</p>;
  if (isError || !data) return <p className="mb-6 text-sm font-medium text-gdg-red">Could not load the summary.</p>;

  const pct = data.checked_in > 0 ? Math.round((data.redeemed.total / data.checked_in) * 100) : 0;
  const queued = data.emails.pending + data.emails.sending;
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard testId="stat-checked-in" label="Checked in" value={data.checked_in} />
      <StatCard testId="stat-sent" label="Emails sent" value={data.emails.sent} hint={queued > 0 ? `${queued} queued` : null} />
      <StatCard testId="stat-failed" label="Email failed" value={data.emails.failed} />
      <StatCard testId="stat-claim" label="Claim clicked" value={data.claim_clicks} />
      <StatCard
        testId="stat-redeemed"
        label="Redeemed"
        value={data.redeemed.total}
        hint={`${data.redeemed.attendee} by attendee · ${data.redeemed.volunteer} by volunteer`}
      />
      <StatCard testId="stat-pct" label="Of checked-in redeemed" value={`${pct}%`} />
    </div>
  );
}

function ProjectorCard({ eventId }) {
  const { data, isLoading, isError } = useResendQr(eventId);
  return (
    <div className="ui-card mt-6 p-4 sm:p-5">
      <h2 className="text-sm font-bold text-slate-900">For the projector</h2>
      <p className="mt-1 text-xs text-slate-500">
        Show this so anyone who didn&apos;t get the email can ask for it again.
      </p>
      {isLoading && <p className="mt-3 text-sm text-slate-400">Loading…</p>}
      {isError && <p className="mt-3 text-sm font-medium text-gdg-red">Could not load the link.</p>}
      {data && (
        <div className="mt-3 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <img src={data.qr_data_url} alt="QR code for the resend page" className="h-40 w-40 rounded-xl ring-1 ring-slate-200" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">
              <span data-testid="resend-url" className="min-w-0 flex-1 break-all font-mono text-xs text-slate-700">{data.url}</span>
              <button type="button" className="ui-btn-secondary shrink-0 !px-3 !py-1.5 text-xs" onClick={() => copyText(data.url, 'Link')}>
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RowActions({ row, tab, onQr, onMark }) {
  const send = useSendCredits();
  const status = row.credits.email_status;
  const label = status === 'none' || status === 'not_sent' ? 'Send' : 'Resend';
  const inFlight = status === 'pending' || status === 'sending';

  const onSend = async () => {
    try {
      await send.mutateAsync(row.registration_id);
      toast.success('Credits email queued');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send the credits email'));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" className="ui-btn-secondary !px-2.5 !py-1 text-xs" disabled={send.isPending || inFlight} onClick={onSend}>
        {send.isPending ? 'Sending…' : label}
      </button>
      {tab === 'not_redeemed' && (
        <>
          <button type="button" className="ui-btn-secondary !px-2.5 !py-1 text-xs" onClick={() => onQr(row)}>
            Show QR
          </button>
          <button type="button" className="ui-btn-primary !px-2.5 !py-1 text-xs" onClick={() => onMark(row)}>
            Mark redeemed
          </button>
        </>
      )}
    </div>
  );
}

function FollowUpTable({ eventId, tab, onQr, onMark }) {
  const { data, isLoading, isError } = useCreditsFollowUp(eventId, tab);
  const rows = data || [];

  if (isLoading) return <p className="py-10 text-center text-sm text-slate-400">Loading…</p>;
  if (isError) return <p className="py-10 text-center text-sm font-medium text-gdg-red">Could not load this list.</p>;
  if (rows.length === 0) {
    return (
      <div className="ui-card-quiet py-12 text-center text-sm font-medium text-slate-500">
        {tab === 'failed' ? 'No failed emails' : 'Everyone checked in has redeemed their credits'}
      </div>
    );
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table min-w-[34rem]" data-testid={`credits-table-${tab}`}>
        <thead>
          <tr>
            <th>Name</th>
            {tab === 'not_redeemed' && <th>Since check-in</th>}
            <th>Email</th>
            {tab === 'failed' && <th>Error</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const info = emailStatusInfo(row.credits.email_status);
            const mins = row.minutes_since_check_in;
            const late = mins != null && mins >= 15;
            return (
              <tr key={row.registration_id}>
                <td className="font-semibold text-slate-900">
                  {row.name}
                  {row.credits.claim_clicked_at && (
                    <span className="ml-2 text-[0.65rem] font-semibold uppercase text-sky-700">claimed</span>
                  )}
                </td>
                {tab === 'not_redeemed' && (
                  <td className="whitespace-nowrap">
                    <span
                      className={late
                        ? 'inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-900 ring-1 ring-amber-300'
                        : 'text-slate-600'}
                      data-late={late ? 'true' : undefined}
                    >
                      {mins == null ? '—' : `${mins} min`}
                    </span>
                  </td>
                )}
                <td>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${info.cls}`}>{info.label}</span>
                </td>
                {tab === 'failed' && (
                  <td className="max-w-[16rem] text-xs text-rose-800">{row.credits.email_last_error || '—'}</td>
                )}
                <td>
                  <RowActions row={row} tab={tab} onQr={onQr} onMark={onMark} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function CreditsDashboard() {
  const { data: events, isLoading: eventsLoading } = useAdminEvents();
  const { hasRole } = useCurrentUser();
  const isOrganizer = hasRole(MANAGEMENT_ROLES);

  const eventList = useMemo(() => {
    const list = Array.isArray(events) ? events : events?.data || [];
    // Credits-enabled events first: those are the ones this page is for.
    return [...list].sort((a, b) => Number(!!b.credits_enabled) - Number(!!a.credits_enabled));
  }, [events]);

  const [picked, setPicked] = useState('');
  const eventId = picked || eventList[0]?.id || '';
  const event = eventList.find((e) => e.id === eventId);

  const [tab, setTab] = useState('not_redeemed');
  const [qrRow, setQrRow] = useState(null);
  const [markRow, setMarkRow] = useState(null);
  const [askBulk, setAskBulk] = useState(false);

  const confirm = useConfirmCredits();
  const bulk = useSendBulkCredits();

  const doMark = async () => {
    try {
      await confirm.mutateAsync(markRow.registration_id);
      toast.success(`${markRow.name} marked as redeemed`);
      setMarkRow(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not mark as redeemed'));
    }
  };

  const doBulk = async () => {
    try {
      const res = await bulk.mutateAsync(eventId);
      const failed = res.results.filter((r) => !r.ok).length;
      if (res.total === 0) toast('Nobody is waiting for the email');
      else toast.success(`${res.queued} queued${failed > 0 ? `, ${failed} failed` : ''} (of ${res.total})`);
      setAskBulk(false);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send the emails'));
      setAskBulk(false);
    }
  };

  const tabs = [
    { key: 'not_redeemed', label: 'Follow up' },
    { key: 'failed', label: 'Email failed' },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <h1>Google Cloud credits</h1>
        <p>Who has the credits email, who has redeemed, and who needs a nudge. Refreshes every 15 seconds.</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full min-w-0 sm:max-w-md sm:flex-1">
          <label className="ui-label" htmlFor="credits-event">Event</label>
          <select
            id="credits-event"
            className="ui-input"
            value={eventId}
            onChange={(e) => { setPicked(e.target.value); setTab('not_redeemed'); }}
            disabled={eventsLoading}
          >
            {eventList.length === 0 && <option value="">{eventsLoading ? 'Loading…' : 'No events'}</option>}
            {eventList.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}{ev.credits_enabled ? '' : ' (credits off)'}
              </option>
            ))}
          </select>
        </div>
        {isOrganizer && eventId && (
          <button
            type="button"
            className="ui-btn-primary w-full sm:w-auto"
            disabled={!event?.credits_enabled}
            title={event?.credits_enabled ? undefined : 'Turn on credits for this event first'}
            onClick={() => setAskBulk(true)}
          >
            Email everyone checked in who hasn&apos;t got it
          </button>
        )}
      </div>

      {!eventId ? (
        <div className="ui-card-quiet py-16 text-center text-sm font-medium text-slate-500">Select an event</div>
      ) : (
        <>
          <Summary eventId={eventId} />

          <div className="mb-3 flex gap-1 border-b border-slate-200" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                  tab === t.key ? 'border-gdg-blue text-gdg-blue' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <FollowUpTable eventId={eventId} tab={tab} onQr={setQrRow} onMark={setMarkRow} />
          <ProjectorCard eventId={eventId} />
        </>
      )}

      {qrRow && <CreditsQrModal registrationId={qrRow.registration_id} name={qrRow.name} onClose={() => setQrRow(null)} />}

      {markRow && (
        <ConfirmDialog
          title={`Mark ${markRow.name} as redeemed?`}
          confirmLabel="Mark redeemed"
          busy={confirm.isPending}
          onCancel={() => setMarkRow(null)}
          onConfirm={doMark}
        >
          Only do this after you&apos;ve seen the GDP Credit billing account on their screen.
        </ConfirmDialog>
      )}

      {askBulk && (
        <ConfirmDialog
          title="Email everyone who hasn't got it?"
          confirmLabel="Send emails"
          busy={bulk.isPending}
          onCancel={() => setAskBulk(false)}
          onConfirm={doBulk}
        >
          This queues the credits email for everyone checked in to <strong>{event?.title}</strong> who
          hasn&apos;t been sent it yet.
        </ConfirmDialog>
      )}
    </div>
  );
}
