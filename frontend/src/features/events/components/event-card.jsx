import { Link } from 'react-router-dom';
import { getStatusLabel, isRegistrationOpen } from '../event-service';

function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/#{1,6}\s?/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/>\s?/g, '')
    .replace(/[-*+]\s/g, '')
    .replace(/\d+\.\s/g, '');
}

const badgeColors = {
  open: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70',
  registration_open: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70',
  closed: 'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70',
  upcoming: 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/70',
  completed: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
};

const typeColors = {
  workshop: 'bg-blue-50 text-blue-900 ring-1 ring-blue-200/70',
  talks: 'bg-purple-50 text-purple-900 ring-1 ring-purple-200/70',
  'community-lounge': 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70',
  hackathon: 'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70',
};

export default function EventCard({ event }) {
  const canRegister = isRegistrationOpen(event);

  return (
    <div className="group ui-card flex flex-col gap-4 p-6 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-300/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {event.eventTypeName && (
            <span
              className={`mb-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                typeColors[event.eventTypeSlug] || 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80'
              }`}
            >
              {event.eventTypeName}
            </span>
          )}
          <h3 className="text-lg font-semibold leading-snug tracking-tight text-slate-900 group-hover:text-gdg-blue">
            {event.title}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColors[event.status] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}
        >
          {getStatusLabel(event.status)}
        </span>
      </div>
      <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">
        {(() => {
          const plain = stripMarkdown(event.description);
          return plain.length > 150 ? plain.substring(0, 150) + '…' : plain;
        })()}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
        <span>{event.date}</span>
        <span className="text-slate-300">·</span>
        <span>{event.time}</span>
        <span className="text-slate-300">·</span>
        <span className="inline-flex items-center gap-1 truncate">
          {event.venue}
          {event.mapLocation && (
            <a
              href={event.mapLocation.includes('google.com') ? event.mapLocation : `https://www.google.com/maps/search/${encodeURIComponent(event.mapLocation)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gdg-blue hover:text-gdg-blue/80"
              onClick={(e) => e.stopPropagation()}
              title="View on map"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
              </svg>
            </a>
          )}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          to={`/events/${event.id}`}
          className="ui-btn-secondary flex-1 !py-2 text-center no-underline sm:flex-none"
        >
          Details
        </Link>
        {canRegister && (
          <Link
            to={`/register/${event.id}`}
            className="ui-btn-primary flex-1 !py-2 text-center no-underline sm:flex-none"
          >
            Register
          </Link>
        )}
      </div>
    </div>
  );
}
