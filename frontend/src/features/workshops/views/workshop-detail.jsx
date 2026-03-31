import { useParams, Link } from 'react-router-dom';
import { useWorkshopById } from '../workshop-repository';
import { isRegistrationOpen, isWorkshopFull, getStatusLabel } from '../workshop-service';
import CapacityBadge from '../components/capacity-badge';

const badgeColors = {
  open: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70',
  closed: 'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70',
  upcoming: 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/70',
  completed: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
};

export default function WorkshopDetail() {
  const { id } = useParams();
  const { data: workshop, isLoading, error } = useWorkshopById(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue"
            aria-hidden
          />
          Loading workshop…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-card border-rose-200/80 bg-rose-50/50 px-5 py-4 text-sm font-medium text-rose-800">
        Workshop not found.
      </div>
    );
  }

  if (!workshop) return null;

  const canRegister = isRegistrationOpen(workshop);
  const full = isWorkshopFull(workshop);

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/" className="ui-link-back">
        ← Back to workshops
      </Link>
      <div className="ui-card overflow-hidden p-6 sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{workshop.title}</h1>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badgeColors[workshop.status] || ''}`}
          >
            {getStatusLabel(workshop.status)}
          </span>
        </div>

        <p className="mb-8 leading-relaxed text-slate-600">{workshop.description}</p>

        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
          <div>
            <div className="ui-label">Date</div>
            <div className="text-sm font-semibold text-slate-900">{workshop.date}</div>
          </div>
          <div>
            <div className="ui-label">Time</div>
            <div className="text-sm font-semibold text-slate-900">{workshop.time}</div>
          </div>
          <div>
            <div className="ui-label">Venue</div>
            <div className="text-sm font-semibold text-slate-900">{workshop.venue}</div>
          </div>
          <div>
            <div className="ui-label">Capacity</div>
            <CapacityBadge workshop={workshop} />
          </div>
        </div>

        {canRegister && (
          <Link
            to={`/register/${workshop.id}`}
            className="ui-btn-primary block w-full py-3 text-center no-underline"
          >
            Register for this workshop
          </Link>
        )}
        {full && workshop.status === 'open' && (
          <div className="rounded-xl bg-rose-50 px-4 py-4 text-center text-sm font-semibold text-rose-800 ring-1 ring-rose-200/70">
            This workshop is at full capacity.
          </div>
        )}
        {workshop.status === 'closed' && (
          <div className="rounded-xl bg-slate-100 px-4 py-4 text-center text-sm font-semibold text-slate-700 ring-1 ring-slate-200/80">
            Registration is closed.
          </div>
        )}
      </div>
    </div>
  );
}
