import toast from 'react-hot-toast';
import { useAdminExceptions, useApproveException, useRejectException } from '../admin-exception-repository';

const badgeColors = {
  pending: 'bg-yellow-100 text-amber-600',
  approved: 'bg-green-100 text-gdg-green',
  rejected: 'bg-red-100 text-gdg-red',
};

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

  if (isLoading) return <div className="flex justify-center items-center py-16 text-gdg-gray">Loading exceptions...</div>;

  const pending = exceptions?.filter(e => e.status === 'pending') || [];
  const reviewed = exceptions?.filter(e => e.status !== 'pending') || [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gdg-dark">Exception Requests</h1>
        <p className="text-gdg-gray mt-2">Review and process exception requests from attendees</p>
      </div>

      {pending.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-4">Pending ({pending.length})</h2>
          <div className="flex flex-col gap-3 mb-8">
            {pending.map(ex => (
              <div key={ex.id} className="bg-white rounded-xl p-6 border border-gdg-border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold">{ex.attendee?.name}</div>
                    <div className="text-sm text-gdg-gray">{ex.attendee?.email}</div>
                    <div className="text-sm text-gdg-gray mt-1">
                      Requesting: <strong>{ex.requestedWorkshop?.title ?? ex.requested_workshop?.title}</strong>
                    </div>
                    <div className="text-sm text-gdg-gray">
                      Currently registered for: <strong>{ex.currentWorkshop?.title ?? ex.current_workshop?.title ?? 'N/A'}</strong>
                    </div>
                    <div className="mt-2 p-3 bg-gdg-light-gray rounded-lg text-sm">{ex.reason}</div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button className="px-4 py-1.5 bg-gdg-green text-white rounded-lg text-sm font-semibold hover:bg-green-600" onClick={() => handleApprove(ex.id)}>Approve</button>
                    <button className="px-4 py-1.5 bg-gdg-red text-white rounded-lg text-sm font-semibold hover:bg-red-600" onClick={() => handleReject(ex.id)}>Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {pending.length === 0 && (
        <div className="text-center py-10 text-gdg-gray mb-8">
          No pending exception requests
        </div>
      )}

      {reviewed.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-4">Reviewed</h2>
          <div className="bg-white rounded-xl p-6 border border-gdg-border overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Attendee</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Requested Workshop</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Reviewed At</th>
                </tr>
              </thead>
              <tbody>
                {reviewed.map(ex => (
                  <tr key={ex.id} className="hover:bg-gdg-light-gray">
                    <td className="py-3 px-4 border-b border-gdg-border">{ex.attendee?.name} ({ex.attendee?.email})</td>
                    <td className="py-3 px-4 border-b border-gdg-border">{ex.requestedWorkshop?.title ?? ex.requested_workshop?.title}</td>
                    <td className="py-3 px-4 border-b border-gdg-border">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badgeColors[ex.status] || ''}`}>{ex.status}</span>
                    </td>
                    <td className="py-3 px-4 border-b border-gdg-border text-sm">{(ex.reviewed_at ?? ex.reviewedAt) ? new Date(ex.reviewed_at ?? ex.reviewedAt).toLocaleString() : '-'}</td>
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
