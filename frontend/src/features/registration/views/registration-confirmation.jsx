import { Link, useLocation, useSearchParams } from 'react-router-dom';

export default function RegistrationConfirmation() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { workshopTitle, email } = location.state || {};

  // Arrived here from the confirm-button link in the registration email
  const confirmedParam = searchParams.get('confirmed');
  const isEmailConfirm = confirmedParam !== null;
  const confirmSuccess = confirmedParam === 'true';

  if (isEmailConfirm) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-xl p-10 border border-gdg-border">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl ${confirmSuccess ? 'bg-green-100 text-gdg-green' : 'bg-red-100 text-gdg-red'}`}>
            {confirmSuccess ? '✓' : '✕'}
          </div>
          <h1 className="text-2xl font-bold mb-3">
            {confirmSuccess ? 'Registration Confirmed!' : 'Confirmation Failed'}
          </h1>
          <p className="text-gdg-gray mb-6 text-sm">
            {confirmSuccess
              ? 'Your registration has been confirmed. Our team will review applications and notify you if you are shortlisted.'
              : 'This confirmation link is invalid or has already been used.'}
          </p>
          <Link to="/" className="inline-flex items-center justify-center px-6 py-2.5 bg-gdg-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-600 no-underline">
            Browse Workshops
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="bg-white rounded-xl p-10 border border-gdg-border">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5 text-3xl text-gdg-green">
          ✓
        </div>
        <h1 className="text-2xl font-bold mb-3">Registration Submitted!</h1>
        {workshopTitle && (
          <p className="text-gdg-gray mb-2">
            You have registered for <strong>{workshopTitle}</strong>
          </p>
        )}
        {email && (
          <p className="text-gdg-gray mb-6 text-sm">
            A confirmation email has been sent to <strong>{email}</strong>. Please click the button in the email to confirm your spot.
          </p>
        )}
        <Link to="/" className="inline-flex items-center justify-center px-6 py-2.5 bg-gdg-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-600 no-underline">
          Browse More Workshops
        </Link>
      </div>
    </div>
  );
}
