import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import Layout from './shared/components/Layout';
import AdminLayout from './shared/components/AdminLayout';
import EventList from './features/events/views/event-list';
import EventDetail from './features/events/views/event-detail';
import RegistrationForm from './features/registration/views/registration-form';
import RegistrationConfirmation from './features/registration/views/registration-confirmation';
import ExceptionRequestForm from './features/exceptions/views/exception-request-form';
import TeamLookup from './features/teams-public/views/team-lookup';
import TeamDeposit from './features/teams-public/views/team-deposit';
import Login from './features/admin/auth/views/login';
import DashboardHome from './features/admin/dashboard/views/dashboard-home';
import EventCrud from './features/admin/event-management/views/event-crud';
import EventTypesManagement from './features/admin/event-types/views/event-types-management';
import RegistrationsViewer from './features/admin/registrations/views/registrations-viewer';
import ExceptionQueue from './features/admin/exception-review/views/exception-queue';
import CheckinView from './features/admin/checkin/views/checkin-view';
import HackathonCheckinView from './features/admin/hackathon-checkin/views/hackathon-checkin-view';
import TeamsManagement from './features/admin/teams/views/teams-management';
import QrScanView from './features/admin/qr-scan/views/qr-scan-view';
import UsersManagement from './features/admin/users/views/users-management';
import MobileCheckinView from './features/admin/mobile-checkin/views/mobile-checkin-view';
import { useCurrentUser } from './features/admin/auth/use-current-user';
import { MANAGEMENT_ROLES, CHECKIN_ROLES, ROLES, homePathForRole, roleLabel } from './features/admin/auth/roles';

function NoAccess({ role }) {
  return (
    <div className="ui-card mx-auto mt-10 max-w-md p-6 text-center sm:p-8">
      <h1 className="text-lg font-bold tracking-tight text-slate-900">You do not have access to this page</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Your account is signed in as <strong>{roleLabel(role)}</strong>. Ask a Super Admin if you need
        access to more of the panel.
      </p>
      <Link to="/admin/login" className="ui-btn-secondary mt-6 no-underline">
        Sign in as someone else
      </Link>
    </div>
  );
}

// Guards an admin route: requires a session, and optionally one of `allow` roles.
function AuthGate({ children, allow }) {
  const { user, role } = useCurrentUser();
  const location = useLocation();

  if (!user) return <Navigate to="/admin/login" replace />;
  if (allow && !allow.includes(role)) {
    const home = homePathForRole(role);
    // Never bounce someone back to the page that just rejected them — an
    // unrecognised role would otherwise redirect forever.
    if (home === location.pathname) return <NoAccess role={role} />;
    return <Navigate to={home} replace />;
  }
  return children;
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<EventList />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/workshops/:id" element={<EventDetail />} />
        <Route path="/register/:eventId" element={<RegistrationForm />} />
        <Route path="/register/workshop/:workshopId" element={<RegistrationForm />} />
        <Route path="/registration/confirmation" element={<RegistrationConfirmation />} />
        <Route path="/exception-request/:eventId" element={<ExceptionRequestForm />} />
        <Route path="/exception-request/workshop/:workshopId" element={<ExceptionRequestForm />} />
        <Route path="/my-team" element={<TeamLookup />} />
        <Route path="/teams/:teamId/deposit" element={<TeamDeposit />} />
      </Route>
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin/mobile-checkin"
        element={<AuthGate allow={CHECKIN_ROLES}><MobileCheckinView /></AuthGate>}
      />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AuthGate allow={MANAGEMENT_ROLES}><DashboardHome /></AuthGate>} />
        <Route path="events" element={<AuthGate allow={MANAGEMENT_ROLES}><EventCrud /></AuthGate>} />
        <Route path="workshops" element={<AuthGate allow={MANAGEMENT_ROLES}><EventCrud /></AuthGate>} />
        <Route path="event-types" element={<AuthGate allow={MANAGEMENT_ROLES}><EventTypesManagement /></AuthGate>} />
        <Route path="registrations" element={<AuthGate allow={MANAGEMENT_ROLES}><RegistrationsViewer /></AuthGate>} />
        <Route path="exceptions" element={<AuthGate allow={MANAGEMENT_ROLES}><ExceptionQueue /></AuthGate>} />
        <Route path="checkin" element={<AuthGate allow={CHECKIN_ROLES}><CheckinView /></AuthGate>} />
        <Route path="hackathon-checkin" element={<AuthGate allow={CHECKIN_ROLES}><HackathonCheckinView /></AuthGate>} />
        <Route path="hackathon-checkin/:eventId" element={<AuthGate allow={CHECKIN_ROLES}><HackathonCheckinView /></AuthGate>} />
        <Route path="teams/:eventId" element={<AuthGate allow={MANAGEMENT_ROLES}><TeamsManagement /></AuthGate>} />
        <Route path="qr-scan" element={<AuthGate allow={CHECKIN_ROLES}><QrScanView /></AuthGate>} />
        <Route path="users" element={<AuthGate allow={[ROLES.SUPER_ADMIN]}><UsersManagement /></AuthGate>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
