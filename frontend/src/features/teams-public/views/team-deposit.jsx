import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

async function copy(value, label) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy — the ${label.toLowerCase()} is shown above`);
  }
}

function CopyableValue({ value, label }) {
  return (
    <button
      type="button"
      onClick={() => copy(value, label)}
      className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-sm tracking-wide text-slate-900 transition-colors hover:bg-slate-200"
      title={`Tap to copy ${label.toLowerCase()}`}
    >
      <span className="break-all text-left">{value}</span>
      <span className="shrink-0 font-sans text-[0.65rem] font-semibold uppercase text-slate-500">Copy</span>
    </button>
  );
}
import { depositApi } from '../deposit-api';

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function Banner({ tone, title, children }) {
  const tones = {
    ok:      'bg-emerald-50 text-emerald-900 ring-emerald-200/70',
    warn:    'bg-amber-50 text-amber-900 ring-amber-200/70',
    danger:  'bg-rose-50 text-rose-900 ring-rose-200/70',
    info:    'bg-sky-50 text-sky-900 ring-sky-200/70',
  };
  return (
    <div className={`rounded-xl px-4 py-3 text-sm ring-1 ${tones[tone]}`}>
      <p className="font-bold">{title}</p>
      {children && <div className="mt-1 leading-relaxed">{children}</div>}
    </div>
  );
}

/**
 * Where a captain lands from the deposit email. Deliberately shows the payee
 * details again rather than assuming the email is still open, and states that
 * one payment covers the team — four members each sending it is the obvious way
 * for this to go wrong.
 */
export default function TeamDeposit() {
  const { teamId } = useParams();
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ reference: '', sender_name: '', note: '' });

  useEffect(() => {
    let cancelled = false;
    depositApi.get(teamId)
      .then(d => { if (!cancelled) { setView(d); setLoading(false); } })
      .catch(err => {
        if (cancelled) return;
        setError(err.response?.status === 404
          ? 'We could not find this team. Check the link from your email.'
          : 'Something went wrong loading this page.');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [teamId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.reference.trim() || !form.sender_name.trim()) {
      toast.error('Transaction ID and sender name are both needed');
      return;
    }
    setSubmitting(true);
    try {
      await depositApi.submit(teamId, form);
      const fresh = await depositApi.get(teamId);
      setView(fresh);
      toast.success('Deposit details received');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit — please try again');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue" aria-hidden />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Banner tone="danger" title="Link not valid">{error}</Banner>
      </div>
    );
  }

  const d = view.deposit;
  const state = view.state;

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-16">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          {view.event_title}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Confirm {view.team_label}
        </h1>
      </header>

      {state === 'paid' && (
        <Banner tone="ok" title="Deposit confirmed — your team is shortlisted">
          Every member has been shortlisted and should have an entry pass by email.
          Nothing further is needed.
        </Banner>
      )}

      {state === 'submitted' && (
        <Banner tone="info" title="Details received — awaiting verification">
          We have your transaction ID and are checking it against our records. Once it is
          verified your team is <strong>shortlisted</strong> and everyone gets an entry pass
          by email. You do not need to send anything again.
        </Banner>
      )}

      {state === 'expired' && (
        <Banner tone="danger" title="The 24-hour window has closed">
          Your place is not automatically gone. If you have already paid, submit the details
          below anyway and we will sort it out.
        </Banner>
      )}

      {state === 'rejected' && (
        <Banner tone="warn" title="We could not verify that payment">
          {view.rejection_reason} You can submit corrected details below.
        </Banner>
      )}

      {state === 'not_requested' && (
        <Banner tone="info" title="No deposit has been requested for this team">
          If you think this is a mistake, reply to the email you received from us.
        </Banner>
      )}

      {state === 'requested' && view.hours_remaining != null && (
        <Banner tone="warn" title={`${view.hours_remaining} hour${view.hours_remaining === 1 ? '' : 's'} left to pay`}>
          Send the deposit, then come back here and tell us the transaction ID.
        </Banner>
      )}

      <section className="ui-card mt-6 p-5">
        <h2 className="mb-3 text-sm font-bold text-slate-900">What to send</h2>
        <Row label="Amount" value={d.display} />
        <Row label="Account holder" value={d.payeeName} />
        <Row label="Bank" value={d.bankName} />
        <Row label="IBAN" value={<CopyableValue value={d.iban} label="IBAN" />} />
        <Row label="Account number" value={<CopyableValue value={d.accountNumber} label="Account number" />} />
        <Row label="SWIFT" value={<CopyableValue value={d.swift} label="SWIFT code" />} />
        <Row label="Covers" value={`All ${view.member_count} member${view.member_count === 1 ? '' : 's'}`} />
        <p className="mt-3 text-xs text-slate-500">
          A local transfer needs only the IBAN. SWIFT is for international wires.
        </p>
        <ol className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <li><strong className="text-slate-900">1.</strong> Send {d.display} to the number above.</li>
          <li><strong className="text-slate-900">2.</strong> Submit the transaction ID below.</li>
          <li>
            <strong className="text-slate-900">3.</strong> We verify it — and once verified your
            team is <strong className="text-slate-900">shortlisted</strong>, with entry passes
            emailed to every member.
          </li>
        </ol>
        <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900 ring-1 ring-sky-200/70">
          This is <strong>one payment for the whole team</strong>. Please do not send it once
          per person — the captain pays {d.display} on behalf of everyone.
        </p>
      </section>

      {view.can_submit && (
        <form onSubmit={submit} className="ui-card mt-6 space-y-4 p-5">
          <h2 className="text-sm font-bold text-slate-900">Tell us what you sent</h2>

          <div>
            <label htmlFor="reference" className="mb-1 block text-xs font-semibold text-slate-600">
              Transaction ID <span className="text-gdg-red">*</span>
            </label>
            <input
              id="reference"
              className="ui-input w-full"
              value={form.reference}
              onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
              placeholder="From your transfer receipt"
              required
            />
          </div>

          <div>
            <label htmlFor="sender_name" className="mb-1 block text-xs font-semibold text-slate-600">
              Name on the sending account <span className="text-gdg-red">*</span>
            </label>
            <input
              id="sender_name"
              className="ui-input w-full"
              value={form.sender_name}
              onChange={e => setForm(f => ({ ...f, sender_name: e.target.value }))}
              placeholder="So we can match the transfer"
              required
            />
          </div>

          <div>
            <label htmlFor="note" className="mb-1 block text-xs font-semibold text-slate-600">
              Anything we should know (optional)
            </label>
            <textarea
              id="note"
              rows={2}
              className="ui-input w-full"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="e.g. sent from a parent's account"
            />
          </div>

          <button type="submit" disabled={submitting} className="ui-btn-primary w-full disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Submit deposit details'}
          </button>
        </form>
      )}

      {view.submitted && !view.can_submit && (
        <section className="ui-card mt-6 p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-900">What you told us</h2>
          <Row label="Transaction ID" value={view.submitted.reference} />
          <Row label="Sent by" value={view.submitted.sender_name} />
        </section>
      )}
    </div>
  );
}
