import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useWorkshopById } from '../../workshops/workshop-repository';
import { useSubmitException } from '../exception-repository';
import { validateExceptionForm } from '../exception-service';

export default function ExceptionRequestForm() {
  const { workshopId } = useParams();
  const { data: workshop, isLoading } = useWorkshopById(workshopId);
  const submitMutation = useSubmitException();

  const [formData, setFormData] = useState({ email: '', reason: '' });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateExceptionForm(formData);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await submitMutation.mutateAsync({
        email: formData.email,
        requested_workshop_id: workshopId,
        reason: formData.reason,
      });
      setSubmitted(true);
      toast.success('Exception request submitted!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit exception request');
    }
  };

  if (isLoading) return <div className="loading">Loading...</div>;

  if (submitted) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#FEF7E0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: 28,
          }}>
            &#9202;
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Exception Request Submitted</h1>
          <p style={{ color: 'var(--gdg-gray)', marginBottom: 24 }}>
            Your request to attend <strong>{workshop?.title}</strong> is pending admin review.
            You will be notified by email once it is processed.
          </p>
          <Link to="/" className="btn btn-primary">Back to Workshops</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Link to={`/workshops/${workshopId}`} style={{ fontSize: 14, color: 'var(--gdg-gray)', marginBottom: 16, display: 'inline-block' }}>
        &larr; Back to {workshop?.title}
      </Link>

      <div className="card" style={{ marginTop: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Exception Request</h1>
        <p style={{ color: 'var(--gdg-gray)', marginBottom: 24 }}>
          Already registered for another workshop? Submit an exception request to also attend <strong>{workshop?.title}</strong>.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your Registered Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="The email you used to register"
            />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>
          <div className="form-group">
            <label>Why do you need to attend this additional workshop? *</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Please explain why you need to attend this additional workshop..."
              rows={5}
            />
            {errors.reason && <div className="form-error">{errors.reason}</div>}
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Exception Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
