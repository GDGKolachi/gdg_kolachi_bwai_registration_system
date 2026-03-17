import { Outlet, Link } from 'react-router-dom';

export default function Layout() {
  return (
    <div>
      <header style={{
        background: 'white',
        borderBottom: '1px solid var(--gdg-border)',
        padding: '16px 0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gdg-blue)' }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gdg-red)' }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gdg-yellow)' }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gdg-green)' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--gdg-dark)' }}>
              GDG Kolachi
            </span>
            <span style={{ fontSize: 14, color: 'var(--gdg-gray)' }}>
              Build with AI
            </span>
          </Link>
          <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link to="/" style={{ fontWeight: 500, color: 'var(--gdg-gray)', fontSize: 14 }}>Workshops</Link>
          </nav>
        </div>
      </header>
      <main style={{ minHeight: 'calc(100vh - 130px)', padding: '32px 0' }}>
        <div className="container">
          <Outlet />
        </div>
      </main>
      <footer style={{ textAlign: 'center', padding: '24px', color: 'var(--gdg-gray)', fontSize: 13 }}>
        GDG Kolachi &mdash; Build with AI Workshop Series
      </footer>
    </div>
  );
}
