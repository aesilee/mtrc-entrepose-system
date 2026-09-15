import { useNavigate, useParams } from "react-router-dom";

const STEPS = [
  { number: 1, label: "Demographics" },
  { number: 2, label: "Admission History" },
  { number: 3, label: "Drug Use History" },
  { number: 4, label: "Clinical Triage" },
  { number: 5, label: "Consents & Finalization" },
];

export default function PatientWorkflowProgress({ currentStep, completedThrough = currentStep - 1, patientId }) {
  const navigate = useNavigate();
  const params = useParams();

  const targetId = patientId || params.id || localStorage.getItem("active_patient_id") || "1";

  if (params.id && params.id !== "register") {
    try {
      localStorage.setItem("active_patient_id", params.id);
    } catch {
      // ignore storage errors
    }
  }

  function handleStepClick(stepNumber) {
    switch (stepNumber) {
      case 1:
        navigate(targetId ? `/patients/${targetId}/demographics` : "/patients/register");
        break;
      case 2:
        navigate(`/patients/${targetId}/referral`);
        break;
      case 3:
        navigate(`/patients/${targetId}/intake/drug-history`);
        break;
      case 4:
        navigate(`/patients/${targetId}/intake/clinical-triage`);
        break;
      case 5:
        navigate(`/patients/${targetId}/intake/finalize`);
        break;
      default:
        break;
    }
  }

  return (
    <nav className="patient-workflow" aria-label="Patient intake progress">
      {STEPS.map((step, index) => {
        const completed = step.number <= completedThrough;
        const active = step.number === currentStep;

        return (
          <div className="patient-workflow__segment" key={step.number}>
            <button
              type="button"
              className={`patient-workflow__step is-clickable${completed ? " is-complete" : ""}${active ? " is-active" : ""}`}
              onClick={() => handleStepClick(step.number)}
              title={`Go to Step ${step.number}: ${step.label}`}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                font: "inherit",
                textAlign: "inherit",
              }}
            >
              <span className="patient-workflow__circle" aria-current={active ? "step" : undefined}>
                {completed ? "✓" : step.number}
              </span>
              <span className="patient-workflow__label">{step.label}</span>
            </button>
            {index < STEPS.length - 1 && (
              <span className={`patient-workflow__line${completed ? " is-complete" : ""}`} aria-hidden="true" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
