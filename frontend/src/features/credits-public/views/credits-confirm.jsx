import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCreditsConfirm, useRedeemCredits } from '../credits-public-repository';

function formatWhen(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function Shell({ children }) {
  return <div className="mx-auto w-full max-w-md px-1 py-4 sm:py-10">{children}</div>;
}

function ExternalLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="ui-btn-secondary w-full no-underline"
    >
      {children}
    </a>
  );
}

/**
 * Where an attendee lands from the "I've redeemed my credits" button in the
 * email. One deliberate button, so link scanners that open the URL can't
 * confirm anything on their own.
 */
export default function CreditsConfirm() {
  const { token } = useParams();
  const { data, isLoading, error } = useCreditsConfirm(token);
  const redeem = useRedeemCredits(token);

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
            {notFound ? 'This link is not valid' : 'Something went wrong'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {notFound
              ? 'We could not find your credits record. Check the link in your email, or ask a volunteer for help.'
              : 'We could not load this page. Please refresh and try again.'}
          </p>
        </div>
      </Shell>
    );
  }

  const onConfirm = async () => {
    try {
      await redeem.mutateAsync();
    } catch (err) {
      toast.error(
        err.response?.status === 429
          ? 'Too many attempts, try again in a minute'
          : err.response?.data?.message || 'Could not save that, please try again',
      );
    }
  };

  return (
    <Shell>
      <header className="mb-5 px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{data.event_title}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          {data.first_name ? `Hi ${data.first_name}` : 'Hi there'}
        </h1>
      </header>

      {data.redeemed ? (
        <section className="ui-card p-6 text-center" data-testid="credits-done">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">You&apos;re all set 🎉</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Thanks, we&apos;ve recorded that you redeemed your Google Cloud credits
            {data.redeemed_at ? <> on <strong className="text-slate-900">{formatWhen(data.redeemed_at)}</strong></> : null}.
          </p>
        </section>
      ) : (
        <section className="ui-card p-6">
          <h2 className="text-xl font-bold leading-snug tracking-tight text-slate-900">
            Have you redeemed your Google Cloud credits?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Tap this once you can see the &quot;GDP Credit&quot; billing account in Google Cloud.
          </p>
          <button
            type="button"
            onClick={onConfirm}
            disabled={redeem.isPending}
            className="ui-btn-primary mt-5 w-full !py-4 !text-base"
          >
            {redeem.isPending ? 'Saving…' : "Yes, I've redeemed my credits"}
          </button>
        </section>
      )}

      {(data.claim_url || data.video_url) && (
        <section className="ui-card-quiet mt-5 p-5">
          <h2 className="text-sm font-bold text-slate-900">Haven&apos;t claimed yet?</h2>
          <div className="mt-3 space-y-2.5">
            {data.claim_url && <ExternalLink href={data.claim_url}>Claim your credits</ExternalLink>}
            {data.video_url && <ExternalLink href={data.video_url}>Watch the 2-minute walkthrough</ExternalLink>}
          </div>
        </section>
      )}
    </Shell>
  );
}
