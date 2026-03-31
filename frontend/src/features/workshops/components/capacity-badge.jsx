import { getCapacityPercentage, isWorkshopFull } from '../workshop-service';

export default function CapacityBadge({ workshop }) {
  const percentage = getCapacityPercentage(workshop);
  const full = isWorkshopFull(workshop);
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
        {workshop.registeredCount}/{workshop.maxCapacity}
      </span>
    </div>
  );
}
