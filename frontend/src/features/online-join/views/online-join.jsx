import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useOnlineJoin, useSelfCheckin } from '../online-join-repository';

function formatClock(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function Shell({ children }) {
  return <div className="mx-auto w-full max-w-md px-1 py-4 sm:py-10">{children}</div>;
}

function MeetingCard({ data }) {
  if (!data.meeting_url && !data.meeting_details) {
    return (
      <section className="ui-card-quiet mt-5 p-5 text-sm text-slate-600">
        The organizers have not added the meeting link yet. Check back closer to the start.
      </section>
    );
  }
  return (
    <section className="ui-card mt-5 p-5">
      <h2 className="text-sm font-bold text-slate-900">Join the session</h2>
      {data.meeting_url && (
        <a
          href={data.meeting_url}
          target="_blank"
          rel="noopener noreferrer"
          className="ui-btn-primary mt-3 w-full !py-4 !text-base no-underline"
          data-testid="join-meeting"
        >
          Open the meeting
        </a>
      )}
      {data.meeting_details && (
        <div className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 px-3.5 py-3 text-sm text-slate-700">
          {data.meeting_details}
        </div>
      )}
    </section>
  );
}

function CreditsCard({ credits }) {
  if (!credits?.enabled || !credits.confirm_url) return null;
  return (
    <section className="ui-card mt-5 p-5" data-testid="credits-card">
      <h2 className="text-sm font-bold text-slate-900">☁️ Your Google Cloud credits</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
        We have also emailed you the steps. Claiming takes about five minutes.
      </p>
      <a href={credits.confirm_url} className="ui-btn-secondary mt-3 w-full no-underline">
        Get my credits link
      </a>
    </section>
  );
}

/**
 * The attendee's personal page for an online session, reached from the
 * "Check in & join" button in their emails. One deliberate tap checks them
 * in (link scanners that open the URL check nobody in), then the meeting and,
 * when the event has them, the cloud credits are one click away.
 */
export default function OnlineJoin() {
  const { token } = useParams();
  const { data, isLoading, error } = useOnlineJoin(token);
  const checkin = useSelfCheckin(token);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue" aria-label="Loading" />
      </div>
    );
  }

  if (error || !data) {
    const notFound = error?.response?.status === 404;
    return (
      <Shell>
        <div className="ui-card p-6 text-center" role="alert">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            {notFound ? 'This join link is not valid' : 'Something went wrong'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {notFound
              ? 'Use the "Check in & join" button from your own email. Links are personal and cannot be shared.'
              : 'We could not load this page. Please refresh and try again.'}
          </p>
        </div>
      </Shell>
    );
  }

  const onCheckin = async () => {
    try {
      const next = await checkin.mutateAsync();
      toast.success("You're checked in");
      if (next.meeting_url) window.open(next.meeting_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(
        err.response?.status === 429
          ? 'Too many attempts, try again in a minute'
          : err.response?.data?.message || 'Could not check you in, please try again',
      );
    }
  };

  const { state, opens_at: opensAt } = data.checkin || {};

  return (
    <Shell>
      <header className="mb-5 px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Online session</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{data.event.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{data.event.starts_at_text}</p>
      </header>

      {!data.seated ? (
        <section className="ui-card p-6 text-center" role="alert">
          <h2 className="text-lg font-bold text-slate-900">No seat on this registration</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Your registration has not been shortlisted for this session, so there is nothing to join here.
          </p>
        </section>
      ) : data.checked_in ? (
        <section className="ui-card p-6 text-center" data-testid="checked-in">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            You&apos;re checked in{data.first_name ? `, ${data.first_name}` : ''} 🎉
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {data.checked_in_at ? <>Checked in at <strong className="text-slate-900">{formatClock(data.checked_in_at)}</strong>. </> : null}
            Enjoy the session.
          </p>
        </section>
      ) : (
        <section className="ui-card p-6">
          <h2 className="text-xl font-bold leading-snug tracking-tight text-slate-900">
            {data.first_name ? `Hi ${data.first_name}, ready to join?` : 'Ready to join?'}
          </h2>
          {state === 'not_open' && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Check-in opens at <strong className="text-slate-900">{formatClock(opensAt)}</strong>. Keep this page open; the button turns on by itself.
            </p>
          )}
          {state === 'closed' && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Check-in for this session has closed.</p>
          )}
          {state === 'open' && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Tap once to mark your attendance{data.credits?.enabled ? ' and get your Google Cloud credits link' : ''}. Then join the meeting.
            </p>
          )}
          <button
            type="button"
            onClick={onCheckin}
            disabled={state !== 'open' || checkin.isPending}
            className="ui-btn-primary mt-5 w-full !py-4 !text-base"
            data-testid="self-checkin"
          >
            {checkin.isPending ? 'Checking you in…' : 'Check in & join'}
          </button>
        </section>
      )}

      {data.checked_in && <CreditsCard credits={data.credits} />}
      {data.seated && <MeetingCard data={data} />}
    </Shell>
  );
}
