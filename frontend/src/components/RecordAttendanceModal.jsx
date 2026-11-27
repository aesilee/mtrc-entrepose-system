import { useEffect, useState, useMemo, useCallback } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getModalityConfig } from "../utils/modalityConfig.js";

const STATUS_OPTIONS = [
  { value: "", label: "— Not Yet Recorded —" },
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
  { value: "absent", label: "Absent" },
];

const COMPLETION_OPTIONS = [
  { value: "CREDITED", label: "Credited" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "NOT_CREDITED", label: "Not Credited" },
];

const SESSION_TYPE_OPTIONS = [
  { value: "CBT_GROUP",             label: "CBT Group Session" },
  { value: "PSYCHO_EDUCATION",      label: "Psycho-Education / PE Meeting" },
  { value: "SHGM",                  label: "Self-Help Group Meeting" },
  { value: "INDIVIDUAL_COUNSELING", label: "Individual Counseling" },
  { value: "CONJOINT_FAMILY",       label: "Conjoint / Family Session" },
];

function computeMinutesLate(scheduledTime, arrivalTime) {
  if (!scheduledTime || !arrivalTime) return null;
  const [sh, sm] = String(scheduledTime).split(":").map(Number);
  const [ah, am] = String(arrivalTime).split(":").map(Number);
  if (!Number.isFinite(sh) || !Number.isFinite(sm) || !Number.isFinite(ah) || !Number.isFinite(am)) return null;
  const diff = (ah * 60 + am) - (sh * 60 + sm);
  return diff > 0 ? diff : 0;
}

export default function RecordAttendanceModal({ initialPatientId, existingSession, onClose, onSaved }) {
  const { user } = useAuth();
  const defaultStaffName = user?.full_name || user?.username || "";

  const [step, setStep] = useState(1);

  const [caseManagers, setCaseManagers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [topics, setTopics] = useState([]);
  const [creditedTopicsByPatient, setCreditedTopicsByPatient] = useState({});
  const [outstandingByPatient, setOutstandingByPatient] = useState({});
  const [policy, setPolicy] = useState({
    lateGraceMinutes: 15,
    maxLateForAutoReviewMinutes: 30,
    lateDefaultDecision: "PENDING_REVIEW",
    approvedByTitle: "MTRC Designated Supervisor",
  });

  const [expectedRosterIds, setExpectedRosterIds] = useState([]);
  const [chairPatientId, setChairPatientId] = useState(null);
  const [session, setSession] = useState({
    id: existingSession?.id || null,
    sessionType: existingSession?.session_type || "",
    topicId: existingSession?.topic_id || "",
    topicName: existingSession?.topic_name || "",
    curriculumRequirement: existingSession?.curriculum_requirement || "",
    facilitatorName: existingSession?.facilitator_name || defaultStaffName,
    caseManagerId: existingSession?.case_manager_id || "",
    sessionDate: existingSession?.session_date
      ? String(existingSession.session_date).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    sessionTime: existingSession?.session_time || "",
    sessionStatus: existingSession?.session_status || "COMPLETED",
    cancellationReason: existingSession?.cancellation_reason || "",
    authorizedByName: existingSession?.authorized_by_name || defaultStaffName,
  });

  const [selections, setSelections] = useState(() => (
    initialPatientId
      ? {
          [initialPatientId]: {
            checked: true,
            status: "",
            completionStatus: "CREDITED",
            arrivalTime: "",
            decisionReason: "",
            authorizedByName: "",
            isMakeup: false,
            makeupForAttendanceId: "",
            relapseRisk: "",
            drugTestResult: "",
            positiveDrugs: { thc: false, meth: false, ecs: false },
          },
        }
      : {}
  ));
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (initialPatientId) {
      setSelections((prev) => ({
        ...prev,
        [initialPatientId]: {
          checked: true,
          status: prev[initialPatientId]?.status || "",
          completionStatus: prev[initialPatientId]?.completionStatus || "CREDITED",
          arrivalTime: prev[initialPatientId]?.arrivalTime || "",
          decisionReason: prev[initialPatientId]?.decisionReason || "",
          authorizedByName: prev[initialPatientId]?.authorizedByName || "",
          isMakeup: prev[initialPatientId]?.isMakeup || false,
          makeupForAttendanceId: prev[initialPatientId]?.makeupForAttendanceId || "",
          relapseRisk: prev[initialPatientId]?.relapseRisk || "",
          drugTestResult: prev[initialPatientId]?.drugTestResult || "",
          positiveDrugs: prev[initialPatientId]?.positiveDrugs || { thc: false, meth: false, ecs: false },
        },
      }));
    }
  }, [initialPatientId]);

  useEffect(() => {
    if (existingSession?.id) {
      api
        .get(`/sessions/${existingSession.id}`)
        .then(({ data }) => {
          if (data?.session) {
            const s = data.session;
            setSession((prev) => ({
              ...prev,
              id: s.id,
              sessionType: s.session_type || "",
              topicId: s.topic_id || "",
              topicName: s.topic_name || "",
              curriculumRequirement: s.curriculum_requirement || "",
              facilitatorName: s.facilitator_name || defaultStaffName,
              caseManagerId: s.case_manager_id || "",
              sessionDate: s.session_date ? String(s.session_date).slice(0, 10) : prev.sessionDate,
              sessionTime: s.session_time || "",
              sessionStatus: s.session_status || "COMPLETED",
              cancellationReason: s.cancellation_reason || "",
              authorizedByName: s.authorized_by_name || defaultStaffName,
            }));
          }
          if (Array.isArray(data?.roster)) {
            const rIds = data.roster.map((r) => String(r.patient_id));
            setExpectedRosterIds(rIds);
            setSelections((prev) => {
              const next = { ...prev };
              for (const r of data.roster) {
                const pid = String(r.patient_id);
                if (!next[pid]) {
                  next[pid] = {
                    checked: !r.recorded_status, // Auto-check if not yet recorded
                    status: r.recorded_status || "",
                    completionStatus: r.recorded_completion || "CREDITED",
                    arrivalTime: r.recorded_arrival_time || "",
                    decisionReason: "",
                    authorizedByName: "",
                    isMakeup: false,
                    makeupForAttendanceId: "",
                    relapseRisk: "",
                    drugTestResult: "",
                    positiveDrugs: { thc: false, meth: false, ecs: false },
                    alreadyRecorded: Boolean(r.recorded_status),
                  };
                }
              }
              return next;
            });
          }
        })
        .catch((err) => console.error("Error loading session roster:", err));
    }
  }, [existingSession, defaultStaffName]);

  useEffect(() => {
    Promise.all([
      api.get("/users/case-managers").catch(() => ({ data: {} })),
      api.get("/patients?forAttendance=true&limit=300").catch(() => ({ data: {} })),
      api.get("/sessions/topics").catch(() => ({ data: {} })),
      api.get("/attendance/patient-context").catch(() => ({ data: {} })),
      api.get("/attendance/policy").catch(() => ({ data: {} })),
    ]).then(([cmRes, ptRes, topRes, ctxRes, polRes]) => {
      if (cmRes.data?.caseManagers) setCaseManagers(cmRes.data.caseManagers);
      if (ptRes.data?.patients) {
        setPatients(ptRes.data.patients);
      } else if (Array.isArray(ptRes.data)) {
        setPatients(ptRes.data);
      }
      if (topRes.data?.topics) setTopics(topRes.data.topics);
      if (ctxRes.data?.creditedTopicsByPatient) {
        setCreditedTopicsByPatient(ctxRes.data.creditedTopicsByPatient);
      }
      if (ctxRes.data?.outstandingByPatient) {
        setOutstandingByPatient(ctxRes.data.outstandingByPatient);
      }
      if (polRes.data?.policy) {
        setPolicy((prev) => ({ ...prev, ...polRes.data.policy }));
      }
    });
  }, []);

  const isSinglePatientSession = session.sessionType === "INDIVIDUAL_COUNSELING" || session.sessionType === "CONJOINT_FAMILY";
  const isSessionCancelled = session.sessionStatus === "CANCELLED";

  const availableTopics = useMemo(() => {
    if (!session.sessionType) return topics;
    return (topics || []).filter((t) => t.modality_type === session.sessionType);
  }, [topics, session.sessionType]);

  // Check whether a patient already has credited completion for the selected topic/requirement
  const getDuplicateCreditInfo = useCallback(
    (patientId) => {
      const creditedList = creditedTopicsByPatient[patientId] || [];
      if (creditedList.length === 0) return null;

      if (session.topicId) {
        const matchById = creditedList.find(
          (item) => item.topicId && Number(item.topicId) === Number(session.topicId)
        );
        if (matchById) return matchById;
      }

      const targetReq = (session.curriculumRequirement || session.topicName || "").trim().toLowerCase();
      if (targetReq) {
        const matchByName = creditedList.find(
          (item) =>
            (item.curriculumRequirement && item.curriculumRequirement.trim().toLowerCase() === targetReq) ||
            (item.topicName && item.topicName.trim().toLowerCase() === targetReq)
        );
        if (matchByName) return matchByName;
      }

      return null;
    },
    [creditedTopicsByPatient, session.topicId, session.curriculumRequirement, session.topicName]
  );

  const handleSessionTypeChange = useCallback((newType) => {
    const isSingle = newType === "INDIVIDUAL_COUNSELING" || newType === "CONJOINT_FAMILY";
    setSession((prev) => ({
      ...prev,
      sessionType: newType,
      topicId: "",
      topicName: "",
      curriculumRequirement: "",
    }));
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
      const current = prev[patientId] || { checked: true, status: "", relapseRisk: "" };
      if (result === "POSITIVE") {
        // Do NOT auto-select METH when POSITIVE is chosen
        const curPos = current.positiveDrugs || { thc: false, meth: false, ecs: false };
        const nextPos = {
          thc: Boolean(curPos.thc),
          meth: Boolean(curPos.meth),
          ecs: Boolean(curPos.ecs),
        };

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
            substanceTested:
              checkedList.length > 0
                ? `Multi-3: ${checkedList.join(", ")}`
                : "Multi-3: Pending Substance Selection",
          },
        };
      } else {
        const labelMap = {
          NEGATIVE: "Multi-3 Rapid Drug Screen (THC, METH, ECS)",
          PENDING: "Multi-3 Rapid Drug Screen (Result Pending)",
          INVALID: "Multi-3 Rapid Drug Screen (Invalid Specimen — Retest Required)",
          NOT_PERFORMED: "Multi-3: Test Not Performed",
        };
        return {
          ...prev,
          [patientId]: {
            ...current,
            drugTestResult: result,
            positiveDrugs: { thc: false, meth: false, ecs: false },
            substanceTested: labelMap[result] || "",
          },
        };
      }
    });
  }, []);

  const togglePositiveDrug = useCallback((patientId, drugKey) => {
    setSelections((prev) => {
      const current = prev[patientId] || { checked: true, status: "", relapseRisk: "" };
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
          substanceTested: checkedList.length > 0 ? `Multi-3: ${checkedList.join(", ")}` : "Multi-3 (Pending Selection)",
        },
      };
    });
  }, []);

  const toggleStatus = useCallback(
    (patientId, status) => {
      const dupInfo = getDuplicateCreditInfo(patientId);
      setSelections((prev) => {
        const current = prev[patientId] || {
          checked: true,
          relapseRisk: "",
          authorizedByName: "",
        };
        let nextCompletion = "NOT_CREDITED";
        if (dupInfo) {
          nextCompletion = "NOT_CREDITED";
        } else if (status === "present") {
          nextCompletion = "CREDITED";
        } else if (status === "late") {
          nextCompletion = policy.lateDefaultDecision || "PENDING_REVIEW";
        } else {
          nextCompletion = "NOT_CREDITED";
        }

        return {
          ...prev,
          [patientId]: {
            ...current,
            status,
            completionStatus: nextCompletion,
            isMakeup: status === "present" || status === "late" ? current.isMakeup : false,
            makeupForAttendanceId: status === "present" || status === "late" ? current.makeupForAttendanceId : "",
            drugTestResult:
              status === "present" || status === "late"
                ? current.drugTestResult || ""
                : null,
          },
        };
      });
    },
    [getDuplicateCreditInfo, defaultStaffName, policy.lateDefaultDecision]
  );

  const updateSelection = useCallback((patientId, field, value) => {
    setSelections((prev) => ({
      ...prev,
      [patientId]: {
        ...(prev[patientId] || {
          checked: true,
          status: "",
          completionStatus: "CREDITED",
          authorizedByName: "",
          relapseRisk: "",
        }),
        [field]: value,
      },
    }));
  }, [defaultStaffName]);

  const toggleChecked = useCallback(
    (patientId) => {
      const dupInfo = getDuplicateCreditInfo(patientId);
      setSelections((prev) => {
        if (prev[patientId]?.checked) {
          if (isSinglePatientSession) return {};
          const { [patientId]: _, ...rest } = prev;
          if (chairPatientId === String(patientId)) setChairPatientId(null);
          return rest;
        }
        const initialPatientState = {
          checked: true,
          status: isSessionCancelled ? "cancelled" : "present",
          completionStatus: isSessionCancelled || dupInfo ? "NOT_CREDITED" : "CREDITED",
          arrivalTime: "",
          decisionReason: dupInfo
            ? `Repeat of already completed topic (${dupInfo.curriculumRequirement || dupInfo.topicName}) — no duplicate credit.`
            : "",
          authorizedByName: "",
          isMakeup: false,
          makeupForAttendanceId: "",
          relapseRisk: "",
          drugTestResult: isSessionCancelled ? null : "",
          positiveDrugs: { thc: false, meth: false, ecs: false },
          substanceTested: "",
        };
        if (isSinglePatientSession) {
          return { [patientId]: initialPatientState };
        }
        return { ...prev, [patientId]: initialPatientState };
      });
    },
    [isSinglePatientSession, chairPatientId, getDuplicateCreditInfo, isSessionCancelled, defaultStaffName]
  );

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
    if (isSessionCancelled) return [];
    return Object.entries(selections)
      .filter(([, v]) => v.checked && (v.status === "present" || v.status === "late"))
      .map(([id]) => patients.find((p) => String(p.id) === String(id)))
      .filter(Boolean);
  }, [selections, patients, isSessionCancelled]);

  const absentPatients = useMemo(() => {
    if (isSessionCancelled) return [];
    return Object.entries(selections)
      .filter(([, v]) => v.checked && (v.status === "absent" || v.status === "excused"))
      .map(([id]) => patients.find((p) => String(p.id) === String(id)))
      .filter(Boolean);
  }, [selections, patients, isSessionCancelled]);

  const canProceedStep1 = Boolean(
    session.sessionType &&
      session.sessionDate &&
      (!isSessionCancelled || (session.cancellationReason && session.cancellationReason.trim()))
  );
  const canProceedStep2 = isSinglePatientSession ? selectedCount === 1 : selectedCount > 0;
  const canSave = canProceedStep1 && canProceedStep2;

  function validateStep2() {
    if (isSessionCancelled) return null;
    for (const [pid, sel] of Object.entries(selections)) {
      if (!sel.checked) continue;
      const pObj = patients.find((p) => String(p.id) === String(pid));
      const pName = pObj?.full_name || `Patient #${pid}`;

      if (sel.status === "late" && !sel.arrivalTime) {
        return `Please record the actual arrival time for "${pName}" (marked Late).`;
      }
      if (sel.status === "excused" && (!sel.decisionReason || !sel.decisionReason.trim())) {
        return `Please enter the approved excuse reason for "${pName}" (marked Excused).`;
      }
      if (sel.status === "excused" && (!sel.authorizedByName || !sel.authorizedByName.trim())) {
        return `Please specify the approving staff member for "${pName}" (marked Excused).`;
      }
      if (sel.isMakeup && !sel.makeupForAttendanceId) {
        return `Please link the makeup attendance for "${pName}" to the original missed requirement.`;
      }
    }
    return null;
  }

  function handleNext() {
    if (step === 1 && !canProceedStep1) {
      if (isSessionCancelled && (!session.cancellationReason || !session.cancellationReason.trim())) {
        setError("Please provide a reason for the center session cancellation.");
      } else {
        setError("Please select a session type and date.");
      }
      return;
    }
    if (step === 2) {
      if (!canProceedStep2) {
        setError(isSinglePatientSession ? "Please select exactly one patient." : "Please select at least one patient.");
        return;
      }
      const step2Err = validateStep2();
      if (step2Err) {
        setError(step2Err);
        return;
      }
      // If session is cancelled by center, skip Drug Test step (Step 3) and jump straight to Step 4
      if (isSessionCancelled) {
        setError("");
        setStep(4);
        return;
      }
    }
    if (step === 3 && !isSessionCancelled) {
      const missingResult = attendedPatients.find((p) => {
        const sel = selections[p.id];
        return !sel?.drugTestResult;
      });
      if (missingResult) {
        setError(
          `Please select an explicit Multi-3 drug test result (Negative, Positive, Pending, Invalid, or Not Performed) for "${missingResult.full_name}".`
        );
        return;
      }

      const unselectedPos = attendedPatients.find((p) => {
        const sel = selections[p.id];
        return (
          sel?.drugTestResult === "POSITIVE" &&
          !sel?.positiveDrugs?.thc &&
          !sel?.positiveDrugs?.meth &&
          !sel?.positiveDrugs?.ecs
        );
      });
      if (unselectedPos) {
        setError(
          `Please check at least one positive substance (THC, METH, or ECS) on the Multi-3 checklist for "${unselectedPos.full_name}".`
        );
        return;
      }
    }
    setError("");
    setStep((prev) => Math.min(4, prev + 1));
  }

  function handleBack() {
    setError("");
    if (step === 4 && isSessionCancelled) {
      setStep(2);
      return;
    }
    setStep((prev) => Math.max(1, prev - 1));
  }

  function handleClear() {
    setSession({
      sessionType: "",
      topicId: "",
      topicName: "",
      curriculumRequirement: "",
      facilitatorName: defaultStaffName,
      caseManagerId: "",
      sessionDate: new Date().toISOString().slice(0, 10),
      sessionTime: "",
      sessionStatus: "COMPLETED",
      cancellationReason: "",
      authorizedByName: defaultStaffName,
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
    const step2Err = validateStep2();
    if (step2Err) {
      setError(step2Err);
      setStep(2);
      return;
    }

    setSaving(true);
    setError("");
    try {
      let targetSessionId = session.id;
      if (!targetSessionId) {
        const checkedPatientIds = Object.entries(selections)
          .filter(([, v]) => v.checked)
          .map(([pid]) => Number(pid));

        const { data: sessionData } = await api.post("/sessions", {
          ...session,
          expectedPatientIds: checkedPatientIds,
        });
        targetSessionId = sessionData.id;
      }

      for (const [, v] of Object.entries(selections).filter(([, v]) => v.checked)) {
        if (!isSessionCancelled && !v.status) {
          setError("Please select an attendance status (Present, Late, Absent, or Excused) for each selected patient.");
          setSaving(false);
          return;
        }
        if (v.status === "excused" && !v.decisionReason) {
          setError("Please provide a documented reason for excused absences.");
          setSaving(false);
          return;
        }
      }

      const records = Object.entries(selections)
        .filter(([, v]) => v.checked)
        .map(([patientId, v]) => {
          const dupInfo = getDuplicateCreditInfo(patientId);
          const effectiveStatus = isSessionCancelled ? "cancelled" : v.status;
          const isAttended = effectiveStatus === "present" || effectiveStatus === "late";
          const isPos = isAttended && v.drugTestResult === "POSITIVE";

          let effectiveCompletion = v.completionStatus || (effectiveStatus === "present" ? "CREDITED" : "NOT_CREDITED");
          if (isSessionCancelled || effectiveStatus === "absent" || effectiveStatus === "excused" || dupInfo) {
            effectiveCompletion = "NOT_CREDITED";
          }

          const checkedDrugs = [];
          if (v.positiveDrugs?.thc) checkedDrugs.push("THC (Marijuana)");
          if (v.positiveDrugs?.meth) checkedDrugs.push("METH (Methamphetamine)");
          if (v.positiveDrugs?.ecs) checkedDrugs.push("ECS (Ecstasy)");

          const finalSubstance = isPos
            ? checkedDrugs.length > 0
              ? `Multi-3: ${checkedDrugs.join(", ")}`
              : v.substanceTested || "Multi-3: Positive"
            : isAttended
            ? "Multi-3 Rapid Drug Screen (THC, METH, ECS)"
            : null;

          return {
            patientId,
            status: effectiveStatus,
            completionStatus: effectiveCompletion,
            curriculumRequirement: session.curriculumRequirement || session.topicName || null,
            arrivalTime: effectiveStatus === "late" ? v.arrivalTime || null : null,
            decisionReason:
              isSessionCancelled
                ? session.cancellationReason || "Session cancelled by center — patients not marked absent."
                : dupInfo && !v.decisionReason
                ? `Repeat of already completed topic (${dupInfo.curriculumRequirement || dupInfo.topicName}) — no duplicate credit.`
                : v.decisionReason || null,
            authorizedByName: v.authorizedByName || null,
            isMakeup: isAttended && Boolean(v.isMakeup),
            makeupForAttendanceId: isAttended && v.isMakeup ? v.makeupForAttendanceId || null : null,
            relapseRisk: v.relapseRisk || null,
            staffRiskAssessment: v.staffRiskAssessment || null,
            drugTestResult: isAttended ? v.drugTestResult || null : null,
            positiveDrugs: isAttended ? v.positiveDrugs || { thc: false, meth: false, ecs: false } : null,
            substanceTested: finalSubstance,
            drugTestTime: v.drugTestTime || session.sessionTime || null,
            testedByName: v.testedByName || v.authorizedByName || session.authorizedByName || defaultStaffName,
            drugTestRemarks:
              v.drugTestRemarks ||
              (isPos && checkedDrugs.length > 0
                ? `Positive on Multi-3 Rapid Test for ${checkedDrugs.join(", ")}`
                : null),
            familyAttended: !!v.familyAttended,
            familyMemberName: v.familyMemberName || null,
            isChairperson: chairPatientId === String(patientId),
            remarks,
          };
        });

      await api.post("/attendance/bulk", {
        sessionId: targetSessionId,
        sessionStatus: session.sessionStatus,
        cancellationReason: session.cancellationReason,
        records,
      });
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
            <div style={styles.title}>Record Attendance & Session Completion</div>
            <div style={styles.subtitle}>
              Separate physical attendance from curriculum credit, late rules, excuses, makeups, and repeat topics.
            </div>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose} title="Close">
            ×
          </button>
        </div>

        {/* Horizontal Stepper Navigation */}
        <div style={styles.horizontalStepsBar}>
          {[
            { num: 1, label: "Session & Requirement" },
            { num: 2, label: "Attendance & Credit" },
            { num: 3, label: "Drug Screening" },
            { num: 4, label: "Review & Save" },
          ].map((s, idx) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            const isSkipped = s.num === 3 && isSessionCancelled;
            const canClick =
              !isSkipped &&
              (s.num === 1 ||
                (s.num === 2 && canProceedStep1) ||
                (s.num === 3 && canProceedStep1 && canProceedStep2) ||
                (s.num === 4 && canProceedStep1 && canProceedStep2));

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
                    opacity: isSkipped ? 0.45 : isCompleted ? 0.9 : 1,
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
                    {isSkipped ? "–" : isCompleted ? "✓" : s.num}
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
                  Session Modality <span style={{ color: "#E53E3E" }}>*</span>
                  <select
                    style={styles.selectInput}
                    value={session.sessionType}
                    onChange={(e) => handleSessionTypeChange(e.target.value)}
                    required
                  >
                    <option value="">— Select a session modality —</option>
                    {SESSION_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {session.sessionType && (() => {
                    const cfg = getModalityConfig(session.sessionType);
                    return (
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: "6px",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: cfg.bg,
                          color: cfg.text,
                          border: `1px solid ${cfg.border}`,
                          width: "fit-content",
                        }}
                      >
                        {cfg.label}
                      </span>
                    );
                  })()}
                </label>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Curriculum Requirement Covered (Topic)
                  <select
                    style={styles.selectInput}
                    value={session.topicId || ""}
                    onChange={(e) => {
                      const t = availableTopics.find((item) => String(item.id) === e.target.value);
                      const canonicalReq = t
                        ? `${t.topic_code ? `[${t.topic_code}] ` : ""}${t.title_tagalog}`
                        : "";
                      setSession((prev) => ({
                        ...prev,
                        topicId: e.target.value || "",
                        topicName: t ? t.title_tagalog : "",
                        curriculumRequirement: canonicalReq,
                      }));
                    }}
                    disabled={!session.sessionType}
                  >
                    <option value="">
                      General session (or specify custom requirement below)
                    </option>
                    {availableTopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.topic_code ? `[${t.topic_code}] ` : ""}
                        {t.title_tagalog}
                        {t.category ? ` (${t.category})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Curriculum Requirement Identifier / Competency Note
                  <input
                    type="text"
                    style={styles.textInput}
                    placeholder="e.g., [CBT-01] Sesyon 1. Pag-iskedyul or Individual Counseling Session #4"
                    value={session.curriculumRequirement || ""}
                    onChange={(e) =>
                      setSession((prev) => ({
                        ...prev,
                        curriculumRequirement: e.target.value,
                        topicName: prev.topicName || e.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div style={styles.grid2}>
                <label style={styles.label}>
                  Facilitator / TRC Staff
                  <input
                    type="text"
                    style={styles.textInput}
                    placeholder="Facilitator name"
                    value={session.facilitatorName || ""}
                    onChange={(e) => setSession((prev) => ({ ...prev, facilitatorName: e.target.value }))}
                  />
                </label>

                <label style={styles.label}>
                  Case Manager
                  <select
                    style={styles.selectInput}
                    value={session.caseManagerId}
                    onChange={(e) => setSession((prev) => ({ ...prev, caseManagerId: e.target.value }))}
                  >
                    <option value="">Select a case manager</option>
                    {caseManagers.map((cm) => (
                      <option key={cm.id} value={cm.id}>
                        {cm.full_name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={styles.grid2}>
                <label style={styles.label}>
                  Session Date <span style={{ color: "#E53E3E" }}>*</span>
                  <input
                    type="date"
                    style={styles.textInput}
                    value={session.sessionDate}
                    onChange={(e) => setSession((prev) => ({ ...prev, sessionDate: e.target.value }))}
                  />
                </label>

                <label style={styles.label}>
                  Scheduled Start Time (for Late Arrival Calculation)
                  <input
                    type="time"
                    style={styles.textInput}
                    value={session.sessionTime}
                    onChange={(e) => setSession((prev) => ({ ...prev, sessionTime: e.target.value }))}
                  />
                </label>
              </div>

              {/* Center Cancelled Session Option */}
              <div
                style={{
                  ...styles.cancelSessionBox,
                  borderColor: isSessionCancelled ? "#F59E0B" : "#E2E8F0",
                  background: isSessionCancelled ? "#FFFBEB" : "#F8FAFC",
                }}
              >
                <label style={styles.cancelToggleLabel}>
                  <input
                    type="checkbox"
                    checked={isSessionCancelled}
                    onChange={(e) => {
                      const cancelled = e.target.checked;
                      setSession((prev) => ({
                        ...prev,
                        sessionStatus: cancelled ? "CANCELLED" : "COMPLETED",
                      }));
                    }}
                    style={{ width: 16, height: 16, accentColor: "#D97706", cursor: "pointer" }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#1E293B" }}>
                      Center Cancelled the Session
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#64748B" }}>
                      Record a center-cancelled session so scheduled patients are NOT marked absent or penalized.
                    </div>
                  </div>
                </label>

                {isSessionCancelled && (
                  <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "10px" }}>
                    <label style={styles.label}>
                      Cancellation Reason <span style={{ color: "#E53E3E" }}>*</span>
                      <input
                        type="text"
                        style={styles.textInput}
                        placeholder="e.g., Weather suspension, facility power outage, staff emergency"
                        value={session.cancellationReason || ""}
                        onChange={(e) =>
                          setSession((prev) => ({ ...prev, cancellationReason: e.target.value }))
                        }
                      />
                    </label>
                    <label style={styles.label}>
                      Authorized / Approving Staff
                      <input
                        type="text"
                        style={styles.textInput}
                        placeholder="Approving supervisor / CM"
                        value={session.authorizedByName || ""}
                        onChange={(e) =>
                          setSession((prev) => ({ ...prev, authorizedByName: e.target.value }))
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              {isSessionCancelled ? (
                <div style={styles.calloutCancelled}>
                  <span style={{ fontSize: 16 }}>🚫</span>
                  <span>
                    <strong>Center Cancelled Session:</strong> Select the scheduled patients below. They will be recorded as{" "}
                    <strong>Session Cancelled</strong> (not Absent) with no negative attendance impact.
                  </span>
                </div>
              ) : isSinglePatientSession ? (
                <div style={styles.calloutSingle}>
                  <span>
                    <strong>1-on-1 session.</strong> Select the patient, their physical attendance status, and whether curriculum credit is granted.
                  </span>
                </div>
              ) : (
                <div style={styles.calloutGroup}>
                  <span>
                    <strong>Group session.</strong> Record each client's physical attendance (Present, Late, Excused, Absent) separately from their completion decision (Credited, Pending Review, Not Credited).
                  </span>
                </div>
              )}

              {/* Quick Policy Reference Bar */}
              {!isSessionCancelled && (
                <div style={styles.policyHintBar}>
                  <span>
                    <strong>MTRC Participation Rule:</strong> Grace period{" "}
                    <strong>{policy.lateGraceMinutes} mins</strong> · Repeat topics auto-flagged (no duplicate credit) · Makeup sessions link to original missed requirement.
                  </span>
                </div>
              )}

              {/* Expected Roster Denominator Status Banner */}
              {expectedRosterIds.length > 0 && (() => {
                const checkedExpectedCount = expectedRosterIds.filter((id) => selections[id]?.checked).length;
                const unselectedExpectedCount = expectedRosterIds.length - checkedExpectedCount;
                return (
                  <div
                    style={{
                      background: unselectedExpectedCount > 0 ? "#F4F7F4" : "#F0FDF4",
                      border: `1px solid ${unselectedExpectedCount > 0 ? "#CBDAD0" : "#BBF7D0"}`,
                      borderRadius: "8px",
                      padding: "10px 14px",
                      marginBottom: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "12.5px", color: unselectedExpectedCount > 0 ? "#2D4A3E" : "#166534" }}>
                        {unselectedExpectedCount > 0
                          ? `Expected Roster: ${checkedExpectedCount} of ${expectedRosterIds.length} patients selected`
                          : `All ${expectedRosterIds.length} expected patients are included in this recording`}
                      </div>
                      {unselectedExpectedCount > 0 && (
                        <div style={{ fontSize: "11.5px", color: "#475569", marginTop: "2px" }}>
                          The {unselectedExpectedCount} unselected patient(s) will remain marked as <strong>Not Yet Recorded / Unresolved</strong>. They will NOT be quietly assumed absent.
                        </div>
                      )}
                    </div>
                    {unselectedExpectedCount > 0 && (
                      <button
                        type="button"
                        style={{
                          background: "#166534",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "5px 10px",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => {
                          setSelections((prev) => {
                            const next = { ...prev };
                            for (const id of expectedRosterIds) {
                              if (!next[id]) {
                                next[id] = { checked: true, status: "", completionStatus: "CREDITED", relapseRisk: "", drugTestResult: "" };
                              } else {
                                next[id] = { ...next[id], checked: true };
                              }
                            }
                            return next;
                          });
                        }}
                      >
                        Select All Expected ({expectedRosterIds.length})
                      </button>
                    )}
                  </div>
                );
              })()}

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
                    const dupInfo = getDuplicateCreditInfo(p.id);
                    const outstandingList = outstandingByPatient[p.id] || [];
                    const minsLate =
                      sel?.status === "late"
                        ? computeMinutesLate(session.sessionTime, sel?.arrivalTime)
                        : null;

                    return (
                      <div
                        key={p.id}
                        style={{
                          ...styles.patientItem,
                          background: isChecked ? "#F8FAFC" : "#ffffff",
                          borderLeft: isChecked ? "3px solid #164E33" : "3px solid transparent",
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
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <span style={{ ...styles.patientName, fontWeight: isChecked ? 700 : 500 }}>
                                  {p.full_name}
                                </span>
                                {dupInfo && (
                                  <span
                                    style={styles.dupTopicBadge}
                                    title={`Patient already received credit for "${dupInfo.curriculumRequirement || dupInfo.topicName}" on ${dupInfo.sessionDate}. Duplicate curriculum credit is prevented.`}
                                  >
                                    🔁 Repeat Topic (Credited {dupInfo.sessionDate} — No Dup Credit)
                                  </span>
                                )}
                                {!dupInfo && outstandingList.length > 0 && (
                                  <span
                                    style={styles.outstandingBadge}
                                    title={`Patient has ${outstandingList.length} unfulfilled missed/excused requirement(s) eligible for makeup.`}
                                  >
                                    📌 {outstandingList.length} Missed/Outstanding Req.
                                  </span>
                                )}
                              </div>
                              <div style={styles.patientMeta}>
                                {p.patient_code}
                                {p.pwud_code ? ` · ${p.pwud_code}` : ""}
                                {p.case_manager_name ? ` · CM: ${p.case_manager_name}` : ""}
                              </div>
                            </div>
                          </label>
                        </div>

                        {isChecked && isSessionCancelled && (
                          <div style={styles.patientControls}>
                            <span style={styles.cancelledPill}>
                              🚫 Attendance: Session Cancelled (Not Absent)
                            </span>
                            <span style={styles.notCreditedPill}>
                              Completion: Not Credited (Session Cancelled)
                            </span>
                          </div>
                        )}

                        {isChecked && !isSessionCancelled && (
                          <div style={styles.patientControlsContainer}>
                            {/* Primary Row: Attendance Status + Completion Decision + Relapse Risk + Drug Test */}
                            <div style={styles.patientControls}>
                              {/* 1. Physical Attendance Status */}
                              <div style={styles.controlGroupInline}>
                                <span style={styles.controlMiniLabel}>Attendance:</span>
                                <select
                                  style={{
                                    ...styles.pillSelect,
                                    fontWeight: 700,
                                    background:
                                      sel.status === "present"
                                        ? "#ECFDF5"
                                        : sel.status === "late"
                                        ? "#FFFBEB"
                                        : sel.status === "excused"
                                        ? "#F5F3FF"
                                        : "#FEF2F2",
                                    color:
                                      sel.status === "present"
                                        ? "#065F46"
                                        : sel.status === "late"
                                        ? "#92400E"
                                        : sel.status === "excused"
                                        ? "#5B21B6"
                                        : "#991B1B",
                                    borderColor:
                                      sel.status === "present"
                                        ? "#A7F3D0"
                                        : sel.status === "late"
                                        ? "#FCD34D"
                                        : sel.status === "excused"
                                        ? "#DDD6FE"
                                        : "#FCA5A5",
                                  }}
                                  value={sel.status}
                                  onChange={(e) => toggleStatus(p.id, e.target.value)}
                                  title="Physical Attendance Status"
                                >
                                  {STATUS_OPTIONS.map((s) => (
                                    <option key={s.value} value={s.value}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* 2. Separate Completion Decision */}
                              <div style={styles.controlGroupInline}>
                                <span style={styles.controlMiniLabel}>Completion:</span>
                                {dupInfo ? (
                                  <span
                                    style={styles.notCreditedPill}
                                    title="Duplicate curriculum credit is automatically prevented for repeated topics."
                                  >
                                    Not Credited (Repeat Topic)
                                  </span>
                                ) : sel.status === "absent" ? (
                                  <span style={styles.notCreditedPill}>
                                    Not Credited (Absent)
                                  </span>
                                ) : sel.status === "excused" ? (
                                  <span style={styles.notCreditedPill}>
                                    Not Credited (Remains Outstanding)
                                  </span>
                                ) : (
                                  <select
                                    style={{
                                      ...styles.pillSelect,
                                      fontWeight: 700,
                                      background:
                                        sel.completionStatus === "CREDITED"
                                          ? "#E8F5E9"
                                          : sel.completionStatus === "PENDING_REVIEW"
                                          ? "#F8FAF8"
                                          : "#FBF3F3",
                                      color:
                                        sel.completionStatus === "CREDITED"
                                          ? "#166534"
                                          : sel.completionStatus === "PENDING_REVIEW"
                                          ? "#2D4A3E"
                                          : "#7F2323",
                                      borderColor:
                                        sel.completionStatus === "CREDITED"
                                          ? "#A7F3D0"
                                          : sel.completionStatus === "PENDING_REVIEW"
                                          ? "#CBDAD0"
                                          : "#F0C4C4",
                                    }}
                                    value={sel.completionStatus || "CREDITED"}
                                    onChange={(e) =>
                                      updateSelection(p.id, "completionStatus", e.target.value)
                                    }
                                    title="Curriculum Completion Decision"
                                  >
                                    {COMPLETION_OPTIONS.map((c) => (
                                      <option key={c.value} value={c.value}>
                                        {c.label}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>

                              {/* 3. Makeup Session Toggle (for Present / Late) */}
                              {(sel.status === "present" || sel.status === "late") && (
                                <label
                                  style={{
                                    ...styles.makeupCheckLabel,
                                    background: sel.isMakeup ? "#F0FDF4" : "#F8FAFC",
                                    borderColor: sel.isMakeup ? "#BBF7D0" : "#CBD5E0",
                                    color: sel.isMakeup ? "#166534" : "#475569",
                                  }}
                                  title="Link this attendance as a makeup for an earlier missed/excused requirement"
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(sel.isMakeup)}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      updateSelection(p.id, "isMakeup", checked);
                                      if (checked && outstandingList.length > 0 && !sel.makeupForAttendanceId) {
                                        updateSelection(
                                          p.id,
                                          "makeupForAttendanceId",
                                          String(outstandingList[0].attendanceId)
                                        );
                                      }
                                    }}
                                  />
                                  Makeup
                                </label>
                              )}

                              {/* 4. Client Self-Reported Craving / Relapse Risk */}
                              <select
                                style={{
                                  ...styles.pillSelect,
                                  background:
                                    sel.relapseRisk === "USED"
                                      ? "#FBF3F3"
                                      : sel.relapseRisk === "NEARLY_USED"
                                      ? "#F4F7F4"
                                      : sel.relapseRisk === "AT_RISK"
                                      ? "#F4F7F4"
                                      : "#F0FDF4",
                                  color:
                                    sel.relapseRisk === "USED"
                                      ? "#7F2323"
                                      : sel.relapseRisk === "NEARLY_USED"
                                      ? "#2D4A3E"
                                      : sel.relapseRisk === "AT_RISK"
                                      ? "#374151"
                                      : "#166534",
                                  fontWeight: 600,
                                  borderColor:
                                    sel.relapseRisk === "USED"
                                      ? "#F0C4C4"
                                      : sel.relapseRisk === "NEARLY_USED"
                                      ? "#CBDAD0"
                                      : sel.relapseRisk === "AT_RISK"
                                      ? "#CBDAD0"
                                      : "#BBF7D0",
                                }}
                                value={sel.relapseRisk || ""}
                                onChange={(e) => updateSelection(p.id, "relapseRisk", e.target.value)}
                                title="Client Self-Reported Craving / Relapse Risk Status (Distinguishes Near-Use/Craving from Actual Use)"
                              >
                                <option value="">— Unanswered / Not Assessed —</option>
                                <option value="SAFE">Self: Safe / Abstinent</option>
                                <option value="AT_RISK">Self: At Risk (Triggers — No Use)</option>
                                <option value="NEARLY_USED">Self: Nearly Used / Craving (No Use)</option>
                                <option value="USED">Self: Used / Slip (Actual Use)</option>
                              </select>

                              {/* 4B. Staff Clinical Risk Assessment (Separate from Self-Report & Drug Test) */}
                              <select
                                style={{
                                  ...styles.pillSelect,
                                  background: sel.staffRiskAssessment ? "#F0FDF4" : "#F8FAFC",
                                  color: sel.staffRiskAssessment ? "#166534" : "#475569",
                                  fontWeight: 600,
                                  borderColor: sel.staffRiskAssessment ? "#BBF7D0" : "#CBD5E1",
                                }}
                                value={sel.staffRiskAssessment || ""}
                                onChange={(e) => updateSelection(p.id, "staffRiskAssessment", e.target.value)}
                                title="Staff Clinical Risk Assessment (Separate from Client Self-Report and Drug Test)"
                              >
                                <option value="">Staff Risk: Optional…</option>
                                <option value="LOW_RISK">Staff: Low Risk</option>
                                <option value="MODERATE_RISK">Staff: Moderate Risk</option>
                                <option value="HIGH_RISK">Staff: High Risk</option>
                                <option value="ACUTE_RELAPSE_RISK">Staff: Acute Relapse Risk</option>
                              </select>

                              {/* 5. Post-Session Drug Screening Result (Present/Late) */}
                              {(sel.status === "present" || sel.status === "late") && (
                                <select
                                  style={{
                                    ...styles.pillSelect,
                                    background:
                                      sel.drugTestResult === "POSITIVE"
                                        ? "#FEE2E2"
                                        : sel.drugTestResult === "NEGATIVE"
                                        ? "#ECFDF5"
                                        : sel.drugTestResult
                                        ? "#FEF3C7"
                                        : "#F8FAFC",
                                    color:
                                      sel.drugTestResult === "POSITIVE"
                                        ? "#991B1B"
                                        : sel.drugTestResult === "NEGATIVE"
                                        ? "#065F46"
                                        : sel.drugTestResult
                                        ? "#92400E"
                                        : "#475569",
                                    fontWeight: 600,
                                    borderColor:
                                      sel.drugTestResult === "POSITIVE"
                                        ? "#FCA5A5"
                                        : sel.drugTestResult === "NEGATIVE"
                                        ? "#A7F3D0"
                                        : "#CBD5E1",
                                  }}
                                  value={sel.drugTestResult || ""}
                                  onChange={(e) => setPatientDrugTestResult(p.id, e.target.value)}
                                  title="Post-Session Urine Drug Screening Result (Multi-3 Test)"
                                >
                                  <option value="">🧪 Multi-3: Select Result…</option>
                                  <option value="NEGATIVE">🧪 Multi-3: Negative</option>
                                  <option value="POSITIVE">🧪 Multi-3: Positive</option>
                                  <option value="PENDING">🧪 Multi-3: Pending</option>
                                  <option value="INVALID">🧪 Multi-3: Invalid</option>
                                  <option value="NOT_PERFORMED">🧪 Multi-3: Not Performed</option>
                                </select>
                              )}

                              {/* Family Attendance in Psycho-Education */}
                              {session.sessionType === "PSYCHO_EDUCATION" && (
                                <div style={styles.familyBadge}>
                                  <label style={styles.familyLabel}>
                                    <input
                                      type="checkbox"
                                      checked={Boolean(sel.familyAttended)}
                                      onChange={(e) =>
                                        updateSelection(p.id, "familyAttended", e.target.checked)
                                      }
                                    />
                                    👨‍👩‍👧 Family
                                  </label>
                                  {sel.familyAttended && (
                                    <input
                                      type="text"
                                      style={styles.familyNameInput}
                                      placeholder="Spouse/Parent Name"
                                      value={sel.familyMemberName || ""}
                                      onChange={(e) =>
                                        updateSelection(p.id, "familyMemberName", e.target.value)
                                      }
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
                                      cursor:
                                        (p.shgm_chaired_count || 0) >= 5 ? "not-allowed" : "pointer",
                                      color:
                                        (p.shgm_chaired_count || 0) >= 5 ? "#A0AEC0" : "#1B4D3E",
                                    }}
                                    title={
                                      (p.shgm_chaired_count || 0) >= 5
                                        ? "Max 5-session term limit reached (ENTREPOSE Vol. 1 Sec 5.5.3)"
                                        : "Designate meeting chairperson"
                                    }
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

                            {/* Situation-Specific Detail Sub-Panel */}
                            {/* A. LATE ARRIVAL DETAILS */}
                            {sel.status === "late" && (
                              <div style={styles.detailSubPanelAmber}>
                                <div style={styles.detailSubHeader}>
                                  <span>
                                    ⏰ <strong>Late Arrival Participation Rule</strong>
                                    {minsLate !== null && (
                                      <span style={{ marginLeft: 8, fontWeight: 700, color: minsLate > policy.lateGraceMinutes ? "#B45309" : "#047857" }}>
                                        ({minsLate} mins after {session.sessionTime} — {minsLate <= policy.lateGraceMinutes ? `Within ${policy.lateGraceMinutes}m grace` : `Exceeds ${policy.lateGraceMinutes}m grace`})
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div style={styles.detailGrid3}>
                                  <label style={styles.miniFieldLabel}>
                                    Actual Arrival Time <span style={{ color: "#DC2626" }}>*</span>
                                    <input
                                      type="time"
                                      style={styles.miniInput}
                                      value={sel.arrivalTime || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateSelection(p.id, "arrivalTime", val);
                                        const diff = computeMinutesLate(session.sessionTime, val);
                                        if (diff !== null && !dupInfo) {
                                          if (diff <= policy.lateGraceMinutes) {
                                            updateSelection(p.id, "completionStatus", "CREDITED");
                                          } else if (diff > policy.maxLateForAutoReviewMinutes) {
                                            updateSelection(p.id, "completionStatus", "NOT_CREDITED");
                                          } else {
                                            updateSelection(p.id, "completionStatus", "PENDING_REVIEW");
                                          }
                                        }
                                      }}
                                    />
                                  </label>
                                  <label style={styles.miniFieldLabel}>
                                    Reason for Credit Decision
                                    <input
                                      type="text"
                                      style={styles.miniInput}
                                      placeholder="e.g., Completed core group activity / Missed 40m lecture"
                                      value={sel.decisionReason || ""}
                                      onChange={(e) =>
                                        updateSelection(p.id, "decisionReason", e.target.value)
                                      }
                                    />
                                  </label>
                                  <label style={styles.miniFieldLabel}>
                                    Authorized Staff Member
                                    <input
                                      type="text"
                                      style={styles.miniInput}
                                      placeholder="Case Manager / Supervisor"
                                      value={sel.authorizedByName || ""}
                                      onChange={(e) =>
                                        updateSelection(p.id, "authorizedByName", e.target.value)
                                      }
                                    />
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* B. APPROVED EXCUSE DETAILS */}
                            {sel.status === "excused" && (
                              <div style={styles.detailSubPanelPurple}>
                                <div style={styles.detailSubHeader}>
                                  <span>
                                    📋 <strong>Approved Excuse:</strong> Requirement remains outstanding until fulfilled via makeup.
                                  </span>
                                </div>
                                <div style={styles.detailGrid2}>
                                  <label style={styles.miniFieldLabel}>
                                    Approved Excuse Reason <span style={{ color: "#DC2626" }}>*</span>
                                    <input
                                      type="text"
                                      style={styles.miniInput}
                                      placeholder="e.g., Medical certificate, court appearance, LGU obligation"
                                      value={sel.decisionReason || ""}
                                      onChange={(e) =>
                                        updateSelection(p.id, "decisionReason", e.target.value)
                                      }
                                    />
                                  </label>
                                  <label style={styles.miniFieldLabel}>
                                    Approving Staff Member <span style={{ color: "#DC2626" }}>*</span>
                                    <input
                                      type="text"
                                      style={styles.miniInput}
                                      placeholder="Approving Case Manager / Supervisor"
                                      value={sel.authorizedByName || ""}
                                      onChange={(e) =>
                                        updateSelection(p.id, "authorizedByName", e.target.value)
                                      }
                                    />
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* C. PRESENT BUT CREDIT WITHHELD OR PENDING REVIEW */}
                            {sel.status === "present" &&
                              !dupInfo &&
                              (sel.completionStatus === "NOT_CREDITED" ||
                                sel.completionStatus === "PENDING_REVIEW") && (
                                <div style={styles.detailSubPanelAmber}>
                                  <div style={styles.detailSubHeader}>
                                    <span>
                                      ⚖️{" "}
                                      <strong>
                                        {sel.completionStatus === "PENDING_REVIEW"
                                          ? "Participation Pending Review"
                                          : "Credit Withheld (Not Credited)"}
                                      </strong>
                                    </span>
                                  </div>
                                  <div style={styles.detailGrid2}>
                                    <label style={styles.miniFieldLabel}>
                                      Reason Credit Withheld / Pending
                                      <input
                                        type="text"
                                        style={styles.miniInput}
                                        placeholder="e.g., Left early before worksheet completion; awaiting CM review"
                                        value={sel.decisionReason || ""}
                                        onChange={(e) =>
                                          updateSelection(p.id, "decisionReason", e.target.value)
                                        }
                                      />
                                    </label>
                                    <label style={styles.miniFieldLabel}>
                                      Authorized Staff Member
                                      <input
                                        type="text"
                                        style={styles.miniInput}
                                        placeholder="Case Manager / Supervisor"
                                        value={sel.authorizedByName || ""}
                                        onChange={(e) =>
                                          updateSelection(p.id, "authorizedByName", e.target.value)
                                        }
                                      />
                                    </label>
                                  </div>
                                </div>
                              )}

                            {/* D. MAKEUP LINKAGE SUB-PANEL */}
                            {(sel.status === "present" || sel.status === "late") && sel.isMakeup && (
                              <div style={styles.detailSubPanelBlue}>
                                <div style={styles.detailSubHeader}>
                                  <span>
                                    🔄 <strong>Makeup Attendance Linkage:</strong> Original absence remains in history; curriculum requirement is credited once accepted.
                                  </span>
                                </div>
                                <div style={styles.detailGrid2}>
                                  <label style={styles.miniFieldLabel}>
                                    Link to Original Missed / Unfulfilled Requirement{" "}
                                    <span style={{ color: "#DC2626" }}>*</span>
                                    {outstandingList.length > 0 ? (
                                      <select
                                        style={styles.miniInput}
                                        value={sel.makeupForAttendanceId || ""}
                                        onChange={(e) =>
                                          updateSelection(
                                            p.id,
                                            "makeupForAttendanceId",
                                            e.target.value
                                          )
                                        }
                                      >
                                        <option value="">
                                          — Select missed/outstanding requirement —
                                        </option>
                                        {outstandingList.map((item) => (
                                          <option
                                            key={item.attendanceId}
                                            value={String(item.attendanceId)}
                                          >
                                            {item.sessionDate} · {item.requirement} ({item.status.toUpperCase()})
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        type="number"
                                        style={styles.miniInput}
                                        placeholder="Original Attendance ID (no unfulfilled absences found)"
                                        value={sel.makeupForAttendanceId || ""}
                                        onChange={(e) =>
                                          updateSelection(
                                            p.id,
                                            "makeupForAttendanceId",
                                            e.target.value
                                          )
                                        }
                                      />
                                    )}
                                  </label>
                                  <label style={styles.miniFieldLabel}>
                                    Authorized Staff & Makeup Reason
                                    <input
                                      type="text"
                                      style={styles.miniInput}
                                      placeholder="e.g., Approved 1-on-1/cohort makeup session"
                                      value={sel.decisionReason || ""}
                                      onChange={(e) =>
                                        updateSelection(p.id, "decisionReason", e.target.value)
                                      }
                                    />
                                  </label>
                                </div>
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
                  ? selectedCount === 1
                    ? "1 of 1 patient selected"
                    : "0 of 1 patient selected"
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
                      Every present/late client is drug tested after each session using the Multi-3 rapid test kit (THC, METH, ECS). Record if each client tested positive or negative, and specify reactive substance(s).
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
                                substanceTested: "Multi-3 Rapid Drug Screen (THC, METH, ECS)",
                              };
                            }
                          }
                          return updated;
                        });
                      }}
                      title="Set all attended clients to Negative"
                    >
                      Mark All Negative
                    </button>
                  )}
                </div>

                {/* Summary counters */}
                <div style={styles.dtSummaryRow}>
                  <span style={styles.dtBadgeTotal}>Attended: {attendedPatients.length}</span>
                  <span style={styles.dtBadgeNeg}>
                    Negative:{" "}
                    {attendedPatients.filter((p) => selections[p.id]?.drugTestResult === "NEGATIVE").length}
                  </span>
                  <span style={styles.dtBadgePos}>
                    Positive:{" "}
                    {attendedPatients.filter((p) => selections[p.id]?.drugTestResult === "POSITIVE").length}
                  </span>
                  <span style={{ ...styles.dtBadgeTotal, background: "#F4F7F4", color: "#2D4A3E", border: "1px solid #CBDAD0" }}>
                    Unselected / Other:{" "}
                    {
                      attendedPatients.filter(
                        (p) =>
                          selections[p.id]?.drugTestResult !== "NEGATIVE" &&
                          selections[p.id]?.drugTestResult !== "POSITIVE"
                      ).length
                    }
                  </span>
                </div>
              </div>

              {/* Attended Patients Test List */}
              {attendedPatients.length === 0 ? (
                <div style={styles.emptyPatients}>
                  No clients marked present or late for this session. (All selected clients were marked absent or excused).
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
                          borderColor: isPositive
                            ? "#FEB2B2"
                            : !sel.drugTestResult
                            ? "#FCD34D"
                            : "#CBD5E0",
                          background: isPositive ? "#FFF5F5" : "#ffffff",
                        }}
                      >
                        <div style={styles.dtPatientRowTop}>
                          <div>
                            <div style={styles.dtPatientName}>{p.full_name}</div>
                            <div style={styles.dtPatientMeta}>
                              {p.patient_code}
                              {p.case_manager_name ? ` · CM: ${p.case_manager_name}` : ""}
                              {" · "}
                              <span>
                                Session: {session.sessionDate} {session.sessionTime || ""}
                              </span>
                            </div>
                          </div>

                          {/* Explicit Multi-3 Result Buttons */}
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              style={{
                                ...styles.dtToggleBtn,
                                ...(sel.drugTestResult === "NEGATIVE"
                                  ? styles.dtToggleBtnNegActive
                                  : styles.dtToggleBtnInactive),
                              }}
                              onClick={() => setPatientDrugTestResult(p.id, "NEGATIVE")}
                            >
                              Negative
                            </button>

                            <button
                              type="button"
                              style={{
                                ...styles.dtToggleBtn,
                                ...(isPositive ? styles.dtToggleBtnPosActive : styles.dtToggleBtnInactive),
                              }}
                              onClick={() => setPatientDrugTestResult(p.id, "POSITIVE")}
                            >
                              Positive
                            </button>

                            <select
                              style={{
                                ...styles.pillSelect,
                                fontSize: 12,
                                fontWeight: 700,
                                background:
                                  sel.drugTestResult === "PENDING" ||
                                  sel.drugTestResult === "INVALID" ||
                                  sel.drugTestResult === "NOT_PERFORMED"
                                    ? "#F4F7F4"
                                    : "#F8FAFC",
                                color: "#2D4A3E",
                                borderColor: "#CBDAD0",
                              }}
                              value={
                                ["PENDING", "INVALID", "NOT_PERFORMED"].includes(sel.drugTestResult)
                                  ? sel.drugTestResult
                                  : ""
                              }
                              onChange={(e) => {
                                if (e.target.value) setPatientDrugTestResult(p.id, e.target.value);
                              }}
                            >
                              <option value="">Other State…</option>
                              <option value="PENDING">Pending</option>
                              <option value="INVALID">Invalid</option>
                              <option value="NOT_PERFORMED">Not Performed</option>
                            </select>
                          </div>
                        </div>

                        {isPositive ? (
                          <div style={styles.dtPositiveAlertBox}>
                            <div style={styles.dtAlertTitle}>
                              Positive Multi-3 Rapid Urine Drug Test Flagged
                            </div>
                            <div style={styles.dtAlertText}>
                              A clinical alert will be dispatched to assigned Case Manager ({p.case_manager_name || "Assigned CM"}). Please check the specific substance(s) tested positive on the Multi-3 rapid test kit:
                            </div>

                            <div style={styles.multi3ChecklistSection}>
                              <div style={styles.multi3ChecklistTitle}>
                                <span>Multi-3 Test Checklist (Check all reactive panels):</span>
                                <span style={{ fontSize: "11px", fontWeight: 600, color: "#7F1D1D" }}>
                                  Kit: THC / METH / ECS
                                </span>
                              </div>
                              <div style={styles.multi3ChecklistGrid}>
                                {/* THC */}
                                <label
                                  style={{
                                    ...styles.multi3CheckItem,
                                    borderColor: sel.positiveDrugs?.thc ? "#DC2626" : "#CBD5E0",
                                    background: sel.positiveDrugs?.thc ? "#FEF2F2" : "#FFFFFF",
                                  }}
                                >
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
                                    <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>
                                      Tetrahydrocannabinol
                                    </div>
                                  </div>
                                </label>

                                {/* METH */}
                                <label
                                  style={{
                                    ...styles.multi3CheckItem,
                                    borderColor: sel.positiveDrugs?.meth ? "#DC2626" : "#CBD5E0",
                                    background: sel.positiveDrugs?.meth ? "#FEF2F2" : "#FFFFFF",
                                  }}
                                >
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
                                    <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>
                                      Methamphetamine
                                    </div>
                                  </div>
                                </label>

                                {/* ECS */}
                                <label
                                  style={{
                                    ...styles.multi3CheckItem,
                                    borderColor: sel.positiveDrugs?.ecs ? "#DC2626" : "#CBD5E0",
                                    background: sel.positiveDrugs?.ecs ? "#FEF2F2" : "#FFFFFF",
                                  }}
                                >
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

                              {!sel.positiveDrugs?.thc &&
                                !sel.positiveDrugs?.meth &&
                                !sel.positiveDrugs?.ecs && (
                                  <div style={styles.multi3Warning}>
                                    Please select at least one positive substance (THC, METH, or ECS).
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
                        ) : sel.drugTestResult === "NEGATIVE" ? (
                          <div style={styles.dtNegativeCleanBar}>
                            <span style={{ fontSize: "12px", color: "#166534", fontWeight: 600 }}>
                              Negative (Multi-3 Kit): No THC, METH, or ECS metabolites detected.
                            </span>
                          </div>
                        ) : sel.drugTestResult ? (
                          <div style={{ ...styles.dtNegativeCleanBar, background: "#F4F7F4", borderTop: "1px solid #CBDAD0" }}>
                            <span style={{ fontSize: "12px", color: "#2D4A3E", fontWeight: 600 }}>
                              {sel.drugTestResult === "PENDING"
                                ? "Result Pending: Awaiting confirmatory / clinical review."
                                : sel.drugTestResult === "INVALID"
                                ? "Invalid Specimen: Repeat Multi-3 collection required."
                                : "Test Not Performed during this session visit."}
                            </span>
                          </div>
                        ) : (
                          <div style={{ ...styles.dtNegativeCleanBar, background: "#F4F7F4", borderTop: "1px solid #CBDAD0" }}>
                            <span style={{ fontSize: "12px", color: "#374151", fontWeight: 600 }}>
                              Explicit selection required: Choose Negative, Positive, Pending, Invalid, or Not Performed above (or click "Mark All Negative").
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
                  <span style={{ fontWeight: 600 }}>
                    Exempt from post-session screening ({absentPatients.length} client(s) absent/excused):
                  </span>{" "}
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
                <div style={styles.summaryTitle}>
                  Session & Curriculum Completion Summary
                </div>
                <div style={styles.summaryRow}>
                  <span>Session Status:</span>
                  <strong style={{ color: isSessionCancelled ? "#475569" : "#166534" }}>
                    {isSessionCancelled
                      ? `Center Cancelled (${session.cancellationReason})`
                      : "Conducted / Completed"}
                  </strong>
                </div>
                <div style={styles.summaryRow}>
                  <span>Modality:</span>
                  {(() => {
                    const cfg = getModalityConfig(session.sessionType);
                    return (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: cfg.bg,
                          color: cfg.text,
                          border: `1px solid ${cfg.border}`,
                        }}
                      >
                        {cfg.label}
                      </span>
                    );
                  })()}
                </div>
                <div style={styles.summaryRow}>
                  <span>Curriculum Requirement:</span>
                  <strong>
                    {session.curriculumRequirement || session.topicName || "General session"}
                  </strong>
                </div>
                <div style={styles.summaryRow}>
                  <span>Date & Start Time:</span>
                  <strong>
                    {session.sessionDate} {session.sessionTime || ""}
                  </strong>
                </div>

                {!isSessionCancelled ? (
                  <>
                    <div style={styles.summaryRow}>
                      <span>Physical Attendance Breakdown:</span>
                      <strong>
                        {
                          Object.values(selections).filter((s) => s.checked && s.status === "present")
                            .length
                        }{" "}
                        Present ·{" "}
                        {
                          Object.values(selections).filter((s) => s.checked && s.status === "late")
                            .length
                        }{" "}
                        Late ·{" "}
                        {
                          Object.values(selections).filter((s) => s.checked && s.status === "excused")
                            .length
                        }{" "}
                        Excused ·{" "}
                        {
                          Object.values(selections).filter((s) => s.checked && s.status === "absent")
                            .length
                        }{" "}
                        Absent
                      </strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Completion Decision Breakdown:</span>
                      <strong>
                        <span style={{ color: "#166534" }}>
                          {
                            Object.entries(selections).filter(
                              ([pid, s]) =>
                                s.checked &&
                                (s.status === "present" || s.status === "late") &&
                                !getDuplicateCreditInfo(pid) &&
                                s.completionStatus === "CREDITED"
                            ).length
                          }{" "}
                          Credited
                        </span>{" "}
                        ·{" "}
                        <span style={{ color: "#B45309" }}>
                          {
                            Object.entries(selections).filter(
                              ([pid, s]) =>
                                s.checked &&
                                !getDuplicateCreditInfo(pid) &&
                                s.completionStatus === "PENDING_REVIEW"
                            ).length
                          }{" "}
                          Pending Review
                        </span>{" "}
                        ·{" "}
                        <span style={{ color: "#991B1B" }}>
                          {
                            Object.entries(selections).filter(
                              ([pid, s]) =>
                                s.checked &&
                                (s.status === "absent" ||
                                  s.status === "excused" ||
                                  Boolean(getDuplicateCreditInfo(pid)) ||
                                  s.completionStatus === "NOT_CREDITED")
                            ).length
                          }{" "}
                          Not Credited
                        </span>
                      </strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Linked Makeups / Repeat Topics:</span>
                      <strong>
                        {
                          Object.values(selections).filter(
                            (s) => s.checked && (s.status === "present" || s.status === "late") && s.isMakeup
                          ).length
                        }{" "}
                        Makeup(s) ·{" "}
                        {
                          Object.keys(selections).filter(
                            (pid) => selections[pid]?.checked && Boolean(getDuplicateCreditInfo(pid))
                          ).length
                        }{" "}
                        Repeat Topic(s) (No Dup Credit)
                      </strong>
                    </div>
                  </>
                ) : (
                  <div style={styles.summaryRow}>
                    <span>Patients Protected from Absence:</span>
                    <strong>{selectedCount} patient(s) marked Session Cancelled</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button type="button" style={styles.clearBtn} onClick={handleClear}>
            Clear
          </button>

          <div style={{ flex: 1 }} />

          {step > 1 && (
            <button type="button" style={styles.secondaryBtn} onClick={handleBack}>
              Back
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              style={{
                ...styles.primaryBtn,
                ...((step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)
                  ? styles.btnDisabled
                  : {}),
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
              {saving ? "Saving…" : "Save Attendance & Completion"}
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
    width: "780px",
    maxWidth: "96vw",
    maxHeight: "92vh",
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
    fontSize: "12.5px",
    color: "#64748B",
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
    fontWeight: 600,
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
    fontSize: "12.5px",
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
  cancelSessionBox: {
    border: "1px solid #E2E8F0",
    borderRadius: "10px",
    padding: "12px 14px",
    marginTop: "6px",
  },
  cancelToggleLabel: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
  },
  calloutSingle: {
    background: "#F7FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "12.5px",
    color: "#2D3748",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
  },
  calloutGroup: {
    background: "#F0FFF4",
    border: "1px solid #C6F6D5",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "12.5px",
    color: "#276749",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
  },
  calloutCancelled: {
    background: "#FFFBEB",
    border: "1px solid #FDE68A",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "12.5px",
    color: "#92400E",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
  },
  policyHintBar: {
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
    padding: "7px 12px",
    fontSize: "11.5px",
    color: "#475569",
    marginBottom: "10px",
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
    maxHeight: "340px",
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
  dupTopicBadge: {
    fontSize: "10.5px",
    fontWeight: 700,
    background: "#FEF3C7",
    color: "#92400E",
    border: "1px solid #FCD34D",
    padding: "2px 7px",
    borderRadius: "999px",
  },
  outstandingBadge: {
    fontSize: "10.5px",
    fontWeight: 600,
    background: "#EFF6FF",
    color: "#1E40AF",
    border: "1px solid #BFDBFE",
    padding: "2px 7px",
    borderRadius: "999px",
  },
  patientControlsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "8px",
    paddingLeft: "24px",
  },
  patientControls: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  controlGroupInline: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  controlMiniLabel: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#64748B",
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
  cancelledPill: {
    fontSize: "11.5px",
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: "6px",
    background: "#F1F5F9",
    color: "#475569",
    border: "1px solid #CBD5E1",
  },
  notCreditedPill: {
    fontSize: "11px",
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: "6px",
    background: "#FEE2E2",
    color: "#991B1B",
    border: "1px solid #FCA5A5",
  },
  makeupCheckLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: "6px",
    border: "1px solid #CBD5E0",
    cursor: "pointer",
  },
  detailSubPanelAmber: {
    background: "#FFFBEB",
    border: "1px solid #FDE68A",
    borderRadius: "8px",
    padding: "8px 10px",
  },
  detailSubPanelPurple: {
    background: "#F5F3FF",
    border: "1px solid #DDD6FE",
    borderRadius: "8px",
    padding: "8px 10px",
  },
  detailSubPanelBlue: {
    background: "#EFF6FF",
    border: "1px solid #BFDBFE",
    borderRadius: "8px",
    padding: "8px 10px",
  },
  detailSubHeader: {
    fontSize: "11.5px",
    color: "#334155",
    marginBottom: "6px",
  },
  detailGrid3: {
    display: "grid",
    gridTemplateColumns: "130px 1.3fr 1fr",
    gap: "8px",
  },
  detailGrid2: {
    display: "grid",
    gridTemplateColumns: "1.3fr 1fr",
    gap: "8px",
  },
  miniFieldLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    fontSize: "11px",
    fontWeight: 600,
    color: "#475569",
  },
  miniInput: {
    padding: "5px 8px",
    borderRadius: "6px",
    border: "1px solid #CBD5E1",
    fontSize: "12px",
    background: "#ffffff",
    color: "#1E293B",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
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
  },
  dtToggleBtnNegActive: {
    background: "#059669",
    color: "#ffffff",
  },
  dtToggleBtnPosActive: {
    background: "#DC2626",
    color: "#ffffff",
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
