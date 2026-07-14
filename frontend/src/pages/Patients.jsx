import AppShell from "../components/AppShell.jsx";
import TabbedPage from "../components/TabbedPage.jsx";

const iconProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

const TABS = [
  {
    key: "list",
    label: "Patient List",
    icon: (
      <svg {...iconProps}>
        <path d="M8 6h13M8 12h13M8 18h13" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    ),
  },
  {
    key: "register",
    label: "Register Patient",
    icon: (
      <svg {...iconProps}>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 20c0-3.5 2.9-6 5.5-6s5.5 2.5 5.5 6" />
        <path d="M18 8v6M15 11h6" />
      </svg>
    ),
  },
];

export default function Patients() {
  return (
    <AppShell title="Patients" description="Manage patient records, admissions, and registrations.">
      <TabbedPage tabs={TABS} />
    </AppShell>
  );
}