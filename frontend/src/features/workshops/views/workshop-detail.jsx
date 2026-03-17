import { useParams, Link } from 'react-router-dom';
import { useWorkshopById } from '../workshop-repository';
import { isRegistrationOpen, isWorkshopFull, getStatusLabel } from '../workshop-service';
import CapacityBadge from '../components/capacity-badge';

export default function WorkshopDetail() {
  const { id } = useParams();
  const { data: workshop, isLoading, error } = useWorkshopById(id);

  if (isLoading) return <div className="loading">Loading workshop...</div>;
  if (error) return <div className="error-message">Workshop not found.</div>;
  if (!workshop) return null;

  const canRegister = isRegistrationOpen(workshop);
  const full = isWorkshopFull(workshop);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Link to="/" style={{ fontSize: 14, color: 'var(--gdg-gray)', marginBottom: 16, display: 'inline-block' }}>
        &larr; Back to Workshops
      </Link>
      <div className="card" style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>{workshop.title}</h1>
          <span className={`badge badge-${workshop.status}`}>
            {getStatusLabel(workshop.status)}
          </span>
        </div>

        <p style={{ color: 'var(--gdg-gray)', lineHeight: 1.8, marginBottom: 24 }}>
          {workshop.description}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--gdg-gray)', marginBottom: 4 }}>Date</div>
            <div style={{ fontWeight: 500 }}>{workshop.date}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--gdg-gray)', marginBottom: 4 }}>Time</div>
            <div style={{ fontWeight: 500 }}>{workshop.time}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--gdg-gray)', marginBottom: 4 }}>Venue</div>
            <div style={{ fontWeight: 500 }}>{workshop.venue}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--gdg-gray)', marginBottom: 4 }}>Capacity</div>
            <CapacityBadge workshop={workshop} />
          </div>
        </div>

        {canRegister && (
          <Link to={`/register/${workshop.id}`} className="btn btn-primary" style={{ width: '100%' }}>
            Register for this Workshop
          </Link>
        )}
        {full && workshop.status === 'open' && (
          <div style={{ textAlign: 'center', padding: 16, background: '#FCE8E6', borderRadius: 8, color: 'var(--gdg-red)', fontWeight: 500 }}>
            This workshop is at full capacity
          </div>
        )}
        {workshop.status === 'closed' && (
          <div style={{ textAlign: 'center', padding: 16, background: 'var(--gdg-light-gray)', borderRadius: 8, color: 'var(--gdg-gray)', fontWeight: 500 }}>
            Registration is closed
          </div>
        )}
      </div>
    </div>
  );
}
