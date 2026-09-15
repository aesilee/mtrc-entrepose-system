const STEPS = [
  { number: 1, label: "Demographics" },
  { number: 2, label: "Admission History" },
  { number: 3, label: "Drug Use History" },
  { number: 4, label: "Clinical Triage" },
  { number: 5, label: "Consents & Finalization" },
];

export default function PatientWorkflowProgress({ currentStep, completedThrough = currentStep - 1 }) {
  return (
    <nav className="patient-workflow" aria-label="Patient intake progress">
      {STEPS.map((step, index) => {
        const completed = step.number <= completedThrough;
        const active = step.number === currentStep;

        return (
          <div className="patient-workflow__segment" key={step.number}>
            <div className={`patient-workflow__step${completed ? " is-complete" : ""}${active ? " is-active" : ""}`}>
              <span className="patient-workflow__circle" aria-current={active ? "step" : undefined}>
                {completed ? "✓" : step.number}
              </span>
              <span className="patient-workflow__label">{step.label}</span>
            </div>
            {index < STEPS.length - 1 && (
              <span className={`patient-workflow__line${completed ? " is-complete" : ""}`} aria-hidden="true" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
