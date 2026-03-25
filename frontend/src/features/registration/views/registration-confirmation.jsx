import { Link, useLocation } from 'react-router-dom';

export default function RegistrationConfirmation() {
  const location = useLocation();
  const { workshopTitle, email } = location.state || {};

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="bg-white rounded-xl p-10 border border-gdg-border">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5 text-3xl text-gdg-green">
          &#10003;
        </div>
        <h1 className="text-2xl font-bold mb-3">Registration Submitted!</h1>
        {workshopTitle && (
          <p className="text-gdg-gray mb-2">
            You have registered for <strong>{workshopTitle}</strong>
          </p>
        )}
        {email && (
          <p className="text-gdg-gray mb-6 text-sm">
            Your registration is pending review. You will receive a confirmation email at <strong>{email}</strong> once shortlisted.
          </p>
        )}
        <Link to="/" className="inline-flex items-center justify-center px-6 py-2.5 bg-gdg-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-600 no-underline">
          Browse More Workshops
        </Link>
      </div>
    </div>
  );
}
