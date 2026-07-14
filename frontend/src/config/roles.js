export const ROLE_LABELS = {
  admitting: "Admitting Personnel",
  case_manager: "Case Manager",
  him_staff: "HIM Staff",
  ict_admin: "ICT Administrator",
};

// Full page hierarchy, per role, based on the MTRC System Guide's
// "Complete Page Hierarchy" and "Which Users Can Access Each Module" sections.
// Items not yet implemented still show so the team can see the shape
// of the full system, but they render a "coming soon" placeholder.
// Items with a `children` array render as expandable/nested groups.
export const NAV_BY_ROLE = {
  admitting: [
    { label: "Dashboard", path: "/dashboard", icon: "dashboard" },
    { label: "Patients", path: "/patients", icon: "patients" },
    { label: "Certificates", path: "/certificates", icon: "certificates" },
  ],
  case_manager: [
    { label: "Dashboard", path: "/dashboard", icon: "dashboard" },
    { label: "Patients", path: "/patients", icon: "patients" },
    { label: "Attendance", path: "/attendance", icon: "attendance" },
    { label: "Case Management", path: "/case-management", icon: "caseManagement" },
    { label: "Analytics", path: "/analytics", icon: "analytics", badge: "Limited" },
  ],
  him_staff: [
    { label: "Dashboard", path: "/dashboard", icon: "dashboard" },
    { label: "Patients", path: "/patients", icon: "patients", badge: "View" },
    { label: "Attendance", path: "/attendance", icon: "attendance", badge: "View" },
    { label: "Case Management", path: "/case-management", icon: "caseManagement", badge: "View" },
    {
      label: "Reports",
      icon: "reports",
      children: [
        { label: "Attendance Report", path: "/reports/attendance" },
        { label: "Patient Report", path: "/reports/patient" },
        { label: "Program Report", path: "/reports/program" },
        { label: "Monthly Report", path: "/reports/monthly" },
      ],
    },
    { label: "Certificates", path: "/certificates", icon: "certificates" },
    { label: "Analytics", path: "/analytics", icon: "analytics" },
  ],
  ict_admin: [
    { label: "Dashboard", path: "/dashboard", icon: "dashboard" },
    { label: "Patients", path: "/patients", icon: "patients" },
    { label: "Attendance", path: "/attendance", icon: "attendance" },
    { label: "Case Management", path: "/case-management", icon: "caseManagement" },
    {
      label: "Reports",
      icon: "reports",
      children: [
        { label: "Attendance Report", path: "/reports/attendance" },
        { label: "Patient Report", path: "/reports/patient" },
        { label: "Program Report", path: "/reports/program" },
        { label: "Monthly Report", path: "/reports/monthly" },
      ],
    },
    { label: "Certificates", path: "/certificates", icon: "certificates" },
    { label: "Analytics", path: "/analytics", icon: "analytics" },
    {
      label: "Administration",
      icon: "administration",
      children: [
        { label: "User Management", path: "/settings/users" },
        { label: "Audit Logs", path: "/settings/audit-logs" },
        { label: "Settings", path: "/settings" },
      ],
    },
  ],
};

// Footer items shown beneath the main nav for every role.
export const FOOTER_NAV = [{ label: "Profile", path: "/profile", icon: "profile" }];