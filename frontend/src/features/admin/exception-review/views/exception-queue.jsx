import { useState } from 'react';
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

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkPending, setBulkPending] = useState(false);

  const pending = exceptions?.filter(e => e.status === 'pending') || [];
  const reviewed = exceptions?.filter(e => e.status !== 'pending') || [];

  const allSelected = pending.length > 0 && pending.every(e => selectedIds.has(e.id));
  const someSelected = pending.some(e => selectedIds.has(e.id)) && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pending.map(e => e.id)));
    }
  };

  const toggleOne = id => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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

  const handleBulk = async action => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const mutate = action === 'approve' ? approveMutation.mutateAsync : rejectMutation.mutateAsync;
    setBulkPending(true);
    try {
      const results = await Promise.allSettled(ids.map(id => mutate(id)));
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      if (succeeded > 0) {
        toast.success(`${succeeded} ${action === 'approve' ? 'approved' : 'rejected'}`);
      }
      if (failed > 0) {
        toast.error(`${failed} could not be ${action === 'approve' ? 'approved' : 'rejected'}`);
      }
      setSelectedIds(new Set());
    } finally {
      setBulkPending(false);
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

  const rowActionsDisabled =
    approveMutation.isPending || rejectMutation.isPending || bulkPending;

  return (
    <div>
      <div className="admin-page-head">
        <h1>Exception requests</h1>
        <p>Review and process requests from attendees who want to join an additional workshop.</p>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-admin-sidebar px-3 py-3 text-white shadow-lg shadow-slate-900/15 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{selectedIds.size} selected</span>
            <span className="hidden text-slate-500 sm:inline">|</span>
            <span className="text-xs text-slate-400">Action:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleBulk('approve')}
              disabled={bulkPending}
              className="rounded-lg bg-gdg-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-50"
            >
              Approve selected
            </button>
            <button
              type="button"
              onClick={() => handleBulk('reject')}
              disabled={bulkPending}
              className="rounded-lg bg-gdg-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
            >
              Reject selected
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-left text-xs text-slate-400 hover:text-white sm:ml-auto sm:text-right"
          >
            Deselect all
          </button>
        </div>
      )}

      {pending.length > 0 ? (
        <>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-900">
            Pending ({pending.length})
          </h2>
          <div className="ui-table-wrap mb-10">
            <table className="w-full min-w-[56rem] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/95">
                  <th className="w-10 border-b border-slate-200 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 cursor-pointer rounded accent-gdg-blue"
                    />
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    #
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Name
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Email
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Requesting
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Currently registered
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Reason
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pending.map((ex, idx) => {
                  const isSelected = selectedIds.has(ex.id);
                  const requested = ex.requestedWorkshop?.title ?? ex.requested_workshop?.title;
                  const current = ex.currentWorkshop?.title ?? ex.current_workshop?.title ?? 'N/A';
                  return (
                    <tr
                      key={ex.id}
                      className={`transition-colors hover:bg-slate-50/90 ${isSelected ? 'bg-sky-50/70' : ''}`}
                    >
                      <td className="border-b border-slate-100 px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(ex.id)}
                          className="h-4 w-4 cursor-pointer rounded accent-gdg-blue"
                        />
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2.5 text-slate-600">
                        {idx + 1}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2.5 font-medium">
                        {ex.attendee?.name || '—'}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2.5">
                        {ex.attendee?.email || '—'}
                      </td>
                      <td
                        className="max-w-[200px] truncate border-b border-slate-100 px-3 py-2.5"
                        title={requested}
                      >
                        {requested || '—'}
                      </td>
                      <td
                        className="max-w-[200px] truncate border-b border-slate-100 px-3 py-2.5"
                        title={current}
                      >
                        {current}
                      </td>
                      <td className="max-w-[260px] border-b border-slate-100 px-3 py-2.5">
                        <span className="block truncate" title={ex.reason}>
                          {ex.reason || '—'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2.5 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            className="rounded-lg bg-gdg-green px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-50"
                            onClick={() => handleApprove(ex.id)}
                            disabled={rowActionsDisabled}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="rounded-lg bg-gdg-red px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                            onClick={() => handleReject(ex.id)}
                            disabled={rowActionsDisabled}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
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
