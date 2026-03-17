import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './shared/components/Layout';
import AdminLayout from './shared/components/AdminLayout';
import WorkshopList from './features/workshops/views/workshop-list';
import WorkshopDetail from './features/workshops/views/workshop-detail';
import RegistrationForm from './features/registration/views/registration-form';
import RegistrationConfirmation from './features/registration/views/registration-confirmation';
import ExceptionRequestForm from './features/exceptions/views/exception-request-form';
import Login from './features/admin/auth/views/login';
import DashboardHome from './features/admin/dashboard/views/dashboard-home';
import WorkshopCrud from './features/admin/workshop-management/views/workshop-crud';
import RegistrationsViewer from './features/admin/registrations/views/registrations-viewer';
import ExceptionQueue from './features/admin/exception-review/views/exception-queue';
import CheckinView from './features/admin/checkin/views/checkin-view';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<WorkshopList />} />
        <Route path="/workshops/:id" element={<WorkshopDetail />} />
        <Route path="/register/:workshopId" element={<RegistrationForm />} />
        <Route path="/registration/confirmation" element={<RegistrationConfirmation />} />
        <Route path="/exception-request/:workshopId" element={<ExceptionRequestForm />} />
      </Route>
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardHome />} />
        <Route path="workshops" element={<WorkshopCrud />} />
        <Route path="registrations" element={<RegistrationsViewer />} />
        <Route path="exceptions" element={<ExceptionQueue />} />
        <Route path="checkin" element={<CheckinView />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
