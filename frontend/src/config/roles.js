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
    { label: "Dashboard", path: "/dashboard" },
    {
      label: "Patients",
      children: [
        { label: "Patient List", path: "/patients" },
        { label: "Register Patient", path: "/patients/register" },
      ],
    },
    { label: "Certificates", path: "/certificates" },
    { label: "Notifications", path: "/notifications" },
  ],
  case_manager: [
    { label: "Dashboard", path: "/dashboard" },
    {
      label: "Patients",
      children: [{ label: "Assigned Patients", path: "/patients/assigned" }],
    },
    {
      label: "Attendance",
      children: [
        { label: "Attendance List", path: "/attendance" },
        { label: "Record Attendance", path: "/attendance/record" },
        { label: "Attendance History", path: "/attendance/history" },
      ],
    },
    {
      label: "Case Management",
      children: [
        { label: "Progress Notes", path: "/case-management/progress-notes" },
        { label: "Follow-up Records", path: "/case-management/follow-ups" },
      ],
    },
    { label: "Analytics", path: "/analytics", badge: "Limited" },
    { label: "Notifications", path: "/notifications" },
  ],
  him_staff: [
    { label: "Dashboard", path: "/dashboard" },
    {
      label: "Patients",
      children: [{ label: "Patient List", path: "/patients", badge: "View" }],
    },
    {
      label: "Attendance",
      children: [
        { label: "Attendance History", path: "/attendance/history", badge: "View" },
      ],
    },
    {
      label: "Case Management",
      children: [
        { label: "Progress Notes", path: "/case-management/progress-notes", badge: "View" },
      ],
    },
    {
      label: "Reports",
      children: [
        { label: "Attendance Report", path: "/reports/attendance" },
        { label: "Patient Report", path: "/reports/patient" },
        { label: "Program Report", path: "/reports/program" },
        { label: "Monthly Report", path: "/reports/monthly" },
      ],
    },
    { label: "Certificates", path: "/certificates" },
    { label: "Analytics", path: "/analytics" },
    { label: "Notifications", path: "/notifications" },
  ],
  ict_admin: [
    { label: "Dashboard", path: "/dashboard" },
    {
      label: "Patients",
      children: [
        { label: "Patient List", path: "/patients" },
        { label: "Register Patient", path: "/patients/register" },
      ],
    },
    {
      label: "Attendance",
      children: [
        { label: "Attendance List", path: "/attendance" },
        { label: "Record Attendance", path: "/attendance/record" },
        { label: "Attendance History", path: "/attendance/history" },
      ],
    },
    {
      label: "Case Management",
      children: [
        { label: "Progress Notes", path: "/case-management/progress-notes" },
        { label: "Follow-up Records", path: "/case-management/follow-ups" },
      ],
    },
    {
      label: "Reports",
      children: [
        { label: "Attendance Report", path: "/reports/attendance" },
        { label: "Patient Report", path: "/reports/patient" },
        { label: "Program Report", path: "/reports/program" },
        { label: "Monthly Report", path: "/reports/monthly" },
      ],
    },
    { label: "Certificates", path: "/certificates" },
    { label: "Analytics", path: "/analytics" },
    { label: "Notifications", path: "/notifications" },
    {
      label: "Administration",
      children: [
        { label: "User Management", path: "/settings/users" },
        { label: "Audit Logs", path: "/settings/audit-logs" },
        { label: "Settings", path: "/settings" },
      ],
    },
  ],
};

// Footer items shown beneath the main nav for every role.
export const FOOTER_NAV = [{ label: "Profile", path: "/profile" }];