import { Outlet, Link } from 'react-router-dom';

export default function Layout() {
  return (
    <div>
      <header className="bg-white border-b border-gdg-border py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-gdg-blue" />
              <span className="w-2 h-2 rounded-full bg-gdg-red" />
              <span className="w-2 h-2 rounded-full bg-gdg-yellow" />
              <span className="w-2 h-2 rounded-full bg-gdg-green" />
            </div>
            <span className="font-bold text-lg text-gdg-dark">GDG Kolachi</span>
            <span className="text-sm text-gdg-gray">Build with AI</span>
          </Link>
          <nav className="flex gap-6 items-center">
            <Link to="/" className="font-medium text-gdg-gray text-sm hover:text-gdg-blue">Workshops</Link>
          </nav>
        </div>
      </header>
      <main className="min-h-[calc(100vh-130px)] py-8">
        <div className="max-w-7xl mx-auto px-6">
          <Outlet />
        </div>
      </main>
      <footer className="text-center py-6 text-gdg-gray text-sm">
        GDG Kolachi &mdash; Build with AI Workshop Series
      </footer>
    </div>
  );
}
