import { useParams, Link } from 'react-router-dom';
import { useEventById } from '../event-repository';
import { isRegistrationOpen, isEventFull, getStatusLabel } from '../event-service';
import MarkdownText from '../components/markdown-text';
import MapEmbed from '../components/map-embed';
import SpeakersList from '../components/speakers-list';

const badgeColors = {
  open: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70',
  registration_open: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70',
  closed: 'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70',
  upcoming: 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/70',
  completed: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
};

export default function EventDetail() {
  const { id } = useParams();
  const { data: event, isLoading, error } = useEventById(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue"
            aria-hidden
          />
          Loading event…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-card border-rose-200/80 bg-rose-50/50 px-5 py-4 text-sm font-medium text-rose-800">
        Event not found.
      </div>
    );
  }

  if (!event) return null;

  const canRegister = isRegistrationOpen(event);
  const full = isEventFull(event);

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/" className="ui-link-back">
        ← Back to events
      </Link>
      <div className="ui-card overflow-hidden p-6 sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {event.eventTypeName && (
              <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                {event.eventTypeName}
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{event.title}</h1>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badgeColors[event.status] || ''}`}
          >
            {getStatusLabel(event.status)}
          </span>
        </div>

        <div className="mb-8">
          <MarkdownText content={event.description} />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
          <div>
            <div className="ui-label">Date</div>
            <div className="text-sm font-semibold text-slate-900">{event.date}</div>
          </div>
          <div>
            <div className="ui-label">Time</div>
            <div className="text-sm font-semibold text-slate-900">{event.time}</div>
          </div>
          <div>
            <div className="ui-label">Venue</div>
            <div className="text-sm font-semibold text-slate-900">{event.venue}</div>
          </div>
        </div>

        {event.eventTypeSlug === 'community-lounge' && (event.tracks?.length > 0 || event.slots?.length > 0) && (
          <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {event.tracks?.length > 0 && (
              <div>
                <div className="ui-label">Tracks</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {event.tracks.map((t) => (
                    <span key={t} className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-900 ring-1 ring-sky-200/70">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {event.slots?.length > 0 && (
              <div>
                <div className="ui-label">Slots</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {event.slots.map((s) => (
                    <span key={s} className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-900 ring-1 ring-violet-200/70">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <MapEmbed mapLocation={event.mapLocation} />

        <SpeakersList speakers={event.speakers} />

        {canRegister && (
          <Link
            to={`/register/${event.id}`}
            className="ui-btn-primary block w-full py-3 text-center no-underline"
          >
            Register for this event
          </Link>
        )}
        {full && (event.status === 'open' || event.status === 'registration_open') && (
          <div className="rounded-xl bg-rose-50 px-4 py-4 text-center text-sm font-semibold text-rose-800 ring-1 ring-rose-200/70">
            This event is at full capacity.
          </div>
        )}
        {event.status === 'closed' && (
          <div className="rounded-xl bg-slate-100 px-4 py-4 text-center text-sm font-semibold text-slate-700 ring-1 ring-slate-200/80">
            Registration is closed.
          </div>
        )}
      </div>
    </div>
  );
}
