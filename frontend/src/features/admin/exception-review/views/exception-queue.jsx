import toast from 'react-hot-toast';
import { useAdminExceptions, useApproveException, useRejectException } from '../admin-exception-repository';

const badgeColors = {
  pending: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70',
  approved: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70',
  rejected: 'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70',
};

export default function ExceptionQueue() {
  const { data: exceptions, isLoading } = useAdminExceptions();
  const approveMutation = useApproveException();
  const rejectMutation = useRejectException();

  const handleApprove = async id => {
    try {
      await approveMutation.mutateAsync(id);
      toast.success('Exception approved');
    } catch {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async id => {
    try {
      await rejectMutation.mutateAsync(id);
      toast.success('Exception rejected');
    } catch {
      toast.error('Failed to reject');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue"
            aria-hidden
          />
          Loading exceptions…
        </div>
      </div>
    );
  }

  const pending = exceptions?.filter(e => e.status === 'pending') || [];
  const reviewed = exceptions?.filter(e => e.status !== 'pending') || [];

  return (
    <div>
      <div className="admin-page-head">
        <h1>Exception requests</h1>
        <p>Review and process requests from attendees who want to join an additional workshop.</p>
      </div>

      {pending.length > 0 && (
        <>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-900">
            Pending ({pending.length})
          </h2>
          <div className="mb-10 flex flex-col gap-4">
            {pending.map(ex => (
              <div key={ex.id} className="ui-card p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="font-semibold text-slate-900">{ex.attendee?.name}</div>
                    <div className="text-sm text-slate-600">{ex.attendee?.email}</div>
                    <div className="text-sm text-slate-600">
                      Requesting:{' '}
                      <strong className="text-slate-900">
                        {ex.requestedWorkshop?.title ?? ex.requested_workshop?.title}
                      </strong>
                    </div>
                    <div className="text-sm text-slate-600">
                      Currently registered for:{' '}
                      <strong className="text-slate-900">
                        {ex.currentWorkshop?.title ?? ex.current_workshop?.title ?? 'N/A'}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100">
                      {ex.reason}
                    </div>
                  </div>
                  <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row lg:flex-col lg:items-stretch">
                    <button
                      type="button"
                      className="w-full rounded-xl bg-gdg-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 hover:bg-green-600 sm:w-auto lg:w-full"
                      onClick={() => handleApprove(ex.id)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="ui-btn-danger w-full px-4 py-2.5 sm:w-auto lg:w-full"
                      onClick={() => handleReject(ex.id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {pending.length === 0 && (
        <div className="ui-card-quiet mb-10 py-10 text-center text-sm font-medium text-slate-500">
          No pending exception requests
        </div>
      )}

      {reviewed.length > 0 && (
        <>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-900">Reviewed</h2>
          <div className="ui-table-wrap">
            <table className="ui-table min-w-[40rem]">
              <thead>
                <tr>
                  <th>Attendee</th>
                  <th>Requested workshop</th>
                  <th>Status</th>
                  <th>Reviewed at</th>
                </tr>
              </thead>
              <tbody>
                {reviewed.map(ex => (
                  <tr key={ex.id}>
                    <td className="text-slate-800">
                      {ex.attendee?.name} ({ex.attendee?.email})
                    </td>
                    <td>{ex.requestedWorkshop?.title ?? ex.requested_workshop?.title}</td>
                    <td>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeColors[ex.status] || ''}`}
                      >
                        {ex.status}
                      </span>
                    </td>
                    <td className="text-slate-600">
                      {(ex.reviewed_at ?? ex.reviewedAt)
                        ? new Date(ex.reviewed_at ?? ex.reviewedAt).toLocaleString()
                        : '—'}
                    </td>
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
