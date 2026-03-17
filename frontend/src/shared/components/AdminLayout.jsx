import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';

const navItems = [
  { path: '/admin', label: 'Dashboard', exact: true },
  { path: '/admin/workshops', label: 'Workshops' },
  { path: '/admin/registrations', label: 'Registrations' },
  { path: '/admin/exceptions', label: 'Exceptions' },
  { path: '/admin/checkin', label: 'Check-in' },
];

export default function AdminLayout() {
  const location = useLocation();
  const token = localStorage.getItem('admin_token');

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin/login';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 240,
        background: 'var(--gdg-dark)',
        color: 'white',
        padding: '24px 0',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gdg-blue)' }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gdg-red)' }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gdg-yellow)' }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gdg-green)' }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>GDG Admin</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Build with AI</div>
        </div>
        <nav style={{ flex: 1 }}>
          {navItems.map(item => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'block',
                  padding: '10px 20px',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  borderLeft: isActive ? '3px solid var(--gdg-blue)' : '3px solid transparent',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: '0 20px' }}>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'rgba(255,255,255,0.8)',
              padding: '8px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              width: '100%',
              fontSize: 13,
            }}
          >
            Logout
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
