import { Link } from 'react-router-dom';
import { getStatusLabel, isRegistrationOpen } from '../workshop-service';
import CapacityBadge from './capacity-badge';

const badgeColors = {
  open: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70',
  closed: 'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70',
  upcoming: 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/70',
  completed: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
};

export default function WorkshopCard({ workshop }) {
  const canRegister = isRegistrationOpen(workshop);

  return (
    <div className="group ui-card flex flex-col gap-4 p-6 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-300/40">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-snug tracking-tight text-slate-900 group-hover:text-gdg-blue">
          {workshop.title}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColors[workshop.status] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}
        >
          {getStatusLabel(workshop.status)}
        </span>
      </div>
      <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">
        {workshop.description?.substring(0, 150)}
        {workshop.description?.length > 150 ? '…' : ''}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
        <span>{workshop.date}</span>
        <span className="text-slate-300">·</span>
        <span>{workshop.time}</span>
        <span className="text-slate-300">·</span>
        <span className="truncate">{workshop.venue}</span>
      </div>
      <CapacityBadge workshop={workshop} />
      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          to={`/workshops/${workshop.id}`}
          className="ui-btn-secondary flex-1 !py-2 text-center no-underline sm:flex-none"
        >
          Details
        </Link>
        {canRegister && (
          <Link
            to={`/register/${workshop.id}`}
            className="ui-btn-primary flex-1 !py-2 text-center no-underline sm:flex-none"
          >
            Register
          </Link>
        )}
      </div>
    </div>
  );
}
