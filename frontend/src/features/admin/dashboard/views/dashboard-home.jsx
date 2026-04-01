import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../../../axios-instance';
import { BRAND_SERIES } from '../../../../shared/constants/branding';

const badgeColors = {
  open: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70',
  closed: 'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70',
  upcoming: 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/70',
  completed: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
};

function IconWorkshops(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

function IconUsers(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function IconInbox(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293L7.293 13.293A1 1 0 006.586 13H4"
      />
    </svg>
  );
}

function IconCheck(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconChevron(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

const statAccent = {
  blue: {
    iconWrap: 'bg-sky-50 text-gdg-blue ring-1 ring-sky-100',
    glow: 'bg-gdg-blue/10',
  },
  green: {
    iconWrap: 'bg-emerald-50 text-gdg-green ring-1 ring-emerald-100',
    glow: 'bg-gdg-green/10',
  },
  amber: {
    iconWrap: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
    glow: 'bg-gdg-yellow/15',
  },
  red: {
    iconWrap: 'bg-rose-50 text-gdg-red ring-1 ring-rose-100',
    glow: 'bg-gdg-red/10',
  },
};

function StatCard({ label, value, hint, icon: Icon, accent }) {
  const a = statAccent[accent];
  return (
    <div className="ui-card group relative overflow-hidden p-4 transition-shadow duration-200 hover:shadow-md hover:shadow-slate-200/60 sm:p-5">
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full transition-transform duration-300 group-hover:scale-110 ${a.glow}`}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
          {hint ? <p className="mt-2 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
        </div>
        <div className={`shrink-0 rounded-xl p-2.5 ${a.iconWrap}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function FillBar({ pct }) {
  const safe = Math.min(100, Math.max(0, pct));
  const color =
    safe >= 100 ? 'bg-gdg-red' : safe >= 85 ? 'bg-gdg-yellow' : safe >= 50 ? 'bg-gdg-blue' : 'bg-gdg-green';
  return (
    <div className="flex min-w-[4.5rem] items-center gap-2">
      <div className="h-2 w-full max-w-[5rem] overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${safe}%` }} />
      </div>
      <span className="tabular-nums text-xs font-semibold text-slate-600">{Math.round(safe)}%</span>
    </div>
  );
}

function QuickAction({ to, title, description, icon: Icon }) {
  return (
    <Link
      to={to}
      className="ui-card group flex items-start gap-3 p-4 no-underline transition-all hover:-translate-y-0.5 hover:border-gdg-blue/25 hover:shadow-md hover:shadow-slate-200/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gdg-blue/35 focus-visible:ring-offset-2 sm:items-center sm:gap-4"
    >
      <div className="rounded-xl bg-slate-50 p-3 text-slate-600 ring-1 ring-slate-100 transition-colors group-hover:bg-sky-50 group-hover:text-gdg-blue group-hover:ring-sky-100">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <IconChevron className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-gdg-blue" />
    </Link>
  );
}

export default function DashboardHome() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(res => res.data),
  });

  const workshopList = stats?.workshops ?? [];

  const insights = useMemo(() => {
    const totalCapacity = workshopList.reduce((sum, w) => sum + (w.maxCapacity ?? 0), 0);
    const totalRegs = stats?.totalRegistrations ?? 0;
    const fillPct = totalCapacity > 0 ? Math.min(100, Math.round((totalRegs / totalCapacity) * 100)) : 0;
    const openForRegistration = workshopList.filter(w => w.status === 'open').length;
    let checkinOfRegistered = 0;
    if (totalRegs > 0 && stats?.checkedIn != null) {
      checkinOfRegistered = Math.min(100, Math.round((stats.checkedIn / totalRegs) * 100));
    }
    return { totalCapacity, fillPct, openForRegistration, checkinOfRegistered };
  }, [workshopList, stats?.totalRegistrations, stats?.checkedIn]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue"
            aria-hidden
          />
          Loading dashboard…
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-head flex flex-col gap-6 border-b border-slate-200/80 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{BRAND_SERIES}</p>
          <h1>Dashboard</h1>
          <p>
            Registrations, exceptions, and check-ins across your workshops. Use the shortcuts below to jump into
            common tasks.
          </p>
        </div>
        <div className="ui-card-quiet shrink-0 px-5 py-4 sm:max-w-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Capacity snapshot</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{insights.fillPct}%</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Overall seat fill across all workshops
            {insights.totalCapacity > 0 ? (
              <>
                {' '}
                ({stats?.totalRegistrations ?? 0} / {insights.totalCapacity} seats)
              </>
            ) : null}
            .{' '}
            <span className="font-medium text-slate-800">{insights.openForRegistration}</span> open for registration.
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          to="/admin/workshops"
          title="Workshops"
          description="Create sessions, capacity, and status"
          icon={IconWorkshops}
        />
        <QuickAction
          to="/admin/registrations"
          title="Registrations"
          description="Filter, shortlist, and export CSV"
          icon={IconUsers}
        />
        <QuickAction
          to="/admin/exceptions"
          title="Exceptions"
          description="Approve or reject extra-workshop requests"
          icon={IconInbox}
        />
        <QuickAction
          to="/admin/checkin"
          title="Check-in"
          description="Search attendees on the event day"
          icon={IconCheck}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total workshops"
          value={stats?.totalWorkshops ?? 0}
          hint={`${insights.openForRegistration} open for registration`}
          icon={IconWorkshops}
          accent="blue"
        />
        <StatCard
          label="Total registrations"
          value={stats?.totalRegistrations ?? 0}
          hint={
            insights.totalCapacity > 0
              ? `${insights.fillPct}% of combined capacity`
              : 'No capacity configured yet'
          }
          icon={IconUsers}
          accent="green"
        />
        <StatCard
          label="Pending exceptions"
          value={stats?.pendingExceptions ?? 0}
          hint={stats?.pendingExceptions ? 'Awaiting review' : 'Queue is clear'}
          icon={IconInbox}
          accent="amber"
        />
        <StatCard
          label="Checked in"
          value={stats?.checkedIn ?? 0}
          hint={
            stats?.totalRegistrations
              ? `${insights.checkinOfRegistered}% of registrations`
              : 'No registrations yet'
          }
          icon={IconCheck}
          accent="red"
        />
      </div>

      {workshopList.length > 0 ? (
        <div className="ui-card overflow-hidden">
          <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Workshops overview</h2>
              <p className="mt-0.5 text-xs text-slate-500">Registration fill and check-in progress per session</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="ui-table min-w-[44rem]">
              <thead>
                <tr>
                  <th>Workshop</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Capacity</th>
                  <th>Fill</th>
                  <th>Checked in</th>
                </tr>
              </thead>
              <tbody>
                {workshopList.map(w => {
                  const cap = w.maxCapacity ?? 0;
                  const reg = w.registeredCount ?? 0;
                  const fillPct = cap > 0 ? (reg / cap) * 100 : 0;
                  const checked = w.checkedInCount ?? 0;
                  const checkinPct = reg > 0 ? Math.round((checked / reg) * 100) : 0;
                  return (
                    <tr key={w.id}>
                      <td className="max-w-[14rem]">
                        <span className="font-semibold text-slate-900">{w.title}</span>
                      </td>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeColors[w.status] || ''}`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="tabular-nums font-medium">{reg}</td>
                      <td className="tabular-nums text-slate-600">{cap}</td>
                      <td>{cap > 0 ? <FillBar pct={fillPct} /> : <span className="text-xs text-slate-400">—</span>}</td>
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <span className="tabular-nums font-medium text-slate-800">{checked}</span>
                          {reg > 0 ? (
                            <span className="text-xs tabular-nums text-slate-500">{checkinPct}% of registered</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="ui-card-quiet flex flex-col items-center px-6 py-14 text-center">
          <IconWorkshops className="mb-3 h-10 w-10 text-slate-400" />
          <p className="font-semibold text-slate-800">No workshops yet</p>
          <p className="mt-1 max-w-sm text-sm text-slate-600">
            Create your first workshop to start accepting registrations.
          </p>
          <Link
            to="/admin/workshops"
            className="ui-btn-primary mt-5 no-underline"
          >
            Go to workshops
          </Link>
        </div>
      )}
    </div>
  );
}
