import { useQuery } from '@tanstack/react-query';
import api from '../../../../axios-instance';

export default function DashboardHome() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(res => res.data),
  });

  if (isLoading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of Build with AI workshop registrations</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--gdg-blue)' }}>{stats?.totalWorkshops ?? 0}</div>
          <div className="stat-label">Total Workshops</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--gdg-green)' }}>{stats?.totalRegistrations ?? 0}</div>
          <div className="stat-label">Total Registrations</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--gdg-yellow)' }}>{stats?.pendingExceptions ?? 0}</div>
          <div className="stat-label">Pending Exceptions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--gdg-red)' }}>{stats?.checkedIn ?? 0}</div>
          <div className="stat-label">Checked In</div>
        </div>
      </div>

      {stats?.workshops && (
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Workshops Overview</h2>
          <table>
            <thead>
              <tr>
                <th>Workshop</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Capacity</th>
                <th>Checked In</th>
              </tr>
            </thead>
            <tbody>
              {stats.workshops.map(w => (
                <tr key={w.id}>
                  <td style={{ fontWeight: 500 }}>{w.title}</td>
                  <td><span className={`badge badge-${w.status}`}>{w.status}</span></td>
                  <td>{w.registeredCount}</td>
                  <td>{w.maxCapacity}</td>
                  <td>{w.checkedInCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
