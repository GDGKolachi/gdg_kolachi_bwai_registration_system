import { Link } from 'react-router-dom';
import { getStatusLabel, isRegistrationOpen } from '../workshop-service';
import CapacityBadge from './capacity-badge';

export default function WorkshopCard({ workshop }) {
  const canRegister = isRegistrationOpen(workshop);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>{workshop.title}</h3>
        <span className={`badge badge-${workshop.status}`}>
          {getStatusLabel(workshop.status)}
        </span>
      </div>
      <p style={{ color: 'var(--gdg-gray)', fontSize: 14, flex: 1 }}>
        {workshop.description?.substring(0, 150)}
        {workshop.description?.length > 150 ? '...' : ''}
      </p>
      <div style={{ fontSize: 13, color: 'var(--gdg-gray)', display: 'flex', gap: 16 }}>
        <span>{workshop.date}</span>
        <span>{workshop.time}</span>
        <span>{workshop.venue}</span>
      </div>
      <CapacityBadge workshop={workshop} />
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Link to={`/workshops/${workshop.id}`} className="btn btn-outline btn-sm">
          Details
        </Link>
        {canRegister && (
          <Link to={`/register/${workshop.id}`} className="btn btn-primary btn-sm">
            Register
          </Link>
        )}
      </div>
    </div>
  );
}
