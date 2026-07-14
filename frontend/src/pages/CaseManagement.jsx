import AppShell from "../components/AppShell.jsx";
import TabbedPage from "../components/TabbedPage.jsx";

const iconProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

const TABS = [
  {
    key: "progress-notes",
    label: "Progress Notes",
    icon: (
      <svg {...iconProps}>
        <rect x="6" y="4" width="12" height="17" rx="2" />
        <rect x="9" y="2.3" width="6" height="3.4" rx="1" />
        <path d="M9 12h6M9 16h6" />
      </svg>
    ),
  },
  {
    key: "follow-ups",
    label: "Follow-up Records",
    icon: (
      <svg {...iconProps}>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M15 6h6v6" />
      </svg>
    ),
  },
];

export default function CaseManagement() {
  return (
    <AppShell title="Case Management" description="Document progress, interventions, and follow-up actions.">
      <TabbedPage tabs={TABS} />
    </AppShell>
  );
}