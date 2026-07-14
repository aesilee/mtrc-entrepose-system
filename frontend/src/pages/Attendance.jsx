import AppShell from "../components/AppShell.jsx";
import TabbedPage from "../components/TabbedPage.jsx";

const iconProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

const TABS = [
  {
    key: "list",
    label: "Attendance List",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    key: "record",
    label: "Record Attendance",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
        <path d="M8.5 15l2 2 4-4" />
      </svg>
    ),
  },
  {
    key: "history",
    label: "Attendance History",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l3 2" />
        <path d="M9 2h6" />
      </svg>
    ),
  },
];

export default function Attendance() {
  return (
    <AppShell title="Attendance" description="Track sessions, record attendance, and review history.">
      <TabbedPage tabs={TABS} />
    </AppShell>
  );
}