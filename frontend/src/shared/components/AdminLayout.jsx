import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { BRAND_NAME, BRAND_TAGLINE_ADMIN } from '../constants/branding';

const navItems = [
  { path: '/admin', label: 'Dashboard', exact: true },
  { path: '/admin/events', label: 'Events' },
  { path: '/admin/event-types', label: 'Event Types' },
  { path: '/admin/registrations', label: 'Registrations' },
  { path: '/admin/exceptions', label: 'Exceptions' },
  { path: '/admin/checkin', label: 'Check-in' },
  { path: '/admin/hackathon-checkin', label: 'Hackathon Check-in' },
  { path: '/admin/qr-scan', label: 'QR Scan' },
  { path: '/admin/users', label: 'Users' },
];

function MenuIcon({ open, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      className={`shrink-0 ${className}`} aria-hidden>
      {open
        ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
    </svg>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const token = localStorage.getItem('admin_token');
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  // Mobile drawer
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Desktop sidebar collapsed/expanded
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  // Close mobile drawer on route change
  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  // Keyboard handler for logout dialog
  useEffect(() => {
    if (!logoutConfirmOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setLogoutConfirmOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [logoutConfirmOpen]);

  // Lock body scroll when mobile drawer or dialog is open
  useEffect(() => {
    document.body.style.overflow = (mobileNavOpen || logoutConfirmOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileNavOpen, logoutConfirmOpen]);

  if (!token) return <Navigate to="/admin/login" replace />;

  const performLogout = () => {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin/login';
  };

  return (
    /* Root: always fills the viewport exactly, no document scroll */
    <div className="flex h-dvh overflow-hidden bg-slate-100/90">

      {/* ── Mobile drawer overlay ── */}
      {mobileNavOpen && (
        <button type="button" aria-label="Close menu"
          className="fixed inset-0 z-40 cursor-default bg-slate-900/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)} />
      )}

      {/* ══════════════════ SIDEBAR ══════════════════
          Mobile  : off-canvas drawer (overlay, z-50)
          Desktop : collapsible panel (part of flex row)
          Sidebar itself scrolls independently — it never causes
          the right-hand content pane to scroll.
      */}
      <aside id="admin-nav" className={[
        // shared
        'flex flex-col border-r border-slate-800/50 bg-admin-sidebar text-white',
        'overflow-hidden transition-[width] duration-200 ease-out',
        // mobile: full-height overlay drawer, not part of flex row
        'fixed inset-y-0 left-0 z-50 h-full w-[min(17rem,88vw)]',
        'lg:static lg:z-auto lg:h-full lg:shrink-0',
        // mobile open/close via translate; desktop open/close via width
        mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        desktopSidebarOpen ? 'lg:w-60' : 'lg:w-0 lg:border-r-0',
      ].join(' ')}>

        <div className="flex shrink-0 items-start justify-between gap-2 px-5 pt-6 pb-2">
          <div className="min-w-0 flex-1">
            <BrandLogo className="mb-3 h-9 w-auto max-w-[9rem] drop-shadow-sm sm:h-10 sm:max-w-[9.5rem]" />
            <div className="text-sm font-bold tracking-tight text-white">{BRAND_NAME}</div>
            <div className="text-xs font-medium text-slate-400">{BRAND_TAGLINE_ADMIN}</div>
          </div>
          {/* Close button — mobile only inside drawer */}
          <button type="button" aria-label="Close navigation"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setMobileNavOpen(false)}>
            <MenuIcon open className="h-6 w-6" />
          </button>
        </div>

        {/* Nav links — this section scrolls if items overflow */}
        <nav className="mt-2 flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
          {navItems.map(item => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path}
                onClick={() => setMobileNavOpen(false)}
                className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium no-underline transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-admin-sidebar-hover hover:text-white'
                }`}>
                {isActive && (
                  <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-gdg-blue align-middle" />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 px-3 py-4">
          <button type="button" onClick={() => setLogoutConfirmOpen(true)}
            className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white whitespace-nowrap">
            Log out
          </button>
        </div>
      </aside>

      {/* ══════════════════ RIGHT PANE ══════════════════
          Takes all remaining width. Header is sticky inside this
          flex column; main is the ONLY scrollable region.
      */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Top header — always visible at every breakpoint */}
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200/90 bg-white/95 px-3 py-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
          {/* Mobile: opens drawer | Desktop: toggles sidebar panel */}
          <button type="button"
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gdg-blue/40"
            aria-expanded={mobileNavOpen || desktopSidebarOpen}
            aria-controls="admin-nav"
            aria-label="Toggle navigation menu"
            onClick={() => {
              if (window.innerWidth >= 1024) {
                setDesktopSidebarOpen((v) => !v);
              } else {
                setMobileNavOpen((v) => !v);
              }
            }}>
            <MenuIcon open={false} className="h-6 w-6" />
          </button>

          {/* Brand — shown on mobile always; on desktop only when sidebar is collapsed */}
          <div className={`min-w-0 flex-1 pr-2 lg:transition-opacity ${desktopSidebarOpen ? 'lg:opacity-0 lg:pointer-events-none' : 'lg:opacity-100'}`}>
            <p className="truncate text-sm font-bold text-slate-900">{BRAND_NAME}</p>
            <p className="truncate text-xs text-slate-500">{BRAND_TAGLINE_ADMIN}</p>
          </div>
        </header>

        {/* Scrollable content — ONLY this area scrolls */}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-6 lg:p-8 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Logout confirmation dialog */}
      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setLogoutConfirmOpen(false)} role="presentation">
          <div className="ui-card w-full max-w-md rounded-b-none rounded-t-2xl p-6 shadow-2xl sm:rounded-2xl sm:p-8"
            onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true"
            aria-labelledby="logout-dialog-title" aria-describedby="logout-dialog-desc">
            <BrandLogo className="mx-auto mb-4 h-9 w-auto max-w-[140px]" />
            <h2 id="logout-dialog-title" className="text-center text-lg font-bold tracking-tight text-slate-900">
              Log out?
            </h2>
            <p id="logout-dialog-desc" className="mt-2 text-center text-sm leading-relaxed text-slate-600">
              You will need to sign in again to access the admin dashboard.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="ui-btn-secondary w-full sm:w-auto"
                onClick={() => setLogoutConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className="ui-btn-danger w-full sm:w-auto" onClick={performLogout}>
                Log out
              </button>
            </div>
            <div className="pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-0" aria-hidden />
          </div>
        </div>
      )}
    </div>
  );
}
