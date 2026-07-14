import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import UserManagement from "./pages/UserManagement.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";
import Patients from "./pages/Patients.jsx";
import Attendance from "./pages/Attendance.jsx";
import CaseManagement from "./pages/CaseManagement.jsx";

// Simple declarative route table: [path, title, allowedRoles?]
// allowedRoles omitted = any authenticated user.
// Route table: [path, title, description, allowedRoles?]
// allowedRoles omitted = any authenticated user.
const COMING_SOON_ROUTES = [
  // Reports
  ["/reports/attendance", "Attendance Report", "Session attendance broken down by patient, program, and date range.", ["him_staff", "ict_admin"]],
  ["/reports/patient", "Patient Report", "Detailed patient records and enrollment summaries for export.", ["him_staff", "ict_admin"]],
  ["/reports/program", "Program Report", "Program-wide statistics on caseload, status, and outcomes.", ["him_staff", "ict_admin"]],
  ["/reports/monthly", "Monthly Report", "Consolidated monthly activity across admissions and attendance.", ["him_staff", "ict_admin"]],

  // Certificates
  ["/certificates", "Certificates", "Generate and print Certificates of Enrollment for patients.", ["admitting", "him_staff", "ict_admin"]],

  // Analytics
  ["/analytics", "Analytics", "Program performance trends and key monitoring statistics."],

  // Administration
  ["/settings/audit-logs", "Audit Logs", "Track logins, updates, and record changes across the system.", ["ict_admin"]],
  ["/settings", "Settings", "Configure general, notification, and security preferences.", ["ict_admin"]],

  // Account
  ["/profile", "My Profile", "View and update your account details."],
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

      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <Patients />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute allowedRoles={["case_manager", "him_staff", "ict_admin"]}>
            <Attendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/case-management"
        element={
          <ProtectedRoute allowedRoles={["case_manager", "him_staff", "ict_admin"]}>
            <CaseManagement />
          </ProtectedRoute>
        }
      />

      {COMING_SOON_ROUTES.map(([path, title, description, allowedRoles]) => (
        <Route
          key={path}
          path={path}
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <ComingSoon title={title} description={description} />
            </ProtectedRoute>
          }
        />
      ))}

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}