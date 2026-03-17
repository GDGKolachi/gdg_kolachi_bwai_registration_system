import { Link, useLocation } from 'react-router-dom';

export default function RegistrationConfirmation() {
  const location = useLocation();
  const { workshopTitle, email } = location.state || {};

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
      <div className="card" style={{ padding: 40 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: '#E6F4EA',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 28,
        }}>
          &#10003;
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Registration Confirmed!</h1>
        {workshopTitle && (
          <p style={{ color: 'var(--gdg-gray)', marginBottom: 8 }}>
            You are registered for <strong>{workshopTitle}</strong>
          </p>
        )}
        {email && (
          <p style={{ color: 'var(--gdg-gray)', marginBottom: 24, fontSize: 14 }}>
            A confirmation email with your QR code has been sent to <strong>{email}</strong>
          </p>
        )}
        <Link to="/" className="btn btn-primary">Browse More Workshops</Link>
      </div>
    </div>
  );
}
