import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import UserManagement from "./pages/UserManagement.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";
import Patients from "./pages/Patients.jsx";
import RegisterPatient from "./pages/RegisterPatient.jsx";
import PatientProfile from "./pages/PatientProfile.jsx";
import Reports from "./pages/Reports.jsx";
import Analytics from "./pages/Analytics.jsx";
import Attendance from "./pages/Attendance.jsx";

// Simple declarative route table: [path, title, allowedRoles?]
// allowedRoles omitted = any authenticated user.
// Route table: [path, title, description, allowedRoles?]
// allowedRoles omitted = any authenticated user.
const COMING_SOON_ROUTES = [

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
        path="/patients/register"
        element={
          <ProtectedRoute allowedRoles={["admitting", "ict_admin"]}>
            <RegisterPatient />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:id"
        element={
          <ProtectedRoute>
            <PatientProfile />
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
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={["him_staff", "ict_admin"]}>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allowedRoles={["case_manager", "him_staff", "ict_admin"]}>
            <Analytics />
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