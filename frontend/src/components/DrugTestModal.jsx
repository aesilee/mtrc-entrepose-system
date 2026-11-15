import { useEffect, useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const RESULT_OPTIONS = [
  { value: "", label: "— Select Explicit Result —" },
  { value: "NEGATIVE", label: "🟢 NEGATIVE — All Multi-3 Panels Non-Reactive" },
  { value: "POSITIVE", label: "🔴 POSITIVE — Reactive Substance(s) Detected" },
  { value: "PENDING", label: "⏳ PENDING — Awaiting Result / Confirmatory Review" },
  { value: "INVALID", label: "⚠️ INVALID — Invalid / Adulterated Specimen (Retest)" },
  { value: "NOT_PERFORMED", label: "⚪ NOT PERFORMED — Test Deferred / Kit Unavailable" },
];

function parseInitialPositiveDrugs(existingTest) {
  if (!existingTest) return { thc: false, meth: false, ecs: false };
  const raw = `${existingTest.positive_substances || ""} ${existingTest.substance_tested || ""}`.toUpperCase();
  if (existingTest.result !== "POSITIVE") return { thc: false, meth: false, ecs: false };
  return {
    thc: raw.includes("THC") || raw.includes("BOTH"),
    meth: raw.includes("METH") || raw.includes("BOTH"),
    ecs: raw.includes("ECS") || raw.includes("MDMA"),
  };
}

function buildSubstanceLabel(result, posDrugs) {
  if (result === "POSITIVE") {
    const list = [];
    if (posDrugs.thc) list.push("THC (Marijuana)");
    if (posDrugs.meth) list.push("METH (Methamphetamine)");
    if (posDrugs.ecs) list.push("ECS (Ecstasy)");
    return list.length > 0 ? `Multi-3: ${list.join(", ")}` : "Multi-3: Pending Substance Selection";
  }
  if (result === "NOT_PERFORMED") return "Multi-3: Test Not Performed";
  if (result === "PENDING") return "Multi-3 Rapid Drug Screen (Result Pending)";
  if (result === "INVALID") return "Multi-3 Rapid Drug Screen (Invalid Specimen — Retest Required)";
  if (result === "NEGATIVE") return "Multi-3 Rapid Drug Screen (THC, METH, ECS)";
  return "Multi-3 Rapid Drug Screen (THC, METH, ECS)";
}

export default function DrugTestModal({ patientId, existingTest = null, onClose, onSaved }) {
  const { user } = useAuth();
  const defaultStaffName = user?.full_name || user?.username || "";
  const isEditing = Boolean(existingTest?.id);

  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState(() => ({
    testDate: existingTest?.test_date
      ? String(existingTest.test_date).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    testTime: existingTest?.test_time
      ? String(existingTest.test_time).slice(0, 5)
      : new Date().toTimeString().slice(0, 5),
    testType: existingTest?.test_type || "Random Screening",
    result: existingTest?.result || "", // Explicit selection required for new tests (never defaults to NEGATIVE)
    positiveDrugs: parseInitialPositiveDrugs(existingTest),
    sessionId: existingTest?.session_id ? String(existingTest.session_id) : "",
    relatedVisit: existingTest?.related_visit || "",
    testedByName: existingTest?.tested_by_name || existingTest?.recorded_by_name || defaultStaffName,
    actionTaken: existingTest?.action_taken || "",
    remarks: existingTest?.remarks || "",
    correctionReason: "",
  }));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientId) return;
    api
      .get("/attendance", { params: { limit: 50 } })
      .then(({ data }) => {
        const rows = (data?.attendance || []).filter(
          (a) => String(a.patient_id) === String(patientId)
        );
        setSessions(rows);
      })
      .catch(() => {});
  }, [patientId]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleResultChange(nextResult) {
    setForm((prev) => ({
      ...prev,
      result: nextResult,
      // Do NOT auto-select METH when POSITIVE is chosen
      positiveDrugs:
        nextResult === "POSITIVE"
          ? prev.positiveDrugs
          : { thc: false, meth: false, ecs: false },
    }));
  }

  function togglePositiveDrug(drugKey) {
    setForm((prev) => ({
      ...prev,
      positiveDrugs: {
        ...prev.positiveDrugs,
        [drugKey]: !prev.positiveDrugs[drugKey],
      },
    }));
  }

  const anyPositiveSelected =
    Boolean(form.positiveDrugs.thc) ||
    Boolean(form.positiveDrugs.meth) ||
    Boolean(form.positiveDrugs.ecs);

  const computedSubstanceSummary = buildSubstanceLabel(form.result, form.positiveDrugs);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!patientId) {
      setError("No patient ID provided.");
      return;
    }
    if (!form.result) {
      setError("Please select an explicit Multi-3 test result instead of leaving it blank.");
      return;
    }
    if (form.result === "POSITIVE" && !anyPositiveSelected) {
      setError("Please select at least one positive substance (THC, METH, or ECS) on the Multi-3 checklist.");
      return;
    }
    if (form.result === "POSITIVE" && !String(form.actionTaken || "").trim()) {
      setError("Please specify the immediate clinical action taken for this positive result.");
      return;
    }
    if (isEditing && !String(form.correctionReason || "").trim()) {
      setError("Please provide the reason for correcting this drug test record.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        testDate: form.testDate,
        testTime: form.testTime || null,
        testType: form.testType,
        result: form.result,
        positiveDrugs: form.positiveDrugs,
        substanceTested: computedSubstanceSummary,
        sessionId: form.sessionId ? Number(form.sessionId) : null,
        relatedVisit: form.relatedVisit || null,
        testedByName: form.testedByName || defaultStaffName,
        actionTaken: form.actionTaken,
        remarks: form.remarks,
        correctionReason: isEditing ? form.correctionReason : undefined,
      };

      if (isEditing) {
        await api.put(`/case-management/patients/${patientId}/drug-tests/${existingTest.id}`, payload);
      } else {
        await api.post(`/case-management/patients/${patientId}/drug-tests`, payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save drug test.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
              {isEditing
                ? `Correct Multi-3 Drug Test Record (#${existingTest.id})`
                : "Record Multi-3 Urine Drug Test (THC / METH / ECS)"}
            </h2>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
              Standardized Multi-3 Rapid Screening Form — Consistent across Attendance & Patient Profile
            </div>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn} disabled={saving}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          {isEditing && (
            <div style={styles.correctionBanner}>
              <strong>Traceable Correction Mode:</strong> Original record (
              <code>{existingTest.result}</code> · <code>{existingTest.substance_tested}</code>) will be preserved in the audit log alongside your correction reason.
            </div>
          )}

          <div style={styles.grid}>
            <label style={styles.label}>
              Test Date *
              <input
                type="date"
                required
                style={styles.input}
                value={form.testDate}
                onChange={(e) => update("testDate", e.target.value)}
                disabled={saving}
              />
            </label>

            <label style={styles.label}>
              Test Time *
              <input
                type="time"
                required
                style={styles.input}
                value={form.testTime}
                onChange={(e) => update("testTime", e.target.value)}
                disabled={saving}
              />
            </label>

            <label style={styles.label}>
              Test Type / Context *
              <select
                required
                style={styles.input}
                value={form.testType}
                onChange={(e) => update("testType", e.target.value)}
                disabled={saving}
              >
                <option value="Random Screening">Random Screening</option>
                <option value="Post-Session Screening">Post-Session Screening</option>
                <option value="Mandatory Court RDT">Mandatory Court RDT</option>
                <option value="Follow-up Screening">Follow-up Screening</option>
                <option value="Confirmatory Test">Confirmatory Test</option>
              </select>
            </label>

            <label style={styles.label}>
              Authorized Staff Member *
              <input
                type="text"
                required
                style={styles.input}
                placeholder="Name of staff who administered/verified test"
                value={form.testedByName}
                onChange={(e) => update("testedByName", e.target.value)}
                disabled={saving}
              />
            </label>

            <label style={styles.label}>
              Related Session (Optional)
              <select
                style={styles.input}
                value={form.sessionId}
                onChange={(e) => {
                  const sid = e.target.value;
                  const matched = sessions.find((s) => String(s.session_id) === String(sid));
                  setForm((prev) => ({
                    ...prev,
                    sessionId: sid,
                    relatedVisit: matched
                      ? `${matched.session_type}${matched.topic_name ? `: ${matched.topic_name}` : ""} (${String(matched.session_date).slice(0, 10)})`
                      : prev.relatedVisit,
                  }));
                }}
                disabled={saving}
              >
                <option value="">— Not linked to a specific session —</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.session_id || ""}>
                    {String(s.session_date || "").slice(0, 10)} · {s.session_type}
                    {s.topic_name ? ` — ${s.topic_name}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.label}>
              Related Visit / Encounter Note
              <input
                type="text"
                style={styles.input}
                placeholder="e.g., Week 5 CBT Visit / Unannounced Home Visit"
                value={form.relatedVisit}
                onChange={(e) => update("relatedVisit", e.target.value)}
                disabled={saving}
              />
            </label>

            {/* Explicit Multi-3 Result Selection */}
            <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
              Multi-3 Drug Test Result (Explicit Selection Required) *
              <select
                required
                style={{
                  ...styles.input,
                  fontWeight: 700,
                  background:
                    form.result === "POSITIVE"
                      ? "#FEF2F2"
                      : form.result === "NEGATIVE"
                      ? "#ECFDF5"
                      : form.result === "PENDING" || form.result === "INVALID"
                      ? "#FFFBEB"
                      : "#FFFFFF",
                  color:
                    form.result === "POSITIVE"
                      ? "#991B1B"
                      : form.result === "NEGATIVE"
                      ? "#065F46"
                      : form.result === "PENDING" || form.result === "INVALID"
                      ? "#92400E"
                      : "#1E293B",
                }}
                value={form.result}
                onChange={(e) => handleResultChange(e.target.value)}
                disabled={saving}
              >
                {RESULT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Multi-3 Independent Checkboxes when POSITIVE is chosen */}
            {form.result === "POSITIVE" && (
              <div style={{ ...styles.multi3Box, gridColumn: "1 / -1" }}>
                <div style={styles.multi3Header}>
                  <span>Multi-3 Positive Substance Checklist (Select all reactive panels — no substance is auto-selected):</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#7F1D1D" }}>Kit: THC / METH / ECS</span>
                </div>
                <div style={styles.multi3Grid}>
                  <label
                    style={{
                      ...styles.multi3Item,
                      borderColor: form.positiveDrugs.thc ? "#DC2626" : "#CBD5E0",
                      background: form.positiveDrugs.thc ? "#FEF2F2" : "#FFFFFF",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(form.positiveDrugs.thc)}
                      onChange={() => togglePositiveDrug("thc")}
                      disabled={saving}
                    />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={styles.pillThc}>THC</span>
                        <strong style={{ fontSize: 12.5, color: "#1F2937" }}>Marijuana</strong>
                      </div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Tetrahydrocannabinol</div>
                    </div>
                  </label>

                  <label
                    style={{
                      ...styles.multi3Item,
                      borderColor: form.positiveDrugs.meth ? "#DC2626" : "#CBD5E0",
                      background: form.positiveDrugs.meth ? "#FEF2F2" : "#FFFFFF",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(form.positiveDrugs.meth)}
                      onChange={() => togglePositiveDrug("meth")}
                      disabled={saving}
                    />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={styles.pillMeth}>METH</span>
                        <strong style={{ fontSize: 12.5, color: "#1F2937" }}>Shabu</strong>
                      </div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Methamphetamine</div>
                    </div>
                  </label>

                  <label
                    style={{
                      ...styles.multi3Item,
                      borderColor: form.positiveDrugs.ecs ? "#DC2626" : "#CBD5E0",
                      background: form.positiveDrugs.ecs ? "#FEF2F2" : "#FFFFFF",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(form.positiveDrugs.ecs)}
                      onChange={() => togglePositiveDrug("ecs")}
                      disabled={saving}
                    />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={styles.pillEcs}>ECS</span>
                        <strong style={{ fontSize: 12.5, color: "#1F2937" }}>Ecstasy</strong>
                      </div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>MDMA</div>
                    </div>
                  </label>
                </div>

                {!anyPositiveSelected && (
                  <div style={styles.multi3Warn}>
                    ⚠️ At least one positive substance (THC, METH, or ECS) is required for a Positive result.
                  </div>
                )}

                <div style={{ marginTop: 8, fontSize: 12, color: "#7F1D1D" }}>
                  <strong>Single Test Record Summary:</strong> {computedSubstanceSummary}
                </div>
              </div>
            )}

            <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
              Action Taken {form.result === "POSITIVE" ? "* (Required for Positive Result)" : ""}
              <input
                type="text"
                required={form.result === "POSITIVE"}
                style={styles.input}
                placeholder={
                  form.result === "POSITIVE"
                    ? "e.g., Immediate clinical counseling conducted; Case Conference scheduled"
                    : form.result === "INVALID"
                    ? "e.g., Observed repeat urine collection ordered"
                    : "Optional clinical action or disposition..."
                }
                value={form.actionTaken}
                onChange={(e) => update("actionTaken", e.target.value)}
                disabled={saving}
              />
            </label>

            <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
              Remarks / Notes
              <textarea
                style={styles.textarea}
                placeholder="Additional observations, kit lot number, or reason if test was not performed / invalid..."
                value={form.remarks}
                onChange={(e) => update("remarks", e.target.value)}
                disabled={saving}
              />
            </label>

            {isEditing && (
              <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
                Reason for Correction * (Required for Audit Traceability)
                <input
                  type="text"
                  required
                  style={{ ...styles.input, borderColor: "#F59E0B", background: "#FFFBEB" }}
                  placeholder="State why this drug test record is being updated (e.g., Pending confirmatory result received, clerical correction)..."
                  value={form.correctionReason}
                  onChange={(e) => update("correctionReason", e.target.value)}
                  disabled={saving}
                />
              </label>
            )}
          </div>

          <div style={styles.footer}>
            <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" style={styles.saveBtn} disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Save Traceable Correction" : "Save Multi-3 Test Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modal: { background: "#fff", borderRadius: 12, width: "100%", maxWidth: 660, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 10px 25px rgba(0,0,0,0.22)" },
  header: { padding: "18px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { margin: 0, fontSize: 17, fontWeight: 800, color: "#1A202C" },
  closeBtn: { background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#A0AEC0", padding: 0, lineHeight: 1 },
  form: { padding: 22, overflowY: "auto" },
  error: { background: "#FFF5F5", color: "#C53030", border: "1px solid #FEB2B2", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600 },
  correctionBanner: { background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 12.5 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  label: { display: "flex", flexDirection: "column", gap: 5, fontSize: 12.5, fontWeight: 700, color: "#334155" },
  input: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 13.5, outline: "none" },
  textarea: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 13.5, outline: "none", minHeight: 68, resize: "vertical" },
  multi3Box: { background: "#FFF5F5", border: "1px solid #FECACA", borderRadius: 10, padding: 14 },
  multi3Header: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 800, color: "#991B1B", marginBottom: 10 },
  multi3Grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 },
  multi3Item: { display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 8, border: "1.5px solid #CBD5E0", cursor: "pointer" },
  pillThc: { background: "#DCFCE7", color: "#166534", fontSize: 10.5, fontWeight: 800, padding: "2px 6px", borderRadius: 4 },
  pillMeth: { background: "#FEE2E2", color: "#991B1B", fontSize: 10.5, fontWeight: 800, padding: "2px 6px", borderRadius: 4 },
  pillEcs: { background: "#F3E8FF", color: "#6B21A8", fontSize: 10.5, fontWeight: 800, padding: "2px 6px", borderRadius: 4 },
  multi3Warn: { marginTop: 10, fontSize: 12, fontWeight: 700, color: "#B91C1C", background: "#FEF2F2", padding: "6px 10px", borderRadius: 6, border: "1px solid #FCA5A5" },
  footer: { padding: "14px 24px", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "flex-end", gap: 12, background: "#F8FAFC", borderBottomLeftRadius: 12, borderBottomRightRadius: 12, marginTop: 16 },
  cancelBtn: { padding: "8px 16px", border: "1px solid #CBD5E1", background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "#475569" },
  saveBtn: { padding: "8px 18px", border: "none", background: "var(--color-primary, #1B4332)", color: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 13.5, fontWeight: 700 },
};
