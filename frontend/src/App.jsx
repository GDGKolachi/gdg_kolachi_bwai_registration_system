import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './shared/components/Layout';
import AdminLayout from './shared/components/AdminLayout';
import EventList from './features/events/views/event-list';
import EventDetail from './features/events/views/event-detail';
import RegistrationForm from './features/registration/views/registration-form';
import RegistrationConfirmation from './features/registration/views/registration-confirmation';
import ExceptionRequestForm from './features/exceptions/views/exception-request-form';
import TeamLookup from './features/teams-public/views/team-lookup';
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

function AuthGate({ children }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/admin/login" replace />;
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
      </Route>
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin/mobile-checkin" element={<AuthGate><MobileCheckinView /></AuthGate>} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardHome />} />
        <Route path="events" element={<EventCrud />} />
        <Route path="workshops" element={<EventCrud />} />
        <Route path="event-types" element={<EventTypesManagement />} />
        <Route path="registrations" element={<RegistrationsViewer />} />
        <Route path="exceptions" element={<ExceptionQueue />} />
        <Route path="checkin" element={<CheckinView />} />
        <Route path="hackathon-checkin" element={<HackathonCheckinView />} />
        <Route path="hackathon-checkin/:eventId" element={<HackathonCheckinView />} />
        <Route path="teams/:eventId" element={<TeamsManagement />} />
        <Route path="qr-scan" element={<QrScanView />} />
        <Route path="users" element={<UsersManagement />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
