import { Link, useLocation, useSearchParams } from 'react-router-dom';

export default function RegistrationConfirmation() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { workshopTitle, email } = location.state || {};

  // Arrived from shortlisted email "Confirm my spot" link
  const acknowledgedParam = searchParams.get('acknowledged');
  const isAcknowledge = acknowledgedParam !== null;
  const acknowledgeSuccess = acknowledgedParam === 'true';

  if (isAcknowledge) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-xl p-10 border border-gdg-border">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl ${acknowledgeSuccess ? 'bg-green-100 text-gdg-green' : 'bg-red-100 text-gdg-red'}`}>
            {acknowledgeSuccess ? '✓' : '✕'}
          </div>
          <h1 className="text-2xl font-bold mb-3">
            {acknowledgeSuccess ? 'Thank you — spot confirmed!' : 'Could not confirm'}
          </h1>
          <p className="text-gdg-gray mb-6 text-sm">
            {acknowledgeSuccess
              ? 'We have recorded your acknowledgement. See you at the workshop — bring your QR code from the email for check-in.'
              : 'This link may be invalid, or you are not shortlisted yet. If you need help, contact the GDG Kolachi team.'}
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
            Our team will review your application. If you are shortlisted, you will receive an email with your ticket QR code and a link to confirm your spot.
          </p>
        )}
        <Link to="/" className="inline-flex items-center justify-center px-6 py-2.5 bg-gdg-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-600 no-underline">
          Browse More Workshops
        </Link>
      </div>
    </div>
  );
}
