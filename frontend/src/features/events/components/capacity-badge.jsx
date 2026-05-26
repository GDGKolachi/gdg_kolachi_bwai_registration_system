import { getCapacityPercentage, isEventFull } from '../event-service';

export default function CapacityBadge({ event }) {
  const percentage = getCapacityPercentage(event);
  const full = isEventFull(event);
  const barColor = full ? 'bg-gdg-red' : percentage > 80 ? 'bg-gdg-yellow' : 'bg-gdg-green';

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500">
        {event.registeredCount}/{event.maxCapacity}
      </span>
    </div>
  );
}
