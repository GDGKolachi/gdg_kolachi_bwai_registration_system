import { useQuery } from '@tanstack/react-query';
import api from '../../../../axios-instance';

const badgeColors = {
  open: 'bg-green-100 text-gdg-green',
  closed: 'bg-red-100 text-gdg-red',
  upcoming: 'bg-blue-100 text-gdg-blue',
  completed: 'bg-gray-100 text-gdg-gray',
};

export default function DashboardHome() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(res => res.data),
  });

  if (isLoading) return <div className="flex justify-center items-center py-16 text-gdg-gray">Loading dashboard...</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gdg-dark">Dashboard</h1>
        <p className="text-gdg-gray mt-2">Overview of Build with AI workshop registrations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-gdg-border">
          <div className="text-3xl font-bold text-gdg-blue">{stats?.totalWorkshops ?? 0}</div>
          <div className="text-sm text-gdg-gray mt-1">Total Workshops</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gdg-border">
          <div className="text-3xl font-bold text-gdg-green">{stats?.totalRegistrations ?? 0}</div>
          <div className="text-sm text-gdg-gray mt-1">Total Registrations</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gdg-border">
          <div className="text-3xl font-bold text-gdg-yellow">{stats?.pendingExceptions ?? 0}</div>
          <div className="text-sm text-gdg-gray mt-1">Pending Exceptions</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gdg-border">
          <div className="text-3xl font-bold text-gdg-red">{stats?.checkedIn ?? 0}</div>
          <div className="text-sm text-gdg-gray mt-1">Checked In</div>
        </div>
      </div>

      {stats?.workshops && (
        <div className="bg-white rounded-xl p-6 border border-gdg-border">
          <h2 className="text-lg font-semibold mb-4">Workshops Overview</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Workshop</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Registered</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Capacity</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Checked In</th>
                </tr>
              </thead>
              <tbody>
                {stats.workshops.map(w => (
                  <tr key={w.id} className="hover:bg-gdg-light-gray">
                    <td className="py-3 px-4 border-b border-gdg-border font-medium">{w.title}</td>
                    <td className="py-3 px-4 border-b border-gdg-border">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badgeColors[w.status] || ''}`}>{w.status}</span>
                    </td>
                    <td className="py-3 px-4 border-b border-gdg-border">{w.registeredCount}</td>
                    <td className="py-3 px-4 border-b border-gdg-border">{w.maxCapacity}</td>
                    <td className="py-3 px-4 border-b border-gdg-border">{w.checkedInCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
