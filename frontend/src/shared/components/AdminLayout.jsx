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

function MenuIcon({ open, className = '', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={`shrink-0 ${className}`.trim()}
      aria-hidden
      {...props}
    >
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const token = localStorage.getItem('admin_token');
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!logoutConfirmOpen) return;
    const onKeyDown = e => {
      if (e.key === 'Escape') setLogoutConfirmOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [logoutConfirmOpen]);

  useEffect(() => {
    const lockScroll = mobileNavOpen || logoutConfirmOpen;
    if (lockScroll) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen, logoutConfirmOpen]);

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  const performLogout = () => {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin/login';
  };

  return (
    <div
      className={
        'flex flex-col overflow-hidden bg-slate-100/90 ' +
        /* Mobile: lock to viewport so <main> is the vertical scroll container */
        'h-dvh max-h-dvh min-h-0 ' +
        /* Desktop: grow with content; document scrolls naturally */
        'lg:h-auto lg:max-h-none lg:min-h-screen lg:flex-row lg:overflow-visible'
      }
    >
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-slate-900/50 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        id="admin-nav"
        className={
          `flex min-h-dvh w-[min(17rem,88vw)] flex-col border-r border-slate-800/50 bg-admin-sidebar py-6 text-white ` +
          `fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out ` +
          `lg:static lg:z-auto lg:min-h-screen lg:w-60 lg:shrink-0 lg:translate-x-0 ` +
          (mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
        }
      >
        <div className="flex items-start justify-between gap-2 px-5 lg:block">
          <div className="min-w-0 flex-1">
            <BrandLogo className="mb-3 h-9 w-auto max-w-[9rem] drop-shadow-sm sm:h-10 sm:max-w-[9.5rem]" />
            <div className="text-sm font-bold tracking-tight text-white">{BRAND_NAME}</div>
            <div className="text-xs font-medium text-slate-400">{BRAND_TAGLINE_ADMIN}</div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <MenuIcon open className="h-6 w-6" />
          </button>
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4">
          {navItems.map(item => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileNavOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium no-underline transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-admin-sidebar-hover hover:text-white'
                }`}
              >
                {isActive && (
                  <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-gdg-blue align-middle" />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-3 pt-4">
          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
            className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col lg:h-auto lg:min-h-screen">
        <header className="sticky top-0 z-30 flex shrink-0 items-center gap-3 border-b border-slate-200/90 bg-white/95 px-3 py-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/80 lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gdg-blue/40"
            onClick={() => setMobileNavOpen(true)}
            aria-expanded={mobileNavOpen}
            aria-controls="admin-nav"
            aria-label="Open navigation menu"
          >
            <MenuIcon open={false} className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1 pr-2">
            <p className="truncate text-sm font-bold text-slate-900">{BRAND_NAME}</p>
            <p className="truncate text-xs text-slate-500">{BRAND_TAGLINE_ADMIN}</p>
          </div>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-auto px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] sm:px-5 sm:py-6 lg:overflow-y-visible lg:overflow-x-visible lg:p-8 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {logoutConfirmOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setLogoutConfirmOpen(false)}
          role="presentation"
        >
          <div
            className="ui-card w-full max-w-md rounded-b-none rounded-t-2xl p-6 shadow-2xl sm:rounded-2xl sm:p-8"
            onClick={e => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-desc"
          >
            <BrandLogo className="mx-auto mb-4 h-9 w-auto max-w-[140px]" />
            <h2 id="logout-dialog-title" className="text-center text-lg font-bold tracking-tight text-slate-900">
              Log out?
            </h2>
            <p
              id="logout-dialog-desc"
              className="mt-2 text-center text-sm leading-relaxed text-slate-600"
            >
              You will need to sign in again to access the admin dashboard.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="ui-btn-secondary w-full sm:w-auto"
                onClick={() => setLogoutConfirmOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className="ui-btn-danger w-full sm:w-auto" onClick={performLogout}>
                Log out
              </button>
            </div>
            <div
              className="pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-0"
              aria-hidden
            />
          </div>
        </div>
      )}
    </div>
  );
}
