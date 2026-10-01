import React, { useState, useRef, useEffect } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import useOrgSettings from "../hooks/useOrgSettings.js";
import { downloadElementAsPdf } from "../utils/pdf.js";

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

function calcAge(birthdate) {
  if (!birthdate) return "";
  const b = new Date(birthdate);
  if (isNaN(b.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age >= 0 ? `${age} years old` : "";
}

export default function TransmittalNoticeModal({
  patientId,
  initialPatient,
  initialReferral,
  initialIntake,
  onClose,
}) {
  const { user } = useAuth();
  const org = useOrgSettings();
  const printRef = useRef(null);

  const [patient, setPatient] = useState(initialPatient || null);
  const [referral, setReferral] = useState(initialReferral || null);
  const [intake, setIntake] = useState(initialIntake || null);
  const [loading, setLoading] = useState(!initialPatient || !initialReferral);
  const [downloading, setDownloading] = useState(false);

  // Editable Transmittal Destination Preset
  const [recipientType, setRecipientType] = useState("court"); // "court", "lgu", "internal", "custom"
  const [recipientName, setRecipientName] = useState("THE HONORABLE PRESIDING JUDGE");
  const [recipientOffice, setRecipientOffice] = useState("Regional Trial Court — Branch Assigned");
  const [recipientLocation, setRecipientLocation] = useState("Hall of Justice, Province of Albay");

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        if (!initialPatient || !initialReferral) {
          setLoading(true);
        }
        const res = await api.get(`/intakes/patient/${patientId}`);
        if (mounted && res.data) {
          if (res.data.patient) setPatient(res.data.patient);
          if (res.data.referral) setReferral(res.data.referral);
          if (res.data.intake) setIntake(res.data.intake);
        }
      } catch (err) {
        console.error("Failed to load transmittal data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (patientId) loadData();
    return () => {
      mounted = false;
    };
  }, [patientId]);

  function handlePresetChange(type) {
    setRecipientType(type);
    if (type === "court") {
      setRecipientName("THE HONORABLE PRESIDING JUDGE");
      setRecipientOffice("Regional Trial Court — Branch In-Charge");
      setRecipientLocation("Hall of Justice, Province of Albay");
    } else if (type === "lgu") {
      setRecipientName("THE CITY / MUNICIPAL MAYOR & CADAC/BADAC CHAIRMAN");
      setRecipientOffice("City / Municipal Anti-Drug Abuse Council (CADAC / BADAC)");
      setRecipientLocation(`${patient?.municipality || "Malinao"}, Albay`);
    } else if (type === "internal") {
      setRecipientName("THE CASE MANAGEMENT & AFTERCARE DIVISION");
      setRecipientOffice("Outpatient Treatment & Aftercare Section");
      setRecipientLocation("Malinao Treatment & Rehabilitation Center");
    } else {
      setRecipientName("");
      setRecipientOffice("");
      setRecipientLocation("");
    }
  }

  async function handleDownloadPdf() {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      const code = patient?.pwud_code || patient?.patient_code || `P-${patientId}`;
      const safeName = (patient?.full_name || "Patient").replace(/[^a-zA-Z0-9_-]/g, "_");
      await downloadElementAsPdf(printRef.current, `Transmittal_Notice_${code}_${safeName}.pdf`);
    } catch (err) {
      console.error("Error generating transmittal PDF:", err);
      alert("An error occurred while generating the PDF. You can also print directly to PDF.");
    } finally {
      setDownloading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  const p = patient || {};
  const r = referral || {};
  const itk = intake || {};

  const fullAddress = [
    p.street_address,
    p.barangay,
    p.municipality,
    p.province,
  ]
    .filter(Boolean)
    .join(", ") || p.address || "—";

  const caseClassification =
    r.nature_of_confinement ||
    r.admission_type ||
    p.case_classification ||
    "Voluntary / Court Order";

  const caseManager =
    p.assigned_case_manager_name ||
    p.case_manager_name ||
    (user?.role === "case_manager" ? user.full_name : "Assigned Case Manager");

  const preparerName = user?.full_name || "Admitting Staff";
  const todayFormatted = new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  const transmittalNo = `TN-${new Date().getFullYear().toString().slice(-2)}-${(p.patient_code || `${patientId}`).replace(/[^0-9]/g, "").slice(-4) || "0001"}`;

  return (
    <div className="modal-backdrop" style={styles.backdrop}>
      <div className="modal-dialog" style={styles.modal}>
        {/* Modal Controls Header (hidden in print) */}
        <div className="no-print" style={styles.header}>
          <div>
            <div style={styles.titleRow}>
              <span style={styles.badge}>Official Transmittal</span>
              <h2 style={styles.modalTitle}>Notice of Admission & Transmittal</h2>
            </div>
            <div style={styles.subtitle}>
              Transmittal Letter to Court / Referring LGU / Case Records ·{" "}
              <strong>{p.full_name || "Patient"}</strong> ({p.pwud_code || p.patient_code || "—"})
            </div>
          </div>

          <div style={styles.headerActions}>
            <div style={styles.presetGroup}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>To:</span>
              <select
                style={styles.presetSelect}
                value={recipientType}
                onChange={(e) => handlePresetChange(e.target.value)}
              >
                <option value="court">Regional Trial Court / Judge</option>
                <option value="lgu">LGU / CADAC / BADAC</option>
                <option value="internal">Case Management (Internal File)</option>
                <option value="custom">Custom Recipient</option>
              </select>
            </div>

            <button
              type="button"
              style={styles.printBtn}
              onClick={handlePrint}
              disabled={loading || downloading}
              title="Print via browser"
            >
              Print Notice
            </button>

            <button
              type="button"
              style={styles.downloadBtn}
              onClick={handleDownloadPdf}
              disabled={loading || downloading}
            >
              {downloading ? "Preparing PDF…" : "Download PDF"}
            </button>

            <button type="button" style={styles.closeBtn} onClick={onClose} disabled={downloading}>
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body / Document Preview */}
        <div className="modal-body-scroll" style={styles.body}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />
              <p style={{ marginTop: 12, color: "#555", fontSize: 13, fontWeight: 500 }}>
                Loading transmittal data…
              </p>
            </div>
          ) : (
            <div style={styles.previewContainer}>
              {/* PRINTABLE DOCUMENT SHEET */}
              <div ref={printRef} className="report-print-area" style={styles.documentSheet}>
                {/* Official Letterhead */}
                <div style={styles.letterhead}>
                  <div style={styles.sealContainer}>
                    {/* DOH / Republic Vector Seal */}
                    <svg viewBox="0 0 100 100" style={{ width: 68, height: 68 }}>
                      <circle cx="50" cy="50" r="48" fill="#ffffff" stroke="#15803d" strokeWidth="2.5" />
                      <circle cx="50" cy="50" r="43" fill="#15803d" />
                      <circle cx="50" cy="50" r="35" fill="#ffffff" stroke="#eab308" strokeWidth="1.5" />
                      <text x="50" y="23" fill="#ffffff" fontSize="6.5" fontWeight="bold" textAnchor="middle">
                        DEPARTMENT OF HEALTH
                      </text>
                      <text x="50" y="85" fill="#ffffff" fontSize="5.5" fontWeight="bold" textAnchor="middle">
                        PHILIPPINES
                      </text>
                      <circle cx="50" cy="50" r="14" fill="#15803d" />
                      <path d="M 50 40 L 50 60 M 40 50 L 60 50" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                      <path d="M 46 45 Q 54 48 46 55" stroke="#facc15" strokeWidth="2" fill="none" />
                    </svg>
                  </div>

                  <div style={styles.letterheadText}>
                    <div style={{ fontSize: 11, color: "#222" }}>Republic of the Philippines</div>
                    <div style={{ fontSize: 11, fontWeight: "bold", color: "#111" }}>DEPARTMENT OF HEALTH</div>
                    <div style={{ fontSize: 11, color: "#222" }}>Center for Health Development — Bicol</div>
                    <div style={{ fontSize: 14, fontWeight: "bold", color: "#166534", margin: "2px 0", letterSpacing: "0.5px" }}>
                      MALINAO TREATMENT AND REHABILITATION CENTER
                    </div>
                    <div style={{ fontSize: 9.5, color: "#444" }}>
                      Barangay Comun, Malinao, Albay 4512 · Mobile: 0917-123-MTRC · Email: mtrc_albay@doh.gov.ph
                    </div>
                    <div style={{ fontSize: 9.5, color: "#166534", fontWeight: 600 }}>
                      Outpatient and Aftercare Division — ENTREPOSE Information System
                    </div>
                  </div>

                  <div style={styles.sealContainer}>
                    {/* DDB Vector Seal */}
                    <svg viewBox="0 0 100 100" style={{ width: 68, height: 68 }}>
                      <circle cx="50" cy="50" r="48" fill="#ffffff" stroke="#002b66" strokeWidth="2.5" />
                      <circle cx="50" cy="50" r="44" fill="#002b66" />
                      <circle cx="50" cy="50" r="34" fill="#ffffff" stroke="#f4b400" strokeWidth="1.5" />
                      <text x="50" y="21" fill="#ffffff" fontSize="6.5" fontWeight="bold" textAnchor="middle">
                        DANGEROUS DRUGS
                      </text>
                      <text x="50" y="28" fill="#ffffff" fontSize="6.5" fontWeight="bold" textAnchor="middle">
                        BOARD
                      </text>
                      <circle cx="50" cy="48" r="15" fill="#0072ce" />
                      <path d="M 50 38 L 50 56 M 42 43 L 58 43 M 40 43 L 37 48 L 43 48 Z M 60 43 L 57 48 L 63 48 Z" stroke="#ffffff" strokeWidth="1.2" fill="#f4b400" />
                    </svg>
                  </div>
                </div>

                <div style={styles.letterheadDivider} />

                {/* Form Identification Bar */}
                <div style={styles.metaRow}>
                  <div>
                    <span style={{ fontWeight: "bold" }}>TRANSMITTAL REF. NO.: </span>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#000" }}>{transmittalNo}</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: "bold" }}>DATE: </span>
                    <span>{todayFormatted}</span>
                  </div>
                </div>

                {/* Addressee */}
                <div style={styles.addresseeBlock}>
                  <div style={{ fontWeight: "bold", fontSize: 11.5, color: "#000" }}>
                    {recipientType === "custom" ? (
                      <input
                        type="text"
                        placeholder="Recipient Name / Title"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        style={styles.editableInput}
                      />
                    ) : (
                      recipientName
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#222", marginTop: 2 }}>
                    {recipientType === "custom" ? (
                      <input
                        type="text"
                        placeholder="Office / Agency / Court Branch"
                        value={recipientOffice}
                        onChange={(e) => setRecipientOffice(e.target.value)}
                        style={styles.editableInput}
                      />
                    ) : (
                      recipientOffice
                    )}
                  </div>
                  <div style={{ fontSize: 10.5, color: "#444" }}>
                    {recipientType === "custom" ? (
                      <input
                        type="text"
                        placeholder="City / Municipality, Province"
                        value={recipientLocation}
                        onChange={(e) => setRecipientLocation(e.target.value)}
                        style={styles.editableInput}
                      />
                    ) : (
                      recipientLocation
                    )}
                  </div>
                </div>

                {/* Subject Header */}
                <div style={styles.subjectBox}>
                  <div style={{ fontSize: 11.5, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.2px" }}>
                    SUBJECT: OFFICIAL TRANSMITTAL OF ADMISSION RECORD & ENROLLMENT NOTIFICATION
                  </div>
                  <div style={{ fontSize: 11, marginTop: 3 }}>
                    CLIENT: <strong>{p.full_name || "—"}</strong> &nbsp;|&nbsp; PWUD CODE: <strong>{p.pwud_code || "Pending"}</strong> &nbsp;|&nbsp; PATIENT CODE: <strong>{p.patient_code || "—"}</strong>
                  </div>
                </div>

                {/* Salutation & Formal Notice Text */}
                <div style={styles.letterBody}>
                  <p style={{ marginTop: 0 }}>Sir / Madam:</p>
                  <p>
                    Warm greetings from the <strong>Malinao Treatment and Rehabilitation Center (MTRC)</strong>.
                  </p>
                  <p>
                    Please be respectfully informed that the above-named client has completed the official intake assessment, clinical triage, and enrollment procedures at this Center, and is now officially admitted and active under the <strong>Outpatient Drug Rehabilitation Program (ENTREPOSE)</strong>.
                  </p>
                  <p>
                    In accordance with statutory standards under Republic Act No. 9165 (Comprehensive Dangerous Drugs Act of 2002) and Dangerous Drugs Board (DDB) regulations, the patient has been placed under the direct case supervision of our designated Case Manager, <strong>{caseManager}</strong>, for ongoing structured rehabilitation sessions, counseling, and periodic monitoring.
                  </p>
                </div>

                {/* Patient Case Particulars Table */}
                <div style={{ margin: "14px 0" }}>
                  <div style={{ fontSize: 10.5, fontWeight: "bold", marginBottom: 4, textTransform: "uppercase", color: "#166534" }}>
                    I. Client Particulars & Admission Summary
                  </div>
                  <table style={styles.dataTable}>
                    <tbody>
                      <tr>
                        <td style={styles.tableLabel}>Full Name:</td>
                        <td style={styles.tableValue}><strong>{p.full_name || "—"}</strong></td>
                        <td style={styles.tableLabel}>Sex / Age:</td>
                        <td style={styles.tableValue}>{p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : "—"} / {calcAge(p.birthdate) || "—"}</td>
                      </tr>
                      <tr>
                        <td style={styles.tableLabel}>Permanent Address:</td>
                        <td colSpan={3} style={styles.tableValue}>{fullAddress}</td>
                      </tr>
                      <tr>
                        <td style={styles.tableLabel}>Official Admission Date:</td>
                        <td style={styles.tableValue}><strong>{fmtDate(p.admission_date)}</strong></td>
                        <td style={styles.tableLabel}>Case Classification:</td>
                        <td style={styles.tableValue}>{caseClassification}</td>
                      </tr>
                      <tr>
                        <td style={styles.tableLabel}>Assigned Program:</td>
                        <td style={styles.tableValue}>Outpatient Rehabilitation (ENTREPOSE)</td>
                        <td style={styles.tableLabel}>Assigned Case Manager:</td>
                        <td style={styles.tableValue}><strong>{caseManager}</strong></td>
                      </tr>
                      <tr>
                        <td style={styles.tableLabel}>Primary Substance:</td>
                        <td style={styles.tableValue}>
                          {itk.substances?.[0]?.drugUsed || (itk.drugs_used?.[0] ? (typeof itk.drugs_used[0] === "string" ? itk.drugs_used[0] : itk.drugs_used[0].name) : "Methamphetamine / Shabu")}
                        </td>
                        <td style={styles.tableLabel}>Social Classification:</td>
                        <td style={styles.tableValue}>
                          {itk.socioeconomic_classification ? itk.socioeconomic_classification.toUpperCase() : "C1 / Assessed"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Enclosures Checklist */}
                <div style={{ margin: "14px 0" }}>
                  <div style={{ fontSize: 10.5, fontWeight: "bold", marginBottom: 4, textTransform: "uppercase", color: "#166534" }}>
                    II. Enclosed Transmittal Documents (Case Dossier)
                  </div>
                  <div style={styles.enclosuresList}>
                    <div style={styles.enclosureItem}>
                      <span style={styles.checkedBox}>☑</span>
                      <span><strong>Certificate of Enrollment</strong> (Official Statutory Document)</span>
                    </div>
                    <div style={styles.enclosureItem}>
                      <span style={styles.checkedBox}>☑</span>
                      <span><strong>DDB IDADIN Form 6-06</strong> (Integrated Drug Abuse Data Information Network Form, 2 Pages)</span>
                    </div>
                    <div style={styles.enclosureItem}>
                      <span style={styles.checkedBox}>☑</span>
                      <span><strong>Intake Assessment & Clinical Triage Sheet</strong> (Vitals, Medical History & Comorbidities)</span>
                    </div>
                    <div style={styles.enclosureItem}>
                      <span style={styles.checkedBox}>☑</span>
                      <span><strong>Signed Service Agreement & Pledge of Commitment</strong> (Verified by Admitting Personnel)</span>
                    </div>
                    <div style={styles.enclosureItem}>
                      <span style={styles.checkedBox}>☑</span>
                      <span><strong>Initial Baseline Urine Drug Test (DT) Laboratory Record</strong></span>
                    </div>
                  </div>
                </div>

                {/* Closing Remarks */}
                <div style={{ fontSize: 10.5, lineHeight: 1.45, marginBottom: 20 }}>
                  <p style={{ margin: 0 }}>
                    This transmittal notice is rendered for your information, official case tracking, and legal documentation. For inquiries or progress updates regarding this client, please coordinate directly with our Outpatient Case Management Division.
                  </p>
                </div>

                {/* Signatories Block */}
                <div style={styles.signatoriesGrid}>
                  <div>
                    <div style={{ fontSize: 10.5, color: "#333", marginBottom: 30 }}>Transmitted by:</div>
                    <div style={styles.sigLine} />
                    <div style={{ fontWeight: "bold", fontSize: 11, textTransform: "uppercase" }}>{preparerName}</div>
                    <div style={{ fontSize: 9.5, color: "#555" }}>Admitting Officer / HIM Section</div>
                    <div style={{ fontSize: 9, color: "#777" }}>Malinao Treatment & Rehab Center</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10.5, color: "#333", marginBottom: 30 }}>Noted and Approved by:</div>
                    <div style={styles.sigLine} />
                    <div style={{ fontWeight: "bold", fontSize: 11, textTransform: "uppercase" }}>RANDY ATAYDE, MD</div>
                    <div style={{ fontSize: 9.5, color: "#555" }}>Medical Center Chief II / Center Director</div>
                    <div style={{ fontSize: 9, color: "#777" }}>Malinao Treatment & Rehab Center</div>
                  </div>
                </div>

                {/* Bottom Footer Note */}
                <div style={styles.docFooter}>
                  <span>MTRC-OD-TN-01 · Rev. 02</span>
                  <span>CONFIDENTIAL — Subject to RA 10173 (Data Privacy Act of 2012) & RA 9165</span>
                  <span>Page 1 of 1</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "16px",
    boxSizing: "border-box",
  },
  modal: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "920px",
    height: "94vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
    overflow: "hidden",
  },
  header: {
    padding: "16px 24px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    flexShrink: 0,
    gap: 16,
    flexWrap: "wrap",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    backgroundColor: "#dcfce7",
    color: "#15803d",
    padding: "2px 8px",
    borderRadius: "4px",
  },
  modalTitle: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  subtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "2px",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  presetGroup: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f1f5f9",
    padding: "4px 8px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
  },
  presetSelect: {
    border: "none",
    background: "transparent",
    fontSize: "12px",
    fontWeight: "600",
    color: "#0f172a",
    cursor: "pointer",
    outline: "none",
  },
  printBtn: {
    padding: "7px 14px",
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#1e293b",
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    cursor: "pointer",
  },
  downloadBtn: {
    padding: "7px 16px",
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#166534",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(22, 101, 52, 0.3)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
    color: "#64748b",
    padding: "4px 8px",
    marginLeft: 4,
  },
  body: {
    flex: 1,
    overflowY: "auto",
    backgroundColor: "#e2e8f0",
    padding: "24px 16px",
    display: "flex",
    justifyContent: "center",
  },
  previewContainer: {
    width: "100%",
    maxWidth: "810px",
  },
  documentSheet: {
    width: "794px",
    minHeight: "1123px",
    backgroundColor: "#ffffff",
    color: "#000000",
    fontFamily: "'Arial', 'Helvetica', sans-serif",
    padding: "40px 48px",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    margin: "0 auto",
    position: "relative",
    fontSize: "11px",
    lineHeight: "1.45",
  },
  letterhead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sealContainer: {
    width: 68,
    height: 68,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  letterheadText: {
    textAlign: "center",
    flex: 1,
    padding: "0 12px",
    lineHeight: "1.25",
  },
  letterheadDivider: {
    borderBottom: "2px solid #166534",
    margin: "8px 0 16px 0",
  },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "10.5px",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 8,
    marginBottom: 16,
  },
  addresseeBlock: {
    marginBottom: 16,
    lineHeight: "1.35",
  },
  editableInput: {
    border: "1px dashed #cbd5e1",
    padding: "2px 6px",
    fontSize: "11px",
    borderRadius: "4px",
    width: "100%",
    maxWidth: "360px",
  },
  subjectBox: {
    backgroundColor: "#f0fdf4",
    border: "1.5px solid #166534",
    borderRadius: "6px",
    padding: "10px 14px",
    marginBottom: 16,
    color: "#166534",
  },
  letterBody: {
    fontSize: "11px",
    lineHeight: "1.6",
    marginBottom: 14,
    color: "#111",
  },
  dataTable: {
    width: "100%",
    borderCollapse: "collapse",
    border: "1px solid #000",
    fontSize: "10px",
  },
  tableLabel: {
    border: "1px solid #000",
    backgroundColor: "#f8fafc",
    padding: "5px 8px",
    fontWeight: "bold",
    width: "25%",
    color: "#333",
  },
  tableValue: {
    border: "1px solid #000",
    padding: "5px 8px",
    width: "25%",
  },
  enclosuresList: {
    border: "1px solid #cbd5e1",
    backgroundColor: "#f8fafc",
    borderRadius: "6px",
    padding: "10px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: "10.5px",
  },
  enclosureItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  checkedBox: {
    color: "#166534",
    fontWeight: "bold",
    fontSize: "13px",
  },
  signatoriesGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    columnGap: 48,
    marginTop: 24,
    marginBottom: 24,
  },
  sigLine: {
    borderBottom: "1px solid #000",
    width: "100%",
    maxWidth: "240px",
    marginBottom: 6,
  },
  docFooter: {
    display: "flex",
    justifyContent: "space-between",
    borderTop: "1px solid #cbd5e1",
    paddingTop: 8,
    fontSize: "9px",
    color: "#64748b",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  spinner: {
    width: "36px",
    height: "36px",
    border: "3px solid #cbd5e1",
    borderTopColor: "#166534",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
