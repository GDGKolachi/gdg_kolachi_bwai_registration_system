import { useState, useMemo } from 'react';
import { useEvents } from '../../events/event-repository';
import { teamLookupApi } from '../team-lookup-api';

const bucketColors = {
  developer: 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/70',
  designer: 'bg-violet-50 text-violet-900 ring-1 ring-violet-200/70',
  sales: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70',
  other: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
};

export default function TeamLookup() {
  const { data: events, isLoading: eventsLoading } = useEvents();

  const hackathons = useMemo(
    () => (events || []).filter(e => e.eventTypeSlug === 'hackathon'),
    [events],
  );

  const [eventId, setEventId] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const canSubmit = eventId && email.trim() && name.trim();

  const handleSubmit = async e => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await teamLookupApi.lookup(eventId, email.trim(), name.trim());
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Find your team</h1>
        <p className="mt-2 text-sm text-slate-600">
          Select the hackathon and enter the name and email you registered with to see your team.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="ui-card p-5 sm:p-6">
        <div className="mb-5">
          <label className="ui-label-sentence" htmlFor="tl-event">
            Hackathon *
          </label>
          <select
            id="tl-event"
            className="ui-input"
            value={eventId}
            onChange={e => { setEventId(e.target.value); setResult(null); setError(''); }}
          >
            <option value="">{eventsLoading ? 'Loading…' : 'Select a hackathon'}</option>
            {hackathons.map(h => (
              <option key={h.id} value={h.id}>{h.title}</option>
            ))}
          </select>
          {!eventsLoading && hackathons.length === 0 && (
            <p className="mt-1.5 text-xs text-slate-500">No hackathons are available right now.</p>
          )}
        </div>
        <div className="mb-5">
          <label className="ui-label-sentence" htmlFor="tl-name">
            Full name *
          </label>
          <input
            id="tl-name"
            className="ui-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Name you registered with"
          />
        </div>
        <div className="mb-5">
          <label className="ui-label-sentence" htmlFor="tl-email">
            Email *
          </label>
          <input
            id="tl-email"
            type="email"
            className="ui-input"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="ui-btn-primary w-full py-3 disabled:opacity-60"
        >
          {loading ? 'Looking up…' : 'Find my team'}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-xl bg-rose-50 px-5 py-4 text-center text-sm font-medium text-rose-900 ring-1 ring-rose-200/70">
          {error}
        </div>
      )}

      {result && !result.found && (
        <div className="mt-6 rounded-xl bg-amber-50 px-5 py-6 text-center text-sm font-medium text-amber-900 ring-1 ring-amber-200/70">
          {result.reason === 'not_published'
            ? "Team assignments for this hackathon haven't been published yet. Please check back later."
            : result.reason === 'not_assigned'
            ? "You're registered, but you haven't been assigned to a team yet. Check back after check-in."
            : "We couldn't find a registration with that name and email for this hackathon. Double-check your details."}
        </div>
      )}

      {result && result.found && (
        <div className="mt-6 ui-card overflow-hidden">
          <div className="bg-admin-sidebar px-6 py-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">Your team</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">
              Team {result.team.team_number}
              {result.team.name ? ` — ${result.team.name}` : ''}
            </h2>
            {result.team.primary_domain && (
              <p className="mt-1 text-sm text-slate-300">{result.team.primary_domain}</p>
            )}
          </div>
          <div className="p-5 sm:p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Members ({result.members.length})
            </h3>
            <ul className="divide-y divide-slate-100">
              {result.members.map((m, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-3">
                  <span className={`font-medium ${m.is_you ? 'text-gdg-blue' : 'text-slate-900'}`}>
                    {m.name}
                    {m.is_you && <span className="ml-2 text-xs font-semibold text-gdg-blue">(you)</span>}
                    {m.is_anchor && <span className="ml-2 text-xs font-medium text-slate-400">· anchor</span>}
                  </span>
                  {m.role_bucket && (
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${bucketColors[m.role_bucket] || bucketColors.other}`}>
                      {m.role_bucket}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
