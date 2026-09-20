import { useNavigate, useParams } from "react-router-dom";

const PWUD_STEPS = [
  { number: 1, label: "Demographics" },
  { number: 2, label: "Admission History" },
  { number: 3, label: "Drug Use History" },
  { number: 4, label: "Clinical Triage" },
  { number: 5, label: "Consents & Finalization" },
];

const OPD_STEPS = [
  { number: 1, label: "Demographics" },
  { number: 2, label: "Clinical Triage" },
  { number: 3, label: "Consents & Finalization" },
];

export default function PatientWorkflowProgress({ currentStep, completedThrough = currentStep - 1, patientId, caseType }) {
  const navigate = useNavigate();
  const params = useParams();

  const isOPD = caseType === "general_outpatient";
  const STEPS = isOPD ? OPD_STEPS : PWUD_STEPS;

  // A real patient context exists only when patientId prop is provided
  // OR when the URL has a numeric :id segment (NOT the /patients/register route).
  const urlId = params.id && params.id !== "register" ? params.id : null;
  const resolvedId = patientId || urlId;

  // Persist the active patient ID in localStorage only from real patient URLs,
  // never from the /patients/register new-registration route.
  if (urlId) {
    try {
      localStorage.setItem("active_patient_id", urlId);
    } catch {
      // ignore storage errors
    }
  }

  // On the new-registration form there is no patient yet.
  // Steps 2+ must not navigate anywhere — they would land on a stale old patient.
  const isNewRegistration = !resolvedId;

  function handleStepClick(stepNumber) {
    if (isNewRegistration && stepNumber !== 1) return;

    if (isOPD) {
      switch (stepNumber) {
        case 1: navigate(resolvedId ? `/patients/${resolvedId}/demographics` : "/patients/register"); break;
        case 2: navigate(`/patients/${resolvedId}/intake/clinical-triage`); break;
        case 3: navigate(`/patients/${resolvedId}/intake/finalize`); break;
        default: break;
      }
    } else {
      switch (stepNumber) {
        case 1: navigate(resolvedId ? `/patients/${resolvedId}/demographics` : "/patients/register"); break;
        case 2: navigate(`/patients/${resolvedId}/referral`); break;
        case 3: navigate(`/patients/${resolvedId}/intake/drug-history`); break;
        case 4: navigate(`/patients/${resolvedId}/intake/clinical-triage`); break;
        case 5: navigate(`/patients/${resolvedId}/intake/finalize`); break;
        default: break;
      }
    }
  }

  return (
    <nav className="patient-workflow" aria-label="Patient intake progress">
      {STEPS.map((step, index) => {
        const completed = step.number <= completedThrough;
        const active = step.number === currentStep;
        // Lock (visually dim + disable) steps that require a saved patient ID.
        const locked = isNewRegistration && step.number !== 1;

        return (
          <div className="patient-workflow__segment" key={step.number}>
            <button
              type="button"
              className={`patient-workflow__step${locked ? "" : " is-clickable"}${completed ? " is-complete" : ""}${active ? " is-active" : ""}`}
              onClick={() => handleStepClick(step.number)}
              title={locked ? "Save Demographics first to unlock this step" : `Go to Step ${step.number}: ${step.label}`}
              disabled={locked}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: locked ? "not-allowed" : "pointer",
                font: "inherit",
                textAlign: "inherit",
                opacity: locked ? 0.4 : 1,
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
