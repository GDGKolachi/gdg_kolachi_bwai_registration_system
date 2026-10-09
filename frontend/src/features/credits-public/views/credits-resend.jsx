import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../../events/event-repository';
import { useSelfResend } from '../credits-public-repository';

/**
 * "Didn't get the email?" Shown on the projector at the event. The backend
 * always answers with the same message, so that is what we show: it must not
 * reveal whether an address is registered.
 */
export default function CreditsResend() {
  const [params] = useSearchParams();
  const eventFromLink = params.get('event') || '';
  const { data: events, isLoading: eventsLoading } = useEvents();
  const resend = useSelfResend();

  const [picked, setPicked] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const eventId = eventFromLink || picked;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!eventId) return setError('Choose your event first.');
    if (!email.trim()) return setError('Enter the email you registered with.');
    try {
      const res = await resend.mutateAsync({ email: email.trim(), event_id: eventId });
      setMessage(res.message);
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) setError('Too many attempts, try again in a minute.');
      else if (status === 400) setError('Please check the email address and try again.');
      else setError('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-1 py-4 sm:py-10">
      <header className="mb-5 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Didn&apos;t get the email?</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter the email you registered with and we&apos;ll send your Google Cloud credits email again.
        </p>
      </header>

      <form onSubmit={submit} className="ui-card space-y-4 p-5">
        {!eventFromLink && (
          <div>
            <label htmlFor="credits-event" className="mb-1 block text-xs font-semibold text-slate-600">Event</label>
            <select
              id="credits-event"
              className="ui-input"
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
              disabled={eventsLoading}
            >
              <option value="">{eventsLoading ? 'Loading events…' : 'Select your event'}</option>
              {(events || []).map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="credits-email" className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
          <input
            id="credits-email"
            type="email"
            autoComplete="email"
            className="ui-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={resend.isPending} className="ui-btn-primary w-full !py-3">
          {resend.isPending ? 'Sending…' : 'Send it again'}
        </button>
        {error && <p role="alert" className="text-sm font-medium text-gdg-red">{error}</p>}
        {message && (
          <p role="status" data-testid="resend-message" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200/70">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
