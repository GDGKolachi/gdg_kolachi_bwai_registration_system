import { useEffect } from 'react';

/** Small centred/bottom-sheet confirmation, same look as the admin logout dialog. */
export default function ConfirmDialog({ title, children, confirmLabel, danger = false, busy = false, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="ui-card w-full max-w-md rounded-b-none rounded-t-2xl p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="ui-btn-secondary w-full sm:w-auto" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className={`${danger ? 'ui-btn-danger' : 'ui-btn-primary'} w-full sm:w-auto`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
