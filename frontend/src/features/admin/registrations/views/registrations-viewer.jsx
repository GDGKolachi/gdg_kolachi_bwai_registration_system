import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminWorkshops } from '../../workshop-management/admin-workshop-repository';
import { useAdminRegistrations } from '../admin-registration-repository';
import { adminRegistrationApi } from '../admin-registration-api';

export default function RegistrationsViewer() {
  const { data: workshops } = useAdminWorkshops();
  const [selectedWorkshop, setSelectedWorkshop] = useState('');
  const { data: registrations, isLoading } = useAdminRegistrations(selectedWorkshop);
  const [search, setSearch] = useState('');

  const filtered = registrations?.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.attendee?.name?.toLowerCase().includes(s) || r.attendee?.email?.toLowerCase().includes(s);
  });

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

  return (
    <div>
      <div className="page-header">
        <h1>Registrations</h1>
        <p>View and export registrations per workshop</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <select
          className="form-group"
          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gdg-border)', flex: 1, maxWidth: 300 }}
          value={selectedWorkshop}
          onChange={e => setSelectedWorkshop(e.target.value)}
        >
          <option value="">Select a workshop</option>
          {workshops?.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
        </select>
        <input
          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gdg-border)', flex: 1, maxWidth: 300 }}
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {selectedWorkshop && (
          <button className="btn btn-outline" onClick={handleExport}>Export CSV</button>
        )}
      </div>

      {!selectedWorkshop && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--gdg-gray)' }}>
          Select a workshop to view registrations
        </div>
      )}

      {selectedWorkshop && isLoading && <div className="loading">Loading...</div>}

      {selectedWorkshop && !isLoading && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Organization</th>
                <th>Status</th>
                <th>Checked In</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.attendee?.name}</td>
                  <td>{r.attendee?.email}</td>
                  <td>{r.attendee?.phone}</td>
                  <td>{r.attendee?.university_org ?? r.attendee?.universityOrg}</td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  <td>{r.checked_in ?? r.checkedIn ? 'Yes' : 'No'}</td>
                </tr>
              ))}
              {filtered?.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gdg-gray)', padding: 32 }}>No registrations found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
