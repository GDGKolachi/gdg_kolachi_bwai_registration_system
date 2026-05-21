import { Link, useLocation, useSearchParams } from 'react-router-dom';

export default function RegistrationConfirmation() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state || {};
  const eventTitle = state.eventTitle ?? state.workshopTitle;
  const { email } = state;

  const acknowledgedParam = searchParams.get('acknowledged');
  const isAcknowledge = acknowledgedParam !== null;
  const acknowledgeSuccess = acknowledgedParam === 'true';

  if (isAcknowledge) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="ui-card px-8 py-12 sm:px-10 sm:py-14">
          <div
            className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold ${
              acknowledgeSuccess
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70'
                : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/70'
            }`}
          >
            {acknowledgeSuccess ? '✓' : '✕'}
          </div>
          <h1 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            {acknowledgeSuccess ? 'Thank you — spot confirmed!' : 'Could not confirm'}
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-slate-600">
            {acknowledgeSuccess
              ? 'We have recorded your acknowledgement. See you at the event — bring your QR code from the email for check-in.'
              : 'This link may be invalid, or you are not shortlisted yet. If you need help, contact the GDG Kolachi team.'}
          </p>
          <Link to="/" className="ui-btn-primary px-8 no-underline">
            Browse events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="ui-card px-8 py-12 sm:px-10 sm:py-14">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-2xl font-bold text-emerald-700 ring-1 ring-emerald-200/70">
          ✓
        </div>
        <h1 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">Registration submitted</h1>
        {eventTitle && (
          <p className="mb-2 text-slate-700">
            You have registered for <strong className="text-slate-900">{eventTitle}</strong>
          </p>
        )}
        {email && (
          <p className="mb-8 text-sm leading-relaxed text-slate-600">
            Our team will review your application. If you are shortlisted, you will receive an email with your ticket QR code and a link to confirm your spot.
          </p>
        )}
        <Link to="/" className="ui-btn-primary px-8 no-underline">
          Browse more events
        </Link>
      </div>
    </div>
  );
}
