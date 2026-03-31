const styles = {
  pending: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70',
  approved: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70',
  rejected: 'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70',
};

export default function ExceptionStatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[s] || 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80'}`}
    >
      {status}
    </span>
  );
}
