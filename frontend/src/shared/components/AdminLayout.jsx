import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';

const navItems = [
  { path: '/admin', label: 'Dashboard', exact: true },
  { path: '/admin/workshops', label: 'Workshops' },
  { path: '/admin/registrations', label: 'Registrations' },
  { path: '/admin/exceptions', label: 'Exceptions' },
  { path: '/admin/checkin', label: 'Check-in' },
  { path: '/admin/qr-scan', label: 'QR Scan' },
  { path: '/admin/users', label: 'Users' },
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
    <div className="flex min-h-screen">
      <aside className="w-60 bg-gdg-dark text-white py-6 flex flex-col">
        <div className="px-5 mb-8">
          <div className="flex gap-1 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gdg-blue" />
            <span className="w-1.5 h-1.5 rounded-full bg-gdg-red" />
            <span className="w-1.5 h-1.5 rounded-full bg-gdg-yellow" />
            <span className="w-1.5 h-1.5 rounded-full bg-gdg-green" />
          </div>
          <div className="font-bold text-base">GDG Admin</div>
          <div className="text-xs opacity-60">Build with AI</div>
        </div>
        <nav className="flex-1">
          {navItems.map(item => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`block py-2.5 px-5 text-sm no-underline border-l-3 transition-colors ${
                  isActive
                    ? 'text-white bg-white/10 font-semibold border-l-gdg-blue'
                    : 'text-white/60 border-l-transparent hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5">
          <button
            onClick={handleLogout}
            className="bg-white/10 border-none text-white/80 py-2 px-4 rounded-md cursor-pointer w-full text-sm hover:bg-white/20"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
