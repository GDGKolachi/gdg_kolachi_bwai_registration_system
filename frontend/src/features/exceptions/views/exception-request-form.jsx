import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useEventById } from '../../events/event-repository';
import { useSubmitException } from '../exception-repository';
import { validateExceptionForm } from '../exception-service';

export default function ExceptionRequestForm() {
  const params = useParams();
  const eventId = params.eventId || params.workshopId;
  const { data: event, isLoading } = useEventById(eventId);
  const submitMutation = useSubmitException();

  const [formData, setFormData] = useState({ email: '', reason: '' });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    const validationErrors = validateExceptionForm(formData);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await submitMutation.mutateAsync({
        email: formData.email,
        requested_event_id: eventId,
        reason: formData.reason,
      });
      setSubmitted(true);
      toast.success('Exception request submitted!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit exception request');
    }
  };

  if (isLoading) {
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

  if (event && event.allowExceptions === false) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="ui-card px-8 py-12 sm:px-10 sm:py-14">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-2xl ring-1 ring-rose-200/70">
            ⛔
          </div>
          <h1 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">Not accepting exceptions</h1>
          <p className="mb-8 text-sm leading-relaxed text-slate-600">
            <strong className="text-slate-900">{event.title}</strong> is not accepting exception requests at this time.
          </p>
          <Link to="/" className="ui-btn-primary px-8 no-underline">
            Back to events
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="ui-card px-8 py-12 sm:px-10 sm:py-14">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-2xl ring-1 ring-amber-200/70">
            ⏱
          </div>
          <h1 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">Exception request submitted</h1>
          <p className="mb-8 text-sm leading-relaxed text-slate-600">
            Your request to attend <strong className="text-slate-900">{event?.title}</strong> is pending admin review.
            You will be notified by email once it is processed.
          </p>
          <Link to="/" className="ui-btn-primary px-8 no-underline">
            Back to events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link to={`/events/${eventId}`} className="ui-link-back">
        ← Back to {event?.title}
      </Link>

      <div className="ui-card p-6 sm:p-8">
        <div className="mb-8 border-b border-slate-100 pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Exception request</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Already registered for another event of this type? Request an exception to also attend{' '}
            <strong className="text-slate-800">{event?.title}</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="ui-label-sentence" htmlFor="ex-email">
              Your registered email *
            </label>
            <input
              id="ex-email"
              type="email"
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="The email you used to register"
              className={`ui-input ${errors.email ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
            />
            {errors.email && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.email}</div>}
          </div>
          <div className="mb-6">
            <label className="ui-label-sentence" htmlFor="ex-reason">
              Why do you need to attend this additional event? *
            </label>
            <textarea
              id="ex-reason"
              value={formData.reason}
              onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Please explain why you need to attend this additional event…"
              rows={5}
              className={`ui-input min-h-32 resize-y ${errors.reason ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
            />
            {errors.reason && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.reason}</div>}
          </div>
          <button
            type="submit"
            className="ui-btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? 'Submitting…' : 'Submit exception request'}
          </button>
        </form>
      </div>
    </div>
  );
}
