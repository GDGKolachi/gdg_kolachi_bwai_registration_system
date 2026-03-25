import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminWorkshops } from '../../workshop-management/admin-workshop-repository';
import { useAdminRegistrations, useUpdateRegistrationStatus } from '../admin-registration-repository';
import { adminRegistrationApi } from '../admin-registration-api';
import { useDebounce } from '../../../../shared/hooks/useDebounce';

const statusColors = {
  pending: 'bg-yellow-100 text-amber-600',
  shortlisted: 'bg-blue-100 text-gdg-blue',
  attended: 'bg-green-100 text-gdg-green',
  rejected: 'bg-red-100 text-gdg-red',
  confirmed: 'bg-green-100 text-gdg-green',
};

const statusTransitions = {
  pending: ['shortlisted', 'rejected'],
  shortlisted: ['attended'],
};

export default function RegistrationsViewer() {
  const { data: workshops } = useAdminWorkshops();
  const [selectedWorkshop, setSelectedWorkshop] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [definesFilter, setDefinesFilter] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);
  const updateStatusMutation = useUpdateRegistrationStatus();

  const params = {
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    defines_you_best: definesFilter || undefined,
    page,
    limit: 20,
  };

  const { data: result, isLoading } = useAdminRegistrations(selectedWorkshop, params);
  const registrations = result?.data || [];
  const totalPages = result?.totalPages || 1;
  const total = result?.total || 0;

  const handleExport = async () => {
    if (!selectedWorkshop) return;
    try {
      const blob = await adminRegistrationApi.exportCsv(selectedWorkshop);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registrations-${selectedWorkshop}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleStatusChange = async (registrationId, newStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id: registrationId, status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const inputCls = "px-3.5 py-2.5 border border-gdg-border rounded-lg text-sm focus:outline-none focus:border-gdg-blue focus:ring-2 focus:ring-gdg-blue/15";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gdg-dark">Registrations</h1>
        <p className="text-gdg-gray mt-2">View, filter, and manage registrations per workshop</p>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <select className={`${inputCls} max-w-xs`} value={selectedWorkshop} onChange={e => { setSelectedWorkshop(e.target.value); setPage(1); }}>
          <option value="">Select a workshop</option>
          {workshops?.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
        </select>
        <input className={`${inputCls} flex-1 min-w-48`} placeholder="Search by name, email, phone, CNIC..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className={`${inputCls} max-w-36`} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="attended">Attended</option>
          <option value="rejected">Rejected</option>
        </select>
        <select className={`${inputCls} max-w-48`} value={definesFilter} onChange={e => { setDefinesFilter(e.target.value); setPage(1); }}>
          <option value="">All Profiles</option>
          <option value="Student">Student</option>
          <option value="Young Professional">Young Professional</option>
          <option value="Intermediate Expert">Intermediate Expert</option>
          <option value="Senior Expert">Senior Expert</option>
          <option value="Freelancer">Freelancer</option>
          <option value="Other">Other</option>
        </select>
        {selectedWorkshop && (
          <button className="px-6 py-2.5 border-2 border-gdg-border rounded-lg text-sm font-semibold text-gdg-gray hover:border-gdg-blue hover:text-gdg-blue" onClick={handleExport}>Export CSV</button>
        )}
      </div>

      {!selectedWorkshop && (
        <div className="text-center py-16 text-gdg-gray">Select a workshop to view registrations</div>
      )}

      {selectedWorkshop && isLoading && <div className="flex justify-center items-center py-16 text-gdg-gray">Loading...</div>}

      {selectedWorkshop && !isLoading && (
        <>
          <div className="text-sm text-gdg-gray mb-3">Showing {registrations.length} of {total} registrations</div>
          <div className="bg-white rounded-xl border border-gdg-border overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Name</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Email</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Phone</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">CNIC</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Profile</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map(r => {
                  const allowed = statusTransitions[r.status] || [];
                  return (
                    <tr key={r.id} className="hover:bg-gdg-light-gray">
                      <td className="py-3 px-4 border-b border-gdg-border font-medium">{r.attendee?.name}</td>
                      <td className="py-3 px-4 border-b border-gdg-border text-sm">{r.attendee?.email}</td>
                      <td className="py-3 px-4 border-b border-gdg-border text-sm">{r.attendee?.phone}</td>
                      <td className="py-3 px-4 border-b border-gdg-border text-sm">{r.attendee?.cnic}</td>
                      <td className="py-3 px-4 border-b border-gdg-border text-sm">{r.attendee?.defines_you_best || '-'}</td>
                      <td className="py-3 px-4 border-b border-gdg-border">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColors[r.status] || ''}`}>{r.status}</span>
                      </td>
                      <td className="py-3 px-4 border-b border-gdg-border">
                        <div className="flex gap-1.5">
                          {allowed.map(nextStatus => (
                            <button
                              key={nextStatus}
                              onClick={() => handleStatusChange(r.id, nextStatus)}
                              disabled={updateStatusMutation.isPending}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                                nextStatus === 'shortlisted' ? 'bg-gdg-blue text-white hover:bg-blue-600' :
                                nextStatus === 'attended' ? 'bg-gdg-green text-white hover:bg-green-600' :
                                nextStatus === 'rejected' ? 'bg-gdg-red text-white hover:bg-red-600' :
                                'bg-gray-200 text-gray-700'
                              } disabled:opacity-50`}
                            >
                              {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                            </button>
                          ))}
                          {allowed.length === 0 && <span className="text-xs text-gdg-gray">-</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {registrations.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-gdg-gray py-8">No registrations found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-gdg-border rounded-lg text-sm disabled:opacity-40">Previous</button>
              <span className="text-sm text-gdg-gray">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 border border-gdg-border rounded-lg text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
