import { Outlet, Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { BRAND_NAME, BRAND_SERIES, BRAND_KICKER_PUBLIC, BRAND_FOOTER_LINE } from '../constants/branding';

export default function Layout() {
  return (
    <div className="public-shell flex min-h-screen min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 shadow-sm shadow-slate-200/30 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-3.5 lg:px-8">
          <Link
            to="/"
            className="group flex min-w-0 items-center gap-2 no-underline sm:gap-3"
          >
            <BrandLogo className="h-8 w-auto shrink-0 transition-opacity group-hover:opacity-90 sm:h-10 lg:h-11" />
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-[0.65rem] sm:tracking-[0.14em]">
                {BRAND_KICKER_PUBLIC}
              </span>
              <span className="truncate text-sm font-bold tracking-tight text-slate-900 sm:text-base lg:text-lg">
                {BRAND_NAME}
              </span>
              <span className="truncate text-[0.7rem] font-medium text-slate-500 sm:text-xs">{BRAND_SERIES}</span>
            </div>
          </Link>
          <nav className="flex shrink-0 justify-end sm:justify-start">
            <Link
              to="/"
              className="rounded-lg px-3 py-2 text-center text-sm font-semibold text-slate-600 no-underline transition hover:bg-slate-100 hover:text-gdg-blue"
            >
              Workshops
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 py-6 sm:py-10 md:py-12">
        <div className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-slate-200/80 bg-white/60 py-5 backdrop-blur-sm sm:py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2 px-4 text-center sm:flex-row sm:gap-3 sm:text-left">
          <BrandLogo className="h-5 w-auto opacity-90 sm:h-6" />
          <span className="max-w-prose text-xs text-slate-500 sm:text-sm">{BRAND_FOOTER_LINE}</span>
        </div>
      </footer>
    </div>
  );
}
