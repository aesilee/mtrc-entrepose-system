import { useEffect, useState, useMemo, useCallback } from "react";
import api from "../api/axios.js";

const STATUS_OPTIONS = ["present", "absent", "excused", "late"];

const SESSION_TYPE_OPTIONS = [
  { value: "CBT_GROUP",             label: "CBT Group Session" },
  { value: "PSYCHO_EDUCATION",      label: "Psycho-Education / PE Meeting" },
  { value: "SHGM",                  label: "Self-Help Group Meeting" },
  { value: "INDIVIDUAL_COUNSELING", label: "Individual Counseling" },
  { value: "CONJOINT_FAMILY",       label: "Conjoint / Family Session" },
];

export default function RecordAttendanceModal({ initialPatientId, onClose, onSaved }) {
  const [step, setStep] = useState(1);

  const [caseManagers, setCaseManagers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [topics, setTopics] = useState([]);
  const [chairPatientId, setChairPatientId] = useState(null);
  const [session, setSession] = useState({
    sessionType: "",
    topicId: "",
    topicName: "",
    facilitatorName: "",
    caseManagerId: "",
    sessionDate: new Date().toISOString().slice(0, 10),
    sessionTime: "",
  });

  const [selections, setSelections] = useState(() => (
    initialPatientId ? { [initialPatientId]: { checked: true, status: "present", relapseRisk: "SAFE", drugTestResult: "NEGATIVE" } } : {}
  ));
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (initialPatientId) {
      setSelections((prev) => ({
        ...prev,
        [initialPatientId]: { checked: true, status: "present", relapseRisk: "SAFE", drugTestResult: "NEGATIVE" },
      }));
    }
  }, [initialPatientId]);

  useEffect(() => {
    // Fast parallel fetch without blocking render
    Promise.all([
      api.get("/users/case-managers").catch(() => ({ data: {} })),
      api.get("/patients?forAttendance=true&limit=300").catch(() => ({ data: {} })),
      api.get("/sessions/topics").catch(() => ({ data: {} })),
    ]).then(([cmRes, ptRes, topRes]) => {
      if (cmRes.data?.caseManagers) setCaseManagers(cmRes.data.caseManagers);
      if (ptRes.data?.patients) {
        setPatients(ptRes.data.patients);
      } else if (Array.isArray(ptRes.data)) {
        setPatients(ptRes.data);
      }
      if (topRes.data?.topics) setTopics(topRes.data.topics);
    });
  }, []);

  const isSinglePatientSession = session.sessionType === "INDIVIDUAL_COUNSELING" || session.sessionType === "CONJOINT_FAMILY";

  const availableTopics = useMemo(() => {
    if (!session.sessionType) return topics;
    return (topics || []).filter((t) => t.modality_type === session.sessionType);
  }, [topics, session.sessionType]);

  const handleSessionTypeChange = useCallback((newType) => {
    const isSingle = newType === "INDIVIDUAL_COUNSELING" || newType === "CONJOINT_FAMILY";
    setSession((prev) => ({ ...prev, sessionType: newType, topicId: "", topicName: "" }));
    setChairPatientId(null);
    if (isSingle) {
      setSelections((prev) => {
        const checkedEntries = Object.entries(prev).filter(([, v]) => v.checked);
        if (checkedEntries.length > 1) {
          const [firstId, firstVal] = checkedEntries[0];
          return { [firstId]: firstVal };
        }
        return prev;
      });
    }
  }, []);

  const setPatientDrugTestResult = useCallback((patientId, result) => {
    setSelections((prev) => {
      const current = prev[patientId] || { checked: true, status: "present", relapseRisk: "SAFE" };
      if (result === "POSITIVE") {
        const curPos = current.positiveDrugs || {};
        const hasAny = curPos.thc || curPos.meth || curPos.ecs;
        const nextPos = hasAny ? curPos : { thc: false, meth: true, ecs: false };

        const checkedList = [];
        if (nextPos.thc) checkedList.push("THC (Marijuana)");
        if (nextPos.meth) checkedList.push("METH (Methamphetamine)");
        if (nextPos.ecs) checkedList.push("ECS (Ecstasy)");

        return {
          ...prev,
          [patientId]: {
            ...current,
            drugTestResult: "POSITIVE",
            positiveDrugs: nextPos,
            substanceTested: `Multi-3: ${checkedList.join(", ")}`
          }
        };
      } else {
        return {
          ...prev,
          [patientId]: {
            ...current,
            drugTestResult: "NEGATIVE",
            substanceTested: "Multi-3 Rapid Drug Screen (THC, METH, ECS)"
          }
        };
      }
    });
  }, []);

  const togglePositiveDrug = useCallback((patientId, drugKey) => {
    setSelections((prev) => {
      const current = prev[patientId] || { checked: true, status: "present", relapseRisk: "SAFE" };
      const curPos = current.positiveDrugs || { thc: false, meth: false, ecs: false };
      const nextPos = { ...curPos, [drugKey]: !curPos[drugKey] };

      const checkedList = [];
      if (nextPos.thc) checkedList.push("THC (Marijuana)");
      if (nextPos.meth) checkedList.push("METH (Methamphetamine)");
      if (nextPos.ecs) checkedList.push("ECS (Ecstasy)");

      return {
        ...prev,
        [patientId]: {
          ...current,
          positiveDrugs: nextPos,
          substanceTested: checkedList.length > 0 ? `Multi-3: ${checkedList.join(", ")}` : "Multi-3 (Pending Selection)"
        }
      };
    });
  }, []);

  const toggleStatus = useCallback((patientId, status) => {
    setSelections((prev) => ({
      ...prev,
      [patientId]: {
        ...(prev[patientId] || { checked: true, relapseRisk: "SAFE" }),
        status,
        drugTestResult: (status === "present" || status === "late")
          ? (prev[patientId]?.drugTestResult || "NEGATIVE")
          : null,
      },
    }));
  }, []);

  const updateSelection = useCallback((patientId, field, value) => {
    setSelections((prev) => ({
      ...prev,
      [patientId]: {
        ...(prev[patientId] || { checked: true, status: "present", relapseRisk: "SAFE" }),
        [field]: value,
      },
    }));
  }, []);

  const toggleChecked = useCallback((patientId) => {
    setSelections((prev) => {
      if (prev[patientId]?.checked) {
        if (isSinglePatientSession) return {};
        const { [patientId]: _, ...rest } = prev;
        if (chairPatientId === String(patientId)) setChairPatientId(null);
        return rest;
      }
      const initialPatientState = {
        checked: true,
        status: "present",
        relapseRisk: "SAFE",
        drugTestResult: "NEGATIVE",
        positiveDrugs: { thc: false, meth: false, ecs: false },
        substanceTested: "Multi-3 Rapid Drug Screen (THC, METH, ECS)"
      };
      if (isSinglePatientSession) {
        return { [patientId]: initialPatientState };
      }
      return { ...prev, [patientId]: initialPatientState };
    });
  }, [isSinglePatientSession, chairPatientId]);

  const filteredPatients = useMemo(() => {
    if (!patientSearch) return patients;
    const searchLower = patientSearch.toLowerCase();
    return patients.filter((p) => {
      const nameMatch = p.full_name ? p.full_name.toLowerCase().includes(searchLower) : false;
      const codeMatch = p.patient_code ? p.patient_code.toLowerCase().includes(searchLower) : false;
      const pwudMatch = p.pwud_code ? p.pwud_code.toLowerCase().includes(searchLower) : false;
      return nameMatch || codeMatch || pwudMatch;
    });
  }, [patients, patientSearch]);

  const selectedCount = useMemo(
    () => Object.values(selections).filter((s) => s.checked).length,
    [selections]
  );

  const attendedPatients = useMemo(() => {
    return Object.entries(selections)
      .filter(([, v]) => v.checked && (v.status === "present" || v.status === "late"))
      .map(([id]) => patients.find((p) => String(p.id) === String(id)))
      .filter(Boolean);
  }, [selections, patients]);

  const absentPatients = useMemo(() => {
    return Object.entries(selections)
      .filter(([, v]) => v.checked && (v.status === "absent" || v.status === "excused"))
      .map(([id]) => patients.find((p) => String(p.id) === String(id)))
      .filter(Boolean);
  }, [selections, patients]);

  const canProceedStep1 = Boolean(session.sessionType && session.sessionDate);
  const canProceedStep2 = isSinglePatientSession ? selectedCount === 1 : selectedCount > 0;
  const canSave = canProceedStep1 && canProceedStep2;

  function handleNext() {
    if (step === 1 && !canProceedStep1) {
      setError("Please select a session type and date.");
      return;
    }
    if (step === 2 && !canProceedStep2) {
      setError(isSinglePatientSession ? "Please select exactly one patient." : "Please select at least one patient.");
      return;
    }
    if (step === 3) {
      const unselectedPos = attendedPatients.find((p) => {
        const sel = selections[p.id];
        return sel?.drugTestResult === "POSITIVE" && !sel?.positiveDrugs?.thc && !sel?.positiveDrugs?.meth && !sel?.positiveDrugs?.ecs;
      });
      if (unselectedPos) {
        setError(`Please check at least one positive substance (THC, METH, or ECS) on the Multi-3 checklist for "${unselectedPos.full_name}".`);
        return;
      }
    }
    setError("");
    setStep((prev) => Math.min(4, prev + 1));
  }

  function handleBack() {
    setError("");
    setStep((prev) => Math.max(1, prev - 1));
  }

  function handleClear() {
    setSession({
      sessionType: "",
      topicId: "",
      topicName: "",
      facilitatorName: "",
      caseManagerId: "",
      sessionDate: new Date().toISOString().slice(0, 10),
      sessionTime: "",
    });
    setSelections({});
    setChairPatientId(null);
    setRemarks("");
    setPatientSearch("");
    setStep(1);
    setError("");
  }

  async function handleSubmit() {
    if (!canSave) {
      setError("Please complete session details and select patients before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data: sessionData } = await api.post("/sessions", session);
      const records = Object.entries(selections)
        .filter(([, v]) => v.checked)
        .map(([patientId, v]) => {
          const isAttended = v.status === "present" || v.status === "late";
          const isPos = isAttended && v.drugTestResult === "POSITIVE";

          const checkedDrugs = [];
          if (v.positiveDrugs?.thc) checkedDrugs.push("THC (Marijuana)");
          if (v.positiveDrugs?.meth) checkedDrugs.push("METH (Methamphetamine)");
          if (v.positiveDrugs?.ecs) checkedDrugs.push("ECS (Ecstasy)");

          const finalSubstance = isPos
            ? (checkedDrugs.length > 0 ? `Multi-3: ${checkedDrugs.join(", ")}` : (v.substanceTested || "Multi-3: Positive"))
            : (isAttended ? "Multi-3 Rapid Drug Screen (THC, METH, ECS)" : null);

          return {
            patientId,
            status: v.status,
            relapseRisk: v.relapseRisk || "SAFE",
            drugTestResult: isAttended ? (v.drugTestResult || "NEGATIVE") : null,
            substanceTested: finalSubstance,
            drugTestRemarks: v.drugTestRemarks || (isPos && checkedDrugs.length > 0 ? `Positive on Multi-3 Rapid Test for ${checkedDrugs.join(", ")}` : null),
            familyAttended: !!v.familyAttended,
            familyMemberName: v.familyMemberName || null,
            isChairperson: chairPatientId === String(patientId),
            remarks
          };
        });

      await api.post("/attendance/bulk", { sessionId: sessionData.id, records });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Could not record attendance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <style>{`
        @keyframes modalFastFadeIn {
          from {
            opacity: 0;
            transform: translate3d(0, -8px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        .fast-modal-entrance {
          animation: modalFastFadeIn 0.18s cubic-bezier(0, 0, 0.2, 1) forwards;
          will-change: transform, opacity;
        }
      `}</style>

      <div
        className="fast-modal-entrance"
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Record attendance</div>
            <div style={styles.subtitle}>Fill in each section below — navigate using the tabs above.</div>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose} title="Close">×</button>
        </div>

        {/* Horizontal Stepper Navigation */}
        <div style={styles.horizontalStepsBar}>
          {[
            { num: 1, label: "Session details" },
            { num: 2, label: "Patient checklist" },
            { num: 3, label: "Drug test" },
            { num: 4, label: "Remarks" },
          ].map((s, idx) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            const canClick = s.num === 1 ||
              (s.num === 2 && canProceedStep1) ||
              (s.num === 3 && canProceedStep1 && canProceedStep2) ||
              (s.num === 4 && canProceedStep1 && canProceedStep2);

            return (
              <div key={s.num} style={styles.stepItemWrapper}>
                <button
                  type="button"
                  onClick={() => {
                    if (canClick) {
                      setError("");
                      setStep(s.num);
                    }
                  }}
                  style={{
                    ...styles.stepBtn,
                    ...(isActive ? styles.stepBtnActive : {}),
                    ...(isCompleted ? styles.stepBtnCompleted : {}),
                    cursor: canClick ? "pointer" : "not-allowed",
                  }}
                >
                  <span
                    style={{
                      ...styles.stepNumBadge,
                      ...(isActive ? styles.stepNumBadgeActive : {}),
                      ...(isCompleted ? styles.stepNumBadgeCompleted : {}),
                    }}
                  >
                    {isCompleted ? "✓" : s.num}
                  </span>
                  <span style={{ ...styles.stepBtnText, fontWeight: isActive ? 700 : 500 }}>
                    {s.label}
                  </span>
                </button>
                {idx < 3 && <div style={styles.stepConnector} />}
              </div>
            );
          })}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* Step Body */}
        <div style={styles.body}>
          {step === 1 && (
            <div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Session type <span style={{ color: "#E53E3E" }}>*</span>
                  <select
                    style={styles.selectInput}
                    value={session.sessionType}
                    onChange={(e) => handleSessionTypeChange(e.target.value)}
                    required
                  >
                    <option value="">— Select a session type —</option>
                    {SESSION_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Specific topic
                  <select
                    style={styles.selectInput}
                    value={session.topicId || ""}
                    onChange={(e) => {
                      const t = availableTopics.find((item) => String(item.id) === e.target.value);
                      setSession((prev) => ({
                        ...prev,
                        topicId: e.target.value || null,
                        topicName: t ? t.title_tagalog : "",
                      }));
                    }}
                    disabled={!session.sessionType}
                  >
                    <option value="">
                      {session.sessionType && availableTopics.length > 0
                        ? "General session (no specific topic)"
                        : "General session (no specific topic)"}
                    </option>
                    {availableTopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title_tagalog}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={styles.grid2}>
                <label style={styles.label}>
                  Facilitator / TRC staff
                  <input
                    type="text"
                    style={styles.textInput}
                    placeholder="Facilitator name"
                    value={session.facilitatorName || ""}
                    onChange={(e) => setSession((prev) => ({ ...prev, facilitatorName: e.target.value }))}
                  />
                </label>

                <label style={styles.label}>
                  Case manager
                  <select
                    style={styles.selectInput}
                    value={session.caseManagerId}
                    onChange={(e) => setSession((prev) => ({ ...prev, caseManagerId: e.target.value }))}
                  >
                    <option value="">Select a case manager</option>
                    {caseManagers.map((cm) => (
                      <option key={cm.id} value={cm.id}>{cm.full_name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={styles.grid2}>
                <label style={styles.label}>
                  Session date <span style={{ color: "#E53E3E" }}>*</span>
                  <input
                    type="date"
                    style={styles.textInput}
                    value={session.sessionDate}
                    onChange={(e) => setSession((prev) => ({ ...prev, sessionDate: e.target.value }))}
                  />
                </label>

                <label style={styles.label}>
                  Time
                  <input
                    type="time"
                    style={styles.textInput}
                    value={session.sessionTime}
                    onChange={(e) => setSession((prev) => ({ ...prev, sessionTime: e.target.value }))}
                  />
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              {isSinglePatientSession ? (
                <div style={styles.calloutSingle}>
                  <span style={{ fontSize: 16 }}>👤</span>
                  <span><strong>1-on-1 session.</strong> Select exactly one patient.</span>
                </div>
              ) : (
                <div style={styles.calloutGroup}>
                  <span style={{ fontSize: 16 }}>👥</span>
                  <span><strong>Group session.</strong> Select all participating clients in this cohort.</span>
                </div>
              )}

              <input
                style={styles.searchInput}
                placeholder="Search patient by name or code…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />

              <div style={styles.patientListWrap}>
                {filteredPatients.length === 0 ? (
                  <div style={styles.emptyPatients}>No patients matching search.</div>
                ) : (
                  filteredPatients.map((p) => {
                    const sel = selections[p.id];
                    const isChecked = Boolean(sel?.checked);
                    return (
                      <div
                        key={p.id}
                        style={{
                          ...styles.patientItem,
                          background: isChecked ? "#F7FAFC" : "#ffffff",
                        }}
                      >
                        <div style={styles.patientRowTop}>
                          <label style={styles.patientRadioLabel}>
                            <input
                              type={isSinglePatientSession ? "radio" : "checkbox"}
                              name={isSinglePatientSession ? "attendancePatientRadio" : undefined}
                              checked={isChecked}
                              onChange={() => toggleChecked(p.id)}
                              style={styles.nativeCheckbox}
                            />
                            <div>
                              <div style={{ ...styles.patientName, fontWeight: isChecked ? 700 : 500 }}>
                                {p.full_name}
                              </div>
                              <div style={styles.patientMeta}>
                                {p.patient_code}{p.case_manager_name ? ` · CM: ${p.case_manager_name}` : ""}
                              </div>
                            </div>
                          </label>
                        </div>

                        {isChecked && (
                          <div style={styles.patientControls}>
                            {/* Attendance Status */}
                            <select
                              style={styles.pillSelect}
                              value={sel.status}
                              onChange={(e) => toggleStatus(p.id, e.target.value)}
                              title="Attendance Status"
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>

                            {/* Schedule Book Relapse Risk (Vol. 3A) */}
                            <select
                              style={{
                                ...styles.pillSelect,
                                background: sel.relapseRisk === "USED" ? "#FEE2E2" : sel.relapseRisk === "AT_RISK" ? "#FEF3C7" : "#ECFDF5",
                                color: sel.relapseRisk === "USED" ? "#991B1B" : sel.relapseRisk === "AT_RISK" ? "#92400E" : "#065F46",
                                fontWeight: 600,
                                borderColor: sel.relapseRisk === "USED" ? "#FCA5A5" : sel.relapseRisk === "AT_RISK" ? "#FCD34D" : "#A7F3D0"
                              }}
                              value={sel.relapseRisk || "SAFE"}
                              onChange={(e) => updateSelection(p.id, "relapseRisk", e.target.value)}
                              title="Schedule Book: Weekly Relapse Risk Status"
                            >
                              <option value="SAFE">🟢 Safe</option>
                              <option value="AT_RISK">🟡 At Risk</option>
                              <option value="USED">🔴 Used / Slip</option>
                            </select>

                            {/* Post-Session Drug Screening Result (Present/Late) */}
                            {(sel.status === "present" || sel.status === "late") && (
                              <select
                                style={{
                                  ...styles.pillSelect,
                                  background: sel.drugTestResult === "POSITIVE" ? "#FEE2E2" : "#ECFDF5",
                                  color: sel.drugTestResult === "POSITIVE" ? "#991B1B" : "#065F46",
                                  fontWeight: 600,
                                  borderColor: sel.drugTestResult === "POSITIVE" ? "#FCA5A5" : "#A7F3D0"
                                }}
                                value={sel.drugTestResult || "NEGATIVE"}
                                onChange={(e) => setPatientDrugTestResult(p.id, e.target.value)}
                                title="Post-Session Urine Drug Screening Result (Multi-3 Test)"
                              >
                                <option value="NEGATIVE">🧪 Multi-3: Negative</option>
                                <option value="POSITIVE">🧪 Multi-3: Positive</option>
                              </select>
                            )}

                            {/* Family Attendance in Psycho-Education */}
                            {session.sessionType === "PSYCHO_EDUCATION" && (
                              <div style={styles.familyBadge}>
                                <label style={styles.familyLabel}>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(sel.familyAttended)}
                                    onChange={(e) => updateSelection(p.id, "familyAttended", e.target.checked)}
                                  />
                                  👨‍👩‍👧 Family
                                </label>
                                {sel.familyAttended && (
                                  <input
                                    type="text"
                                    style={styles.familyNameInput}
                                    placeholder="Spouse/Parent Name"
                                    value={sel.familyMemberName || ""}
                                    onChange={(e) => updateSelection(p.id, "familyMemberName", e.target.value)}
                                  />
                                )}
                              </div>
                            )}

                            {/* SHGM Chairperson Designation & 5-Session Limit */}
                            {session.sessionType === "SHGM" && (
                              <div style={styles.chairBadge}>
                                <label
                                  style={{
                                    ...styles.chairLabel,
                                    cursor: (p.shgm_chaired_count || 0) >= 5 ? "not-allowed" : "pointer",
                                    color: (p.shgm_chaired_count || 0) >= 5 ? "#A0AEC0" : "#1B4D3E",
                                  }}
                                  title={(p.shgm_chaired_count || 0) >= 5 ? "Max 5-session term limit reached (ENTREPOSE Vol. 1 Sec 5.5.3)" : "Designate meeting chairperson"}
                                >
                                  <input
                                    type="radio"
                                    name="shgmChairpersonRadio"
                                    checked={chairPatientId === String(p.id)}
                                    disabled={(p.shgm_chaired_count || 0) >= 5}
                                    onChange={() => setChairPatientId(String(p.id))}
                                  />
                                  👑 Chair ({p.shgm_chaired_count || 0}/5)
                                </label>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div style={styles.patientCountNotice}>
                {isSinglePatientSession
                  ? (selectedCount === 1 ? "1 of 1 patient selected" : "0 of 1 patient selected")
                  : `${selectedCount} of ${patients.length} patient(s) selected`}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              {/* Header Box */}
              <div style={styles.drugTestHeaderBox}>
                <div style={styles.drugTestHeaderTop}>
                  <div>
                    <div style={styles.drugTestTitle}>
                      <span style={{ fontSize: "16px", marginRight: "6px" }}>🧪</span>
                      Post-Session Multi-3 Rapid Urine Drug Screening (THC, METH, ECS)
                    </div>
                    <div style={styles.drugTestSubtitle}>
                      Every present client is drug tested after each session using the Multi-3 rapid test kit (THC, METH, ECS). Record if each client tested positive or negative, and specify reactive substance(s).
                    </div>
                  </div>
                  {attendedPatients.length > 0 && (
                    <button
                      type="button"
                      style={styles.markAllNegativeBtn}
                      onClick={() => {
                        setSelections((prev) => {
                          const updated = { ...prev };
                          for (const p of attendedPatients) {
                            if (updated[p.id]) {
                              updated[p.id] = {
                                ...updated[p.id],
                                drugTestResult: "NEGATIVE",
                                positiveDrugs: { thc: false, meth: false, ecs: false },
                                substanceTested: "Multi-3 Rapid Drug Screen (THC, METH, ECS)"
                              };
                            }
                          }
                          return updated;
                        });
                      }}
                      title="Set all attended clients to Negative"
                    >
                      ✓ Mark All Negative
                    </button>
                  )}
                </div>

                {/* Summary counters */}
                <div style={styles.dtSummaryRow}>
                  <span style={styles.dtBadgeTotal}>
                    Attended: {attendedPatients.length}
                  </span>
                  <span style={styles.dtBadgeNeg}>
                    🟢 Negative: {attendedPatients.filter((p) => selections[p.id]?.drugTestResult !== "POSITIVE").length}
                  </span>
                  <span style={styles.dtBadgePos}>
                    🔴 Positive: {attendedPatients.filter((p) => selections[p.id]?.drugTestResult === "POSITIVE").length}
                  </span>
                </div>
              </div>

              {/* Attended Patients Test List */}
              {attendedPatients.length === 0 ? (
                <div style={styles.emptyPatients}>
                  No clients marked present for this session. (All selected clients were marked absent or excused).
                </div>
              ) : (
                <div style={styles.dtPatientList}>
                  {attendedPatients.map((p) => {
                    const sel = selections[p.id] || {};
                    const isPositive = sel.drugTestResult === "POSITIVE";

                    return (
                      <div
                        key={p.id}
                        style={{
                          ...styles.dtPatientCard,
                          borderColor: isPositive ? "#FEB2B2" : "#CBD5E0",
                          background: isPositive ? "#FFF5F5" : "#ffffff",
                        }}
                      >
                        <div style={styles.dtPatientRowTop}>
                          <div>
                            <div style={styles.dtPatientName}>{p.full_name}</div>
                            <div style={styles.dtPatientMeta}>
                              {p.patient_code}{p.case_manager_name ? ` · CM: ${p.case_manager_name}` : ""}
                            </div>
                          </div>

                          {/* Negative / Positive Toggle Buttons */}
                          <div style={styles.dtToggleGroup}>
                            <button
                              type="button"
                              style={{
                                ...styles.dtToggleBtn,
                                ...(!isPositive ? styles.dtToggleBtnNegActive : styles.dtToggleBtnInactive),
                              }}
                              onClick={() => setPatientDrugTestResult(p.id, "NEGATIVE")}
                            >
                              🟢 Negative
                            </button>

                            <button
                              type="button"
                              style={{
                                ...styles.dtToggleBtn,
                                ...(isPositive ? styles.dtToggleBtnPosActive : styles.dtToggleBtnInactive),
                              }}
                              onClick={() => setPatientDrugTestResult(p.id, "POSITIVE")}
                            >
                              🔴 Positive
                            </button>
                          </div>
                        </div>

                        {/* Positive Alert with Multi-3 Checklist or Negative Confirmation */}
                        {isPositive ? (
                          <div style={styles.dtPositiveAlertBox}>
                            <div style={styles.dtAlertTitle}>
                              ⚠️ Positive Multi-3 Rapid Urine Drug Test Flagged
                            </div>
                            <div style={styles.dtAlertText}>
                              A clinical alert will be dispatched to assigned Case Manager ({p.case_manager_name || "Assigned CM"}). Please check the specific substance(s) tested positive on the Multi-3 rapid test kit:
                            </div>

                            {/* Multi-3 Checklist for Positive Substances */}
                            <div style={styles.multi3ChecklistSection}>
                              <div style={styles.multi3ChecklistTitle}>
                                <span>Multi-3 Test Checklist (Check all reactive panels):</span>
                                <span style={{ fontSize: "11px", fontWeight: 600, color: "#7F1D1D" }}>Kit: THC / METH / ECS</span>
                              </div>
                              <div style={styles.multi3ChecklistGrid}>
                                {/* THC */}
                                <label style={{
                                  ...styles.multi3CheckItem,
                                  borderColor: sel.positiveDrugs?.thc ? "#DC2626" : "#CBD5E0",
                                  background: sel.positiveDrugs?.thc ? "#FEF2F2" : "#FFFFFF"
                                }}>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(sel.positiveDrugs?.thc)}
                                    onChange={() => togglePositiveDrug(p.id, "thc")}
                                    style={styles.multi3Checkbox}
                                  />
                                  <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <span style={styles.drugPillThc}>THC</span>
                                      <strong style={{ fontSize: "12.5px", color: "#1F2937" }}>Marijuana</strong>
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>Tetrahydrocannabinol</div>
                                  </div>
                                </label>

                                {/* METH */}
                                <label style={{
                                  ...styles.multi3CheckItem,
                                  borderColor: sel.positiveDrugs?.meth ? "#DC2626" : "#CBD5E0",
                                  background: sel.positiveDrugs?.meth ? "#FEF2F2" : "#FFFFFF"
                                }}>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(sel.positiveDrugs?.meth)}
                                    onChange={() => togglePositiveDrug(p.id, "meth")}
                                    style={styles.multi3Checkbox}
                                  />
                                  <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <span style={styles.drugPillMeth}>METH</span>
                                      <strong style={{ fontSize: "12.5px", color: "#1F2937" }}>Shabu</strong>
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>Methamphetamine</div>
                                  </div>
                                </label>

                                {/* ECS */}
                                <label style={{
                                  ...styles.multi3CheckItem,
                                  borderColor: sel.positiveDrugs?.ecs ? "#DC2626" : "#CBD5E0",
                                  background: sel.positiveDrugs?.ecs ? "#FEF2F2" : "#FFFFFF"
                                }}>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(sel.positiveDrugs?.ecs)}
                                    onChange={() => togglePositiveDrug(p.id, "ecs")}
                                    style={styles.multi3Checkbox}
                                  />
                                  <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <span style={styles.drugPillEcs}>ECS</span>
                                      <strong style={{ fontSize: "12.5px", color: "#1F2937" }}>Ecstasy</strong>
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>MDMA</div>
                                  </div>
                                </label>
                              </div>

                              {!sel.positiveDrugs?.thc && !sel.positiveDrugs?.meth && !sel.positiveDrugs?.ecs && (
                                <div style={styles.multi3Warning}>
                                  ⚠️ Please select at least one positive substance (THC, METH, or ECS).
                                </div>
                              )}
                            </div>

                            <div style={styles.dtAlertFields}>
                              <div style={styles.dtAlertFieldItem}>
                                <label style={styles.dtAlertLabel}>Detected Summary:</label>
                                <input
                                  type="text"
                                  style={{ ...styles.dtInputSmall, background: "#F9FAFB", fontWeight: 600 }}
                                  value={sel.substanceTested || "Multi-3: Pending Selection"}
                                  readOnly
                                  title="Auto-generated from Multi-3 checklist"
                                />
                              </div>
                              <div style={styles.dtAlertFieldItem}>
                                <label style={styles.dtAlertLabel}>Immediate Clinical Action / Notes:</label>
                                <input
                                  type="text"
                                  style={styles.dtInputSmall}
                                  value={sel.drugTestRemarks || ""}
                                  onChange={(e) => updateSelection(p.id, "drugTestRemarks", e.target.value)}
                                  placeholder="e.g., Clinical counseling scheduled; CM notified"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={styles.dtNegativeCleanBar}>
                            <span style={{ fontSize: "12px", color: "#276749", fontWeight: 600 }}>
                              ✓ Negative (Multi-3 Kit): No THC, METH, or ECS metabolites detected.
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Absent/Excused Notice */}
              {absentPatients.length > 0 && (
                <div style={styles.absentNoticeBox}>
                  <span style={{ fontWeight: 600 }}>ℹ️ Exempt from post-session screening ({absentPatients.length} client(s) absent/excused):</span>{" "}
                  {absentPatients.map((p) => p.full_name).join(", ")}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <label style={styles.label}>
                Clinical remarks & session notes
                <textarea
                  rows={4}
                  style={styles.textareaInput}
                  placeholder="Add clinical observations, participant engagement, or follow-up instructions..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </label>

              <div style={styles.summaryBox}>
                <div style={styles.summaryTitle}>Session Summary</div>
                <div style={styles.summaryRow}>
                  <span>Modality:</span>
                  <strong>{SESSION_TYPE_OPTIONS.find((s) => s.value === session.sessionType)?.label || "—"}</strong>
                </div>
                <div style={styles.summaryRow}>
                  <span>Topic:</span>
                  <strong>{session.topicName || "General session"}</strong>
                </div>
                <div style={styles.summaryRow}>
                  <span>Date & Time:</span>
                  <strong>{session.sessionDate} {session.sessionTime || ""}</strong>
                </div>
                <div style={styles.summaryRow}>
                  <span>Clients Present:</span>
                  <strong>{attendedPatients.length} patient(s) attended</strong>
                </div>
                <div style={styles.summaryRow}>
                  <span>Post-Session Drug Tests:</span>
                  <strong>
                    {attendedPatients.length} tested (
                    <span style={{ color: "#22543D" }}>{attendedPatients.filter((p) => selections[p.id]?.drugTestResult !== "POSITIVE").length} Negative</span>,{" "}
                    <span style={{ color: attendedPatients.filter((p) => selections[p.id]?.drugTestResult === "POSITIVE").length > 0 ? "#C53030" : "#4A5568" }}>
                      {attendedPatients.filter((p) => selections[p.id]?.drugTestResult === "POSITIVE").length} Positive
                    </span>
                    )
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            type="button"
            style={styles.clearBtn}
            onClick={handleClear}
          >
            Clear
          </button>
          
          <div style={{ flex: 1 }} />

          {step > 1 && (
            <button
              type="button"
              style={styles.secondaryBtn}
              onClick={handleBack}
            >
              Back
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              style={{
                ...styles.primaryBtn,
                ...((step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2) ? styles.btnDisabled : {}),
              }}
              onClick={handleNext}
              disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              style={{
                ...styles.primaryBtn,
                ...(!canSave || saving ? styles.btnDisabled : {}),
              }}
              onClick={handleSubmit}
              disabled={!canSave || saving}
            >
              {saving ? "Saving…" : "Save attendance"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: "20px",
  },
  modal: {
    background: "#ffffff",
    borderRadius: "16px",
    width: "680px",
    maxWidth: "96vw",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
    border: "1px solid #E2E8F0",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "18px 24px 14px 24px",
    borderBottom: "1px solid #EDF2F7",
  },
  title: {
    fontSize: "17px",
    fontWeight: 800,
    color: "#164E33",
    letterSpacing: "-0.01em",
  },
  subtitle: {
    fontSize: "13px",
    color: "#718096",
    marginTop: "2px",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "22px",
    lineHeight: "20px",
    cursor: "pointer",
    color: "#A0AEC0",
    padding: "4px",
    borderRadius: "6px",
  },
  horizontalStepsBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    background: "#F8FAFC",
    borderBottom: "1px solid #EDF2F7",
  },
  stepItemWrapper: {
    display: "flex",
    alignItems: "center",
    flex: 1,
  },
  stepBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "none",
    border: "none",
    padding: "6px 6px",
    borderRadius: "8px",
  },
  stepBtnActive: {
    background: "#EDF7ED",
  },
  stepBtnCompleted: {
    opacity: 0.85,
  },
  stepNumBadge: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: 800,
    background: "#CBD5E0",
    color: "#4A5568",
  },
  stepNumBadgeActive: {
    background: "#164E33",
    color: "#ffffff",
    boxShadow: "0 2px 4px rgba(22, 78, 51, 0.3)",
  },
  stepNumBadgeCompleted: {
    background: "#2F6F4F",
    color: "#ffffff",
  },
  stepBtnText: {
    fontSize: "12.5px",
    color: "#2D3748",
    whiteSpace: "nowrap",
  },
  stepConnector: {
    flex: 1,
    height: "1px",
    background: "#CBD5E0",
    margin: "0 4px",
  },
  error: {
    background: "#FFF5F5",
    color: "#C53030",
    fontSize: "13px",
    padding: "10px 24px",
    borderBottom: "1px solid #FED7D7",
    fontWeight: 500,
  },
  body: {
    padding: "20px 24px",
    overflowY: "auto",
    flex: 1,
  },
  formGroup: {
    marginBottom: "14px",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#2D3748",
  },
  selectInput: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #CBD5E0",
    fontSize: "13.5px",
    color: "#2D3748",
    background: "#ffffff",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  textInput: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #CBD5E0",
    fontSize: "13.5px",
    color: "#2D3748",
    background: "#ffffff",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  textareaInput: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #CBD5E0",
    fontSize: "13px",
    color: "#2D3748",
    background: "#ffffff",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
    resize: "vertical",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "14px",
  },
  calloutSingle: {
    background: "#F7FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "13px",
    color: "#2D3748",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  calloutGroup: {
    background: "#F0FFF4",
    border: "1px solid #C6F6D5",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "13px",
    color: "#276749",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  searchInput: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #CBD5E0",
    fontSize: "13px",
    width: "100%",
    boxSizing: "border-box",
    marginBottom: "10px",
    outline: "none",
  },
  patientListWrap: {
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
    maxHeight: "260px",
    overflowY: "auto",
    background: "#ffffff",
  },
  emptyPatients: {
    padding: "20px",
    textAlign: "center",
    fontSize: "13px",
    color: "#A0AEC0",
  },
  patientItem: {
    padding: "10px 12px",
    borderBottom: "1px solid #EDF2F7",
  },
  patientRowTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  patientRadioLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    cursor: "pointer",
    flex: 1,
  },
  nativeCheckbox: {
    marginTop: "3px",
    accentColor: "#164E33",
    cursor: "pointer",
  },
  patientName: {
    fontSize: "13.5px",
    color: "#2D3748",
  },
  patientMeta: {
    fontSize: "11.5px",
    color: "#718096",
    marginTop: "2px",
  },
  patientControls: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "8px",
    paddingLeft: "24px",
  },
  pillSelect: {
    fontSize: "11.5px",
    padding: "4px 8px",
    borderRadius: "6px",
    border: "1px solid #CBD5E0",
    background: "#ffffff",
    color: "#2D3748",
    outline: "none",
  },
  familyBadge: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    background: "#F7FAFC",
    padding: "3px 6px",
    borderRadius: "6px",
    border: "1px solid #E2E8F0",
  },
  familyLabel: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    color: "#2D3748",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  familyNameInput: {
    padding: "2px 6px",
    borderRadius: "4px",
    border: "1px solid #CBD5E0",
    fontSize: "11px",
    width: "110px",
  },
  chairBadge: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    background: "#F7FAFC",
    padding: "3px 6px",
    borderRadius: "6px",
    border: "1px solid #E2E8F0",
  },
  chairLabel: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  patientCountNotice: {
    fontSize: "12px",
    color: "#718096",
    marginTop: "8px",
  },
  summaryBox: {
    background: "#F7FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
    padding: "12px 14px",
    marginTop: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  summaryTitle: {
    fontSize: "12.5px",
    fontWeight: 700,
    color: "#164E33",
    marginBottom: "2px",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    color: "#4A5568",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    padding: "14px 24px",
    borderTop: "1px solid #EDF2F7",
    background: "#ffffff",
  },
  clearBtn: {
    background: "#ffffff",
    border: "1px solid #CBD5E0",
    color: "#2D3748",
    padding: "8px 18px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryBtn: {
    background: "#ffffff",
    border: "1px solid #CBD5E0",
    color: "#2D3748",
    padding: "8px 18px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    marginRight: "8px",
  },
  primaryBtn: {
    background: "#164E33",
    color: "#ffffff",
    border: "none",
    padding: "8px 22px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(22, 78, 51, 0.25)",
  },
  btnDisabled: {
    background: "#CBD5E0",
    color: "#718096",
    cursor: "not-allowed",
    boxShadow: "none",
  },

  // ---------------- STEP 3: POST-SESSION DRUG SCREENING (RDT) ----------------
  drugTestHeaderBox: {
    background: "#F0FDF4",
    border: "1px solid #BBF7D0",
    borderRadius: "10px",
    padding: "14px 16px",
    marginBottom: "16px",
  },
  drugTestHeaderTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },
  drugTestTitle: {
    fontSize: "14.5px",
    fontWeight: 700,
    color: "#166534",
    display: "flex",
    alignItems: "center",
  },
  drugTestSubtitle: {
    fontSize: "12.5px",
    color: "#4B5563",
    marginTop: "3px",
  },
  markAllNegativeBtn: {
    background: "#DCFCE7",
    color: "#166534",
    border: "1px solid #86EFAC",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: "all 0.15s ease",
  },
  dtSummaryRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "10px",
    paddingTop: "8px",
    borderTop: "1px solid #DCFCE7",
  },
  dtBadgeTotal: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#374151",
    background: "#ffffff",
    padding: "2px 8px",
    borderRadius: "12px",
    border: "1px solid #E5E7EB",
  },
  dtBadgeNeg: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#166534",
    background: "#DCFCE7",
    padding: "2px 8px",
    borderRadius: "12px",
    border: "1px solid #86EFAC",
  },
  dtBadgePos: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#991B1B",
    background: "#FEE2E2",
    padding: "2px 8px",
    borderRadius: "12px",
    border: "1px solid #FCA5A5",
  },
  dtPatientList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxHeight: "360px",
    overflowY: "auto",
    paddingRight: "4px",
  },
  dtPatientCard: {
    border: "1.5px solid #CBD5E0",
    borderRadius: "10px",
    padding: "12px 16px",
    transition: "all 0.2s ease",
  },
  dtPatientRowTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  dtPatientName: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#1F2937",
  },
  dtPatientMeta: {
    fontSize: "12px",
    color: "#6B7280",
    marginTop: "2px",
  },
  dtToggleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "#F3F4F6",
    padding: "3px",
    borderRadius: "8px",
  },
  dtToggleBtn: {
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  dtToggleBtnNegActive: {
    background: "#059669",
    color: "#ffffff",
    boxShadow: "0 1px 3px rgba(5, 150, 105, 0.3)",
  },
  dtToggleBtnPosActive: {
    background: "#DC2626",
    color: "#ffffff",
    boxShadow: "0 1px 3px rgba(220, 38, 38, 0.3)",
  },
  dtToggleBtnInactive: {
    background: "transparent",
    color: "#6B7280",
  },
  dtPositiveAlertBox: {
    marginTop: "10px",
    padding: "10px 12px",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: "8px",
  },
  dtAlertTitle: {
    fontSize: "12.5px",
    fontWeight: 700,
    color: "#991B1B",
    marginBottom: "3px",
  },
  dtAlertText: {
    fontSize: "11.5px",
    color: "#7F1D1D",
    lineHeight: "1.4",
    marginBottom: "8px",
  },
  dtAlertFields: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  dtAlertFieldItem: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  dtAlertLabel: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#991B1B",
  },
  dtInputSmall: {
    padding: "5px 8px",
    fontSize: "12px",
    borderRadius: "6px",
    border: "1px solid #FCA5A5",
    background: "#ffffff",
    color: "#1F2937",
    outline: "none",
  },
  dtNegativeCleanBar: {
    marginTop: "8px",
    paddingTop: "6px",
    borderTop: "1px solid #F3F4F6",
    display: "flex",
    alignItems: "center",
  },
  multi3ChecklistSection: {
    marginTop: "10px",
    marginBottom: "12px",
    background: "#ffffff",
    border: "1px solid #FECACA",
    borderRadius: "8px",
    padding: "10px 12px",
  },
  multi3ChecklistTitle: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#991B1B",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  multi3ChecklistGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
  },
  multi3CheckItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    border: "1.5px solid #CBD5E0",
    borderRadius: "8px",
    padding: "8px 10px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  multi3Checkbox: {
    marginTop: "2px",
    accentColor: "#DC2626",
    cursor: "pointer",
    width: "16px",
    height: "16px",
  },
  drugPillThc: {
    fontSize: "10.5px",
    fontWeight: 800,
    padding: "1px 6px",
    borderRadius: "4px",
    background: "#DCFCE7",
    color: "#166534",
    border: "1px solid #86EFAC",
  },
  drugPillMeth: {
    fontSize: "10.5px",
    fontWeight: 800,
    padding: "1px 6px",
    borderRadius: "4px",
    background: "#EFF6FF",
    color: "#1D4ED8",
    border: "1px solid #93C5FD",
  },
  drugPillEcs: {
    fontSize: "10.5px",
    fontWeight: 800,
    padding: "1px 6px",
    borderRadius: "4px",
    background: "#FAF5FF",
    color: "#7E22CE",
    border: "1px solid #D8B4FE",
  },
  multi3Warning: {
    marginTop: "8px",
    fontSize: "11.5px",
    color: "#DC2626",
    fontWeight: 600,
    background: "#FEF2F2",
    padding: "5px 8px",
    borderRadius: "4px",
    border: "1px dashed #FCA5A5",
  },
  absentNoticeBox: {
    marginTop: "14px",
    padding: "8px 12px",
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#64748B",
  },
};