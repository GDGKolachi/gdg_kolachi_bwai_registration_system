import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useWorkshopById } from '../../workshops/workshop-repository';
import { isRegistrationOpen } from '../../workshops/workshop-service';
import { useRegister } from '../registration-repository';
import api from '../../../axios-instance';
import { validateRegistrationForm, hasErrors } from '../registration-service';
import AttendeeFormFields from '../components/attendee-form-fields';
import MotivationField from '../components/motivation-field';

export default function RegistrationForm() {
  const { workshopId } = useParams();
  const navigate = useNavigate();
  const { data: workshop, isLoading: workshopLoading } = useWorkshopById(workshopId);
  const registerMutation = useRegister();

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', universityOrg: '',
    githubLinkedin: '', cnic: '', motivation: '',
  });
  const [errors, setErrors] = useState({});
  const [emailChecked, setEmailChecked] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const handleEmailBlur = async () => {
    if (!formData.email || !formData.email.includes('@')) return;
    try {
      const result = await api.get(`/registrations/check-email?email=${encodeURIComponent(formData.email)}`);
      setEmailChecked(true);
      if (result.data.registered) {
        setAlreadyRegistered(true);
      } else {
        setAlreadyRegistered(false);
      }
    } catch {
      // Allow form submission even if check fails
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateRegistrationForm(formData);
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) return;

    try {
      await registerMutation.mutateAsync({ ...formData, workshopId });
      toast.success('Registration successful!');
      navigate('/registration/confirmation', {
        state: { workshopTitle: workshop?.title, email: formData.email },
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      if (msg.includes('already registered')) {
        setAlreadyRegistered(true);
        toast.error('You are already registered for a workshop. Please submit an exception request.');
      } else {
        toast.error(msg);
      }
    }
  };

  if (workshopLoading) return <div className="loading">Loading...</div>;
  if (!workshop) return <div className="error-message">Workshop not found.</div>;

  const canRegister = isRegistrationOpen(workshop);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Link to={`/workshops/${workshopId}`} style={{ fontSize: 14, color: 'var(--gdg-gray)', marginBottom: 16, display: 'inline-block' }}>
        &larr; Back to {workshop.title}
      </Link>

      <div className="card" style={{ marginTop: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Register</h1>
        <p style={{ color: 'var(--gdg-gray)', marginBottom: 24 }}>{workshop.title}</p>

        {!canRegister && (
          <div className="error-message">Registration is not currently open for this workshop.</div>
        )}

        {alreadyRegistered && (
          <div className="error-message" style={{ marginBottom: 16 }}>
            This email is already registered for a workshop.
            <Link to={`/exception-request/${workshopId}`} style={{ marginLeft: 8, fontWeight: 600 }}>
              Submit an exception request &rarr;
            </Link>
          </div>
        )}

        {canRegister && !alreadyRegistered && (
          <form onSubmit={handleSubmit}>
            <AttendeeFormFields formData={formData} onChange={setFormData} errors={errors} />
            <div onBlur={handleEmailBlur} />
            <MotivationField
              value={formData.motivation}
              onChange={(val) => setFormData(prev => ({ ...prev, motivation: val }))}
              error={errors.motivation}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Submitting...' : 'Register'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
