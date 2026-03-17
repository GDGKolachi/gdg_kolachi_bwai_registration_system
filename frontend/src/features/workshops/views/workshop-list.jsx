import { useWorkshops } from '../workshop-repository';
import WorkshopCard from '../components/workshop-card';

export default function WorkshopList() {
  const { data: workshops, isLoading, error } = useWorkshops();

  if (isLoading) return <div className="loading">Loading workshops...</div>;
  if (error) return <div className="error-message">Failed to load workshops.</div>;

  return (
    <div>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--gdg-blue)' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--gdg-red)' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--gdg-yellow)' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--gdg-green)' }} />
        </div>
        <h1 style={{ fontSize: 36 }}>Build with AI</h1>
        <p style={{ fontSize: 18, maxWidth: 600, margin: '12px auto 0' }}>
          Workshop series by GDG Kolachi. Choose a workshop and register to join.
        </p>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 20,
      }}>
        {workshops?.map(workshop => (
          <WorkshopCard key={workshop.id} workshop={workshop} />
        ))}
      </div>
      {workshops?.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--gdg-gray)' }}>
          No workshops available yet. Check back soon!
        </div>
      )}
    </div>
  );
}
