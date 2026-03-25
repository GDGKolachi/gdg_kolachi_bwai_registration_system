import { getCapacityPercentage, isWorkshopFull } from '../workshop-service';

export default function CapacityBadge({ workshop }) {
  const percentage = getCapacityPercentage(workshop);
  const full = isWorkshopFull(workshop);
  const barColor = full ? 'bg-gdg-red' : percentage > 80 ? 'bg-gdg-yellow' : 'bg-gdg-green';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gdg-light-gray rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className="text-xs text-gdg-gray whitespace-nowrap">
        {workshop.registeredCount}/{workshop.maxCapacity}
      </span>
    </div>
  );
}
