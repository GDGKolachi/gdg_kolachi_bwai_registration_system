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
    github: '', linkedin: '', cnic: '', gender: '',
    definesYouBest: '', motivation: '',
  });
  const [errors, setErrors] = useState({});
  const [emailChecked, setEmailChecked] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const handleEmailBlur = async () => {
    if (!formData.email || !formData.email.includes('@')) return;
    try {
      const result = await api.get(`/registrations/check-email?email=${encodeURIComponent(formData.email)}`);
      setEmailChecked(true);
      setAlreadyRegistered(result.data.registered);
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

  if (workshopLoading) return <div className="flex justify-center items-center py-16 text-gdg-gray">Loading...</div>;
  if (!workshop) return <div className="bg-red-100 text-gdg-red p-3 rounded-lg">Workshop not found.</div>;

  const canRegister = isRegistrationOpen(workshop);

  return (
    <div className="max-w-xl mx-auto">
      <Link to={`/workshops/${workshopId}`} className="text-sm text-gdg-gray mb-4 inline-block hover:text-gdg-blue">
        &larr; Back to {workshop.title}
      </Link>

      <div className="bg-white rounded-xl p-6 border border-gdg-border mt-2">
        <h1 className="text-2xl font-bold mb-1">Register</h1>
        <p className="text-gdg-gray mb-6">{workshop.title}</p>

        {!canRegister && (
          <div className="bg-red-100 text-gdg-red p-3 rounded-lg mb-4">Registration is not currently open for this workshop.</div>
        )}

        {alreadyRegistered && (
          <div className="bg-red-100 text-gdg-red p-3 rounded-lg mb-4">
            This email is already registered for a workshop.
            <Link to={`/exception-request/${workshopId}`} className="ml-2 font-semibold text-gdg-blue hover:underline">
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
              className="w-full py-2.5 px-6 bg-gdg-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
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
