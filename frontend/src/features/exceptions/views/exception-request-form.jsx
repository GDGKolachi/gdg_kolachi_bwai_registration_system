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

  if (isLoading) return <div className="flex justify-center items-center py-16 text-gdg-gray">Loading...</div>;

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-xl p-10 border border-gdg-border">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-5 text-3xl">
            &#9202;
          </div>
          <h1 className="text-2xl font-bold mb-3">Exception Request Submitted</h1>
          <p className="text-gdg-gray mb-6">
            Your request to attend <strong>{workshop?.title}</strong> is pending admin review.
            You will be notified by email once it is processed.
          </p>
          <Link to="/" className="inline-flex items-center justify-center px-6 py-2.5 bg-gdg-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-600 no-underline">
            Back to Workshops
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <Link to={`/workshops/${workshopId}`} className="text-sm text-gdg-gray mb-4 inline-block hover:text-gdg-blue">
        &larr; Back to {workshop?.title}
      </Link>

      <div className="bg-white rounded-xl p-6 border border-gdg-border mt-2">
        <h1 className="text-2xl font-bold mb-1">Exception Request</h1>
        <p className="text-gdg-gray mb-6">
          Already registered for another workshop? Submit an exception request to also attend <strong>{workshop?.title}</strong>.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Your Registered Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="The email you used to register"
              className="w-full px-3.5 py-2.5 border border-gdg-border rounded-lg text-sm focus:outline-none focus:border-gdg-blue focus:ring-2 focus:ring-gdg-blue/15"
            />
            {errors.email && <div className="text-gdg-red text-xs mt-1">{errors.email}</div>}
          </div>
          <div className="mb-5">
            <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Why do you need to attend this additional workshop? *</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Please explain why you need to attend this additional workshop..."
              rows={5}
              className="w-full px-3.5 py-2.5 border border-gdg-border rounded-lg text-sm focus:outline-none focus:border-gdg-blue focus:ring-2 focus:ring-gdg-blue/15 resize-y min-h-24"
            />
            {errors.reason && <div className="text-gdg-red text-xs mt-1">{errors.reason}</div>}
          </div>
          <button
            type="submit"
            className="w-full py-2.5 px-6 bg-gdg-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Exception Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
