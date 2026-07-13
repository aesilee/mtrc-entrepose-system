export const ROLE_LABELS = {
  admitting: "Admitting Personnel",
  case_manager: "Case Manager",
  him_staff: "HIM Staff",
  ict_admin: "ICT Administrator",
};

// Every item points to a route that will be built out module by module.
// Items not yet implemented still show so the team can see the shape
// of the full system, but they render a "coming soon" placeholder.
export const NAV_BY_ROLE = {
  admitting: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Client Profiles", path: "/client-profiles" },
    { label: "Certificates", path: "/certificates" },
  ],
  case_manager: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Client Profiles", path: "/client-profiles" },
    { label: "Attendance", path: "/attendance" },
  ],
  him_staff: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Attendance", path: "/attendance" },
    { label: "Reports", path: "/reports" },
  ],
  ict_admin: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Client Profiles", path: "/client-profiles" },
    { label: "Attendance", path: "/attendance" },
    { label: "Reports", path: "/reports" },
    { label: "Certificates", path: "/certificates" },
    { label: "User Management", path: "/settings/users" },
  ],
};
