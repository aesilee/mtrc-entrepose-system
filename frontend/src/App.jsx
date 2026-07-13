import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import UserManagement from "./pages/UserManagement.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";

// Simple declarative route table: [path, title, allowedRoles?]
// allowedRoles omitted = any authenticated user.
const COMING_SOON_ROUTES = [
  // Patients
  ["/patients", "Patient List"],
  ["/patients/register", "Register Patient", ["admitting", "ict_admin"]],
  ["/patients/assigned", "Assigned Patients", ["case_manager"]],

  // Attendance
  ["/attendance", "Attendance List", ["case_manager", "ict_admin"]],
  ["/attendance/record", "Record Attendance", ["case_manager", "ict_admin"]],
  ["/attendance/history", "Attendance History"],

  // Case Management
  ["/case-management/progress-notes", "Progress Notes"],
  ["/case-management/follow-ups", "Follow-up Records", ["case_manager", "ict_admin"]],

  // Reports
  ["/reports/attendance", "Attendance Report", ["him_staff", "ict_admin"]],
  ["/reports/patient", "Patient Report", ["him_staff", "ict_admin"]],
  ["/reports/program", "Program Report", ["him_staff", "ict_admin"]],
  ["/reports/monthly", "Monthly Report", ["him_staff", "ict_admin"]],

  // Certificates
  ["/certificates", "Certificates", ["admitting", "him_staff", "ict_admin"]],

  // Analytics
  ["/analytics", "Analytics"],

  // Notifications
  ["/notifications", "Notifications"],

  // Administration
  ["/settings/audit-logs", "Audit Logs", ["ict_admin"]],
  ["/settings", "Settings", ["ict_admin"]],

  // Account
  ["/profile", "My Profile"],
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/users"
        element={
          <ProtectedRoute allowedRoles={["ict_admin"]}>
            <UserManagement />
          </ProtectedRoute>
        }
      />

      {COMING_SOON_ROUTES.map(([path, title, allowedRoles]) => (
        <Route
          key={path}
          path={path}
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <ComingSoon title={title} />
            </ProtectedRoute>
          }
        />
      ))}

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}