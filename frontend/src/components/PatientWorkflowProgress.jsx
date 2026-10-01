import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import WorkflowOverviewModal from "./WorkflowOverviewModal.jsx";

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
  const [overviewStep, setOverviewStep] = useState(null);

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

  const isNewRegistration = !resolvedId;

  function handleStepClick(stepNumber) {
    // If we're on a new registration (no patient ID yet) and the user clicks any step > 1:
    // Open the comprehensive Section Inspector Modal directly to that section!
    if (isNewRegistration && stepNumber !== 1) {
      setOverviewStep(stepNumber);
      return;
    }

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
    <div style={{ width: "100%", marginBottom: 8 }}>
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
                title={
                  isNewRegistration && step.number !== 1
                    ? `Click to view section details: Step ${step.number} (${step.label})`
                    : `Go to Step ${step.number}: ${step.label}`
                }
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  font: "inherit",
                  textAlign: "inherit",
                  opacity: 1,
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

      {/* Overview & Section Inspector trigger button */}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: 18, marginTop: 4 }}>
        <button
          type="button"
          onClick={() => setOverviewStep(currentStep || 1)}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-primary, #15803d)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "2px 6px",
            borderRadius: "4px",
          }}
          title="See all 5 sections, field descriptions, and DOH/DDB requirements"
        >
          <span style={{ textDecoration: "underline" }}>View All Sections & Field Details</span>
        </button>
      </div>

      {/* Render Overview Modal if triggered */}
      {overviewStep && (
        <WorkflowOverviewModal
          initialStep={overviewStep}
          currentPatientId={resolvedId}
          onClose={() => setOverviewStep(null)}
        />
      )}
    </div>
  );
}
