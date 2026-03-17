import { getCapacityPercentage, isWorkshopFull } from '../workshop-service';

export default function CapacityBadge({ workshop }) {
  const percentage = getCapacityPercentage(workshop);
  const full = isWorkshopFull(workshop);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1,
        height: 6,
        background: 'var(--gdg-light-gray)',
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.min(percentage, 100)}%`,
          height: '100%',
          background: full ? 'var(--gdg-red)' : percentage > 80 ? 'var(--gdg-yellow)' : 'var(--gdg-green)',
          borderRadius: 3,
          transition: 'width 0.3s',
        }} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--gdg-gray)', whiteSpace: 'nowrap' }}>
        {workshop.registeredCount}/{workshop.maxCapacity}
      </span>
    </div>
  );
}
