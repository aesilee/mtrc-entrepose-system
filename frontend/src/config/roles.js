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
    { label: "Register Patient", path: "/patients/register", icon: "caseManagement" },
    { label: "Certificates", path: "/certificates", icon: "certificates" },
  ],
  case_manager: [
    { label: "Dashboard", path: "/dashboard", icon: "dashboard" },
    { label: "My Patients", path: "/patients", icon: "patients" },
    { label: "Attendance", path: "/attendance", icon: "attendance" },
    { label: "Analytics", path: "/analytics", icon: "analytics", badge: "Limited" },
  ],
  him_staff: [
    { label: "Dashboard", path: "/dashboard", icon: "dashboard" },
    { label: "Patients", path: "/patients", icon: "patients", badge: "View" },
    { label: "Attendance", path: "/attendance", icon: "attendance", badge: "View" },
    { label: "Reports", path: "/reports", icon: "reports" },
    { label: "Analytics", path: "/analytics", icon: "analytics" },
  ],
  ict_admin: [
    { label: "Dashboard", path: "/dashboard", icon: "dashboard" },
    { label: "Patients", path: "/patients", icon: "patients" },
    { label: "Attendance", path: "/attendance", icon: "attendance" },
    { label: "Reports", path: "/reports", icon: "reports" },
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

// Human-readable capability summary for the "Roles & Permissions" section
// on the Profile page — kept separate from NAV_BY_ROLE so it reads as
// plain-language descriptions rather than raw page paths.
export const ROLE_PERMISSIONS = {
  admitting: [
    "View and register patients",
    "Fill out admission information",
    "Edit patient information",
    "Generate and print enrollment certificates",
    "Search patient records",
    "View the dashboard overview",
  ],
  case_manager: [
    "View and manage assigned patients",
    "Record attendance and therapy participation",
    "Add progress notes and observations",
    "Schedule and resolve follow-ups",
    "Update rehabilitation status",
    "View limited analytics",
  ],
  him_staff: [
    "View patient and attendance records (read-only)",
    "Generate and manage reports",
    "View full analytics",
  ],
  ict_admin: [
    "Full access to all modules",
    "Manage user accounts, roles, and access",
    "View audit logs",
    "Configure system-wide settings",
    "Back up and restore the database",
  ],
};
