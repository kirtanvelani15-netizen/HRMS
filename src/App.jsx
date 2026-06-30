import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute, ModuleRoute } from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth pages
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import SystemAnalytics from './pages/admin/SystemAnalytics';
import ManageHR from './pages/admin/ManageHR';
import AssetManagement from './pages/admin/AssetManagement';
import AuditLog from './pages/admin/AuditLog';
import SystemSettings from './pages/admin/SystemSettings';
import PerformanceCycles from './pages/admin/PerformanceCycles';
import PerformanceOverview from './pages/admin/PerformanceOverview';

// HR pages
import HRDashboard from './pages/hr/HRDashboard';
import Onboarding from './pages/shared/Onboarding';
import SalaryMaster from './pages/hr/SalaryMaster';
import HRChatPage from './pages/hr/HRChatPage';

// Employee pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import Profile from './pages/employee/Profile';
import MyAssets from './pages/employee/MyAssets';
import EmployeeChatPage from './pages/employee/EmployeeChatPage';
import LogHours from './pages/employee/LogHours';

// Shared pages
import Employees from './pages/shared/Employees';
import Departments from './pages/shared/Departments';
import Attendance from './pages/shared/Attendance';
import Leaves from './pages/shared/Leaves';
import Salary from './pages/shared/Salary';
import Notices from './pages/shared/Notices';
import Settings from './pages/shared/Settings';
import Documents from './pages/shared/Documents';
import Holidays from './pages/shared/Holidays';
import Directory from './pages/employee/Directory';
import Expenses from './pages/shared/Expenses';
import PerformanceGoals from './pages/shared/PerformanceGoals';
import PerformanceReviews from './pages/shared/PerformanceReviews';
import WorkLog from './pages/shared/WorkLog';
import WorklogProjects from './pages/shared/WorklogProjects';
import WorklogApprovals from './pages/shared/WorklogApprovals';
import WorklogReports from './pages/shared/WorklogReports';
import Recruitment from './pages/shared/Recruitment';
import Training from './pages/shared/Training';
import ShiftRoster from './pages/shared/ShiftRoster';
import ExitManagement from './pages/shared/ExitManagement';
import Grievances from './pages/shared/Grievances';
import LetterGenerator from './pages/shared/LetterGenerator';
import Companies from './pages/superadmin/Companies';

const App = () => (
  <Routes>
    {/* Public routes */}
    <Route element={<PublicRoute />}>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Route>
    </Route>

    {/* Admin routes */}
    <Route element={<ProtectedRoute roles={['admin', 'superadmin']} />}>
      <Route element={<DashboardLayout />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/manage-hr" element={<ManageHR />} />
        <Route path="/admin/employees" element={<Employees />} />
        <Route path="/admin/departments" element={<Departments />} />
        <Route path="/admin/attendance" element={<Attendance />} />
        <Route path="/admin/leaves" element={<Leaves />} />
        <Route path="/admin/salary" element={<Salary />} />
        <Route path="/admin/salary-master" element={<SalaryMaster />} />
        <Route path="/admin/notices" element={<Notices />} />
        <Route path="/admin/documents" element={<Documents />} />
        <Route path="/admin/settings" element={<Settings />} />
        <Route path="/admin/companies" element={<Companies />} />
        <Route path="/admin/assets" element={<AssetManagement />} />
        <Route path="/admin/audit-log" element={<AuditLog />} />
        <Route path="/admin/system-settings" element={<SystemSettings />} />
        <Route path="/admin/holidays" element={<Holidays />} />
        <Route path="/admin/directory" element={<Directory />} />
        <Route path="/admin/expenses" element={<Expenses />} />
        <Route path="/admin/performance/cycles" element={<PerformanceCycles />} />
        <Route path="/admin/performance/overview" element={<PerformanceOverview />} />
        <Route path="/admin/performance/goals" element={<PerformanceGoals />} />
        <Route path="/admin/performance/reviews" element={<PerformanceReviews />} />
        <Route element={<ModuleRoute moduleKey="worklog" />}>
          <Route path="/admin/worklog/log" element={<WorkLog />} />
          <Route path="/admin/worklog/projects" element={<WorklogProjects />} />
          <Route path="/admin/worklog/approvals" element={<WorklogApprovals />} />
          <Route path="/admin/worklog/reports" element={<WorklogReports />} />
        </Route>
        <Route path="/admin/recruitment" element={<Recruitment />} />
        <Route path="/admin/training" element={<Training />} />
        <Route path="/admin/shifts" element={<ShiftRoster />} />
        <Route path="/admin/exit" element={<ExitManagement />} />
        <Route path="/admin/grievances" element={<Grievances />} />
        <Route path="/admin/letters" element={<LetterGenerator />} />
        <Route path="/admin/analytics" element={<SystemAnalytics />} />
        <Route path="/admin/onboarding" element={<Onboarding />} />
      </Route>
    </Route>

    {/* HR routes */}
    <Route element={<ProtectedRoute roles={['hr']} />}>
      <Route element={<DashboardLayout />}>
        <Route path="/hr" element={<HRDashboard />} />
        <Route path="/hr/employees" element={<Employees />} />
        <Route path="/hr/departments" element={<Departments />} />
        <Route path="/hr/attendance" element={<Attendance />} />
        <Route path="/hr/leaves" element={<Leaves />} />
        <Route path="/hr/salary" element={<Salary />} />
        <Route path="/hr/salary-master" element={<SalaryMaster />} />
        <Route path="/hr/notices" element={<Notices />} />
        <Route path="/hr/documents" element={<Documents />} />
        <Route path="/hr/settings" element={<Settings />} />
        <Route path="/hr/assets" element={<AssetManagement />} />
        <Route path="/hr/chat" element={<HRChatPage />} />
        <Route path="/hr/holidays" element={<Holidays />} />
        <Route path="/hr/directory" element={<Directory />} />
        <Route path="/hr/expenses" element={<Expenses />} />
        <Route path="/hr/performance/goals" element={<PerformanceGoals />} />
        <Route path="/hr/performance/reviews" element={<PerformanceReviews />} />
        <Route element={<ModuleRoute moduleKey="worklog" />}>
          <Route path="/hr/worklog/log" element={<WorkLog />} />
          <Route path="/hr/worklog/approvals" element={<WorklogApprovals />} />
          <Route path="/hr/worklog/reports" element={<WorklogReports />} />
        </Route>
        <Route path="/hr/recruitment" element={<Recruitment />} />
        <Route path="/hr/training" element={<Training />} />
        <Route path="/hr/shifts" element={<ShiftRoster />} />
        <Route path="/hr/exit" element={<ExitManagement />} />
        <Route path="/hr/grievances" element={<Grievances />} />
        <Route path="/hr/letters" element={<LetterGenerator />} />
        <Route path="/hr/analytics" element={<SystemAnalytics />} />
        <Route path="/hr/onboarding" element={<Onboarding />} />
      </Route>
    </Route>

    {/* Employee routes */}
    <Route element={<ProtectedRoute roles={['employee']} />}>
      <Route element={<DashboardLayout />}>
        <Route path="/employee" element={<EmployeeDashboard />} />
        <Route path="/employee/profile" element={<Profile />} />
        <Route path="/employee/attendance" element={<Attendance />} />
        <Route path="/employee/leaves" element={<Leaves />} />
        <Route path="/employee/salary" element={<Salary />} />
        <Route path="/employee/notices" element={<Notices />} />
        <Route path="/employee/documents" element={<Documents />} />
        <Route path="/employee/settings" element={<Settings />} />
        <Route path="/employee/assets" element={<MyAssets />} />
        <Route path="/employee/chat" element={<EmployeeChatPage />} />
        <Route path="/employee/holidays" element={<Holidays />} />
        <Route path="/employee/directory" element={<Directory />} />
        <Route path="/employee/expenses" element={<Expenses />} />
        <Route path="/employee/performance/goals" element={<PerformanceGoals />} />
        <Route path="/employee/performance/reviews" element={<PerformanceReviews />} />
        <Route element={<ModuleRoute moduleKey="worklog" />}>
          <Route path="/employee/worklog/log" element={<WorkLog />} />
          <Route path="/employee/worklog/approvals" element={<WorklogApprovals />} />
        </Route>
        <Route path="/employee/grievances" element={<Grievances />} />
        <Route path="/employee/shifts" element={<ShiftRoster />} />
        <Route path="/employee/letters" element={<LetterGenerator />} />
      </Route>
    </Route>

    {/* Superadmin routes */}
    <Route element={<ProtectedRoute roles={['superadmin']} />}>
      <Route element={<DashboardLayout />}>
        <Route path="/superadmin" element={<Companies />} />
        <Route path="/superadmin/companies" element={<Companies />} />
      </Route>
    </Route>

    {/* Fallback */}
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

export default App;
