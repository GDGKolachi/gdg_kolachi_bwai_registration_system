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
    name: '',
    email: '',
    phone: '',
    universityOrg: '',
    github: '',
    linkedin: '',
    cnic: '',
    gender: '',
    definesYouBest: '',
    motivation: '',
  });
  const [errors, setErrors] = useState({});
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const handleEmailBlur = async () => {
    if (!formData.email || !formData.email.includes('@')) return;
    try {
      const result = await api.get(`/registrations/check-email?email=${encodeURIComponent(formData.email)}`);
      setAlreadyRegistered(result.data.registered);
    } catch {
      // Allow form submission even if check fails
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const validationErrors = validateRegistrationForm(formData);
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) return;

    try {
      await registerMutation.mutateAsync({ ...formData, workshopId });
      toast.success('Registration submitted!');
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

  if (workshopLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue"
            aria-hidden
          />
          Loading…
        </div>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="ui-card border-rose-200/80 bg-rose-50/50 px-5 py-4 text-sm font-medium text-rose-800">
        Workshop not found.
      </div>
    );
  }

  const canRegister = isRegistrationOpen(workshop);

  return (
    <div className="mx-auto max-w-xl">
      <Link to={`/workshops/${workshopId}`} className="ui-link-back">
        ← Back to {workshop.title}
      </Link>

      <div className="ui-card p-6 sm:p-8">
        <div className="mb-8 border-b border-slate-100 pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Register</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">{workshop.title}</p>
        </div>

        {!canRegister && (
          <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 ring-1 ring-amber-200/70">
            Registration is not currently open for this workshop.
          </div>
        )}

        {alreadyRegistered && (
          <div className="mb-6 rounded-xl bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-900 ring-1 ring-rose-200/70">
            This email is already registered for a workshop.{' '}
            <Link
              to={`/exception-request/${workshopId}`}
              className="font-semibold text-gdg-blue underline decoration-gdg-blue/30 underline-offset-2 hover:decoration-gdg-blue"
            >
              Submit an exception request →
            </Link>
          </div>
        )}

        {canRegister && !alreadyRegistered && (
          <form onSubmit={handleSubmit}>
            <AttendeeFormFields formData={formData} onChange={setFormData} errors={errors} />
            <div onBlur={handleEmailBlur} />
            <MotivationField
              value={formData.motivation}
              onChange={val => setFormData(prev => ({ ...prev, motivation: val }))}
              error={errors.motivation}
            />
            <button
              type="submit"
              className="ui-btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Submitting…' : 'Submit registration'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
