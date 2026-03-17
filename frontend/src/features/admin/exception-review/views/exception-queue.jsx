import toast from 'react-hot-toast';
import { useAdminExceptions, useApproveException, useRejectException } from '../admin-exception-repository';

export default function ExceptionQueue() {
  const { data: exceptions, isLoading } = useAdminExceptions();
  const approveMutation = useApproveException();
  const rejectMutation = useRejectException();

  const handleApprove = async (id) => {
    try {
      await approveMutation.mutateAsync(id);
      toast.success('Exception approved');
    } catch {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectMutation.mutateAsync(id);
      toast.success('Exception rejected');
    } catch {
      toast.error('Failed to reject');
    }
  };

  if (isLoading) return <div className="loading">Loading exceptions...</div>;

  const pending = exceptions?.filter(e => e.status === 'pending') || [];
  const reviewed = exceptions?.filter(e => e.status !== 'pending') || [];

  return (
    <div>
      <div className="page-header">
        <h1>Exception Requests</h1>
        <p>Review and process exception requests from attendees</p>
      </div>

      {pending.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Pending ({pending.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {pending.map(ex => (
              <div key={ex.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{ex.attendee?.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--gdg-gray)' }}>{ex.attendee?.email}</div>
                    <div style={{ fontSize: 13, color: 'var(--gdg-gray)', marginTop: 4 }}>
                      Requesting: <strong>{ex.requestedWorkshop?.title ?? ex.requested_workshop?.title}</strong>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--gdg-gray)', marginTop: 2 }}>
                      Currently registered for: <strong>{ex.currentWorkshop?.title ?? ex.current_workshop?.title ?? 'N/A'}</strong>
                    </div>
                    <div style={{ marginTop: 8, padding: 12, background: 'var(--gdg-light-gray)', borderRadius: 8, fontSize: 14 }}>
                      {ex.reason}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                    <button className="btn btn-success btn-sm" onClick={() => handleApprove(ex.id)}>Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReject(ex.id)}>Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {pending.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--gdg-gray)', marginBottom: 32 }}>
          No pending exception requests
        </div>
      )}

      {reviewed.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Reviewed</h2>
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Attendee</th>
                  <th>Requested Workshop</th>
                  <th>Status</th>
                  <th>Reviewed At</th>
                </tr>
              </thead>
              <tbody>
                {reviewed.map(ex => (
                  <tr key={ex.id}>
                    <td>{ex.attendee?.name} ({ex.attendee?.email})</td>
                    <td>{ex.requestedWorkshop?.title ?? ex.requested_workshop?.title}</td>
                    <td><span className={`badge badge-${ex.status}`}>{ex.status}</span></td>
                    <td style={{ fontSize: 13 }}>{ex.reviewed_at ?? ex.reviewedAt ? new Date(ex.reviewed_at ?? ex.reviewedAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
