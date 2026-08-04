import { STATUS_COLORS, STATUS_LABELS } from '../../../../shared/constants/registration-status';

function StatusCounts({ counts }) {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  if (entries.length === 0) return <span className="text-slate-400">—</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {entries.map(([status, n]) => (
        <span
          key={status}
          className={`inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
            STATUS_COLORS[status] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80'
          }`}
        >
          {n} {STATUS_LABELS[status] ?? status}
        </span>
      ))}
    </span>
  );
}

/**
 * One row per team instead of one per registrant. Selecting a team selects
 * every one of its members underneath, so the existing bulk actions and CSV
 * export keep working without knowing teams exist.
 */
export default function TeamsGrid({
  rows,
  densityCellCls,
  stickyHeadCls,
  isTeamSelected,
  onToggleTeam,
  onToggleAll,
  allSelected,
  someSelected,
  openTeamId,
  onOpenTeam,
}) {
  return (
    <div className="ui-table-wrap max-h-[calc(100dvh-15rem)] overflow-y-auto">
      <table className="w-full min-w-[52rem] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className={`${stickyHeadCls} left-0 z-30 w-10 bg-slate-50 px-3`}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={onToggleAll}
                className="h-4 w-4 cursor-pointer rounded accent-gdg-blue"
                aria-label="Select all teams"
              />
            </th>
            {['Team', 'Captain', 'Members', 'University / Org', 'Domain', 'Status', 'Origin'].map((label, i) => (
              <th
                key={label}
                className={`${stickyHeadCls} whitespace-nowrap bg-slate-50 px-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                  i === 0 ? 'left-10 z-30' : 'z-20'
                }`}
              >
                {label}
              </th>
            ))}
            <th className={`${stickyHeadCls} z-20 w-10 bg-slate-50 px-3`}>
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isSelected = isTeamSelected(row);
            const isActive = openTeamId === row.id;
            const rowBg = isActive ? 'bg-sky-100/70' : isSelected ? 'bg-sky-50' : 'bg-white';
            return (
              <tr
                key={row.id}
                onClick={() => onOpenTeam(idx)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenTeam(idx);
                  }
                }}
                tabIndex={0}
                aria-selected={isActive}
                className={`group cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gdg-blue ${rowBg} ${isActive ? '' : 'hover:bg-slate-50'}`}
              >
                <td
                  onClick={e => e.stopPropagation()}
                  className={`sticky left-0 z-10 border-b border-slate-100 px-3 ${densityCellCls} ${rowBg} ${isActive ? '' : 'group-hover:bg-slate-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleTeam(row)}
                    className="h-4 w-4 cursor-pointer rounded accent-gdg-blue"
                    aria-label={`Select team ${row.label}`}
                  />
                </td>

                <td
                  className={`sticky left-10 z-10 whitespace-nowrap border-b border-slate-100 px-3 font-medium text-slate-900 ${densityCellCls} ${rowBg} ${isActive ? '' : 'group-hover:bg-slate-50'}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="truncate">{row.label || '—'}</span>
                    {row.lockedAt && (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[0.65rem] font-semibold text-emerald-800 ring-1 ring-emerald-200/70">
                        Locked
                      </span>
                    )}
                  </span>
                </td>

                <td className={`whitespace-nowrap border-b border-slate-100 px-3 ${densityCellCls}`}>
                  {row.captainName || <span className="text-slate-400">No captain</span>}
                </td>

                <td className={`whitespace-nowrap border-b border-slate-100 px-3 ${densityCellCls}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="tabular-nums">{row.memberCount}</span>
                    {row.belowMinimum && (
                      <span
                        className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-900 ring-1 ring-amber-200/70"
                        title="Below the minimum team size"
                      >
                        Short
                      </span>
                    )}
                  </span>
                </td>

                <td
                  className={`max-w-[180px] truncate border-b border-slate-100 px-3 ${densityCellCls}`}
                  title={row.org || undefined}
                >
                  {row.org || '—'}
                </td>

                <td
                  className={`max-w-[200px] truncate border-b border-slate-100 px-3 ${densityCellCls}`}
                  title={row.domain || undefined}
                >
                  {row.domain || '—'}
                </td>

                <td className={`border-b border-slate-100 px-3 ${densityCellCls}`}>
                  <StatusCounts counts={row.statusCounts} />
                </td>

                <td className={`whitespace-nowrap border-b border-slate-100 px-3 text-xs text-slate-500 ${densityCellCls}`}>
                  {row.origin === 'self_registered' ? 'Self-registered' : 'Auto-formed'}
                </td>

                <td className={`border-b border-slate-100 px-3 ${densityCellCls}`}>
                  <span
                    className="inline-flex text-slate-300 transition-colors group-hover:text-gdg-blue group-focus-visible:text-gdg-blue"
                    title="View full team"
                    aria-hidden
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="py-8 text-center text-sm text-slate-500">
                No teams match these filters
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
