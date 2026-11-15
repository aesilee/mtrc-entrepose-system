import pool from "../config/db.js";
import { ensureAttendanceCompletionSchema } from "../utils/attendanceSchema.js";
import { ensureProgramDurationSchema } from "../utils/programDuration.js";
import { ensureHistoricalReportSchema } from "../utils/historicalReportSchema.js";
import { ensureInterventionSchema } from "../utils/interventionSchema.js";
import { ensureCbteAndRiskSchema } from "../utils/cbteAndRiskSchema.js";
import { CORE_CBT_TOPICS, CORE_CBTE_TOPICS, CORE_PE_TOPICS } from "../utils/curriculumProgress.js";

// Table 2.0 exact numbers from the manuscript
const TABLE_2_DATA = [
  // 2024
  { y: 2024, m: 1, census: 51, comp: 1, nonComp: 3 },
  { y: 2024, m: 2, census: 40, comp: 15, nonComp: 1 },
  { y: 2024, m: 3, census: 37, comp: 7, nonComp: 3 },
  { y: 2024, m: 4, census: 41, comp: 0, nonComp: 1 },
  { y: 2024, m: 5, census: 35, comp: 8, nonComp: 1 },
  { y: 2024, m: 6, census: 37, comp: 5, nonComp: 0 },
  { y: 2024, m: 7, census: 37, comp: 2, nonComp: 1 },
  { y: 2024, m: 8, census: 40, comp: 3, nonComp: 0 },
  { y: 2024, m: 9, census: 39, comp: 6, nonComp: 0 },
  { y: 2024, m: 10, census: 44, comp: 0, nonComp: 0 },
  { y: 2024, m: 11, census: 39, comp: 6, nonComp: 3 },
  { y: 2024, m: 12, census: 34, comp: 7, nonComp: 0 },
  // 2025
  { y: 2025, m: 1, census: 38, comp: 1, nonComp: 2 },
  { y: 2025, m: 2, census: 41, comp: 7, nonComp: 1 },
  { y: 2025, m: 3, census: 44, comp: 5, nonComp: 0 },
  { y: 2025, m: 4, census: 49, comp: 3, nonComp: 0 },
  { y: 2025, m: 5, census: 52, comp: 3, nonComp: 2 },
  { y: 2025, m: 6, census: 53, comp: 4, nonComp: 2 },
  { y: 2025, m: 7, census: 52, comp: 6, nonComp: 1 },
  { y: 2025, m: 8, census: 55, comp: 3, nonComp: 3 },
  { y: 2025, m: 9, census: 51, comp: 10, nonComp: 1 },
  { y: 2025, m: 10, census: 55, comp: 1, nonComp: 1 },
  { y: 2025, m: 11, census: 52, comp: 8, nonComp: 0 },
  { y: 2025, m: 12, census: 41, comp: 12, nonComp: 2 },
  // 2026
  { y: 2026, m: 1, census: 46, comp: 2, nonComp: 2 },
  { y: 2026, m: 2, census: 52, comp: 5, nonComp: 0 },
];

const FIRST_NAMES_MALE = [
  "Juan", "Mark", "Angelo", "Christian", "Ramil", "Arnel", "Eduardo", "Reynaldo",
  "Rodel", "Jerome", "Michael", "John Paul", "Dennis", "Ronald", "Anthony", "Noel",
  "Marvin", "Richard", "Christopher", "Jeffrey", "Gilbert", "Allan", "Jayson", "Melvin",
  "Aldrin", "Ernesto", "Danilo", "Lito", "Vincent", "Paolo", "Bryan", "Francis",
  "Gabriel", "Kenneth", "Joseph", "Carlos", "Dante", "Renato", "Eugene", "Darwin",
  "Jomar", "Darwin", "Alvin", "Jerick", "Renz", "Jericho", "Rommel", "Edgardo",
];

const FIRST_NAMES_FEMALE = [
  "Maria", "Ana", "Cristina", "Rosemarie", "Maricel", "Michelle", "Jennifer", "Joy",
  "Lourdes", "Grace", "Mary Jane", "Cherry", "Rowena", "Gemma", "Sharon", "Abigail",
  "Katherine", "Princess", "Angelica", "Liezel", "Kristine", "Janice", "Marites",
];

const LAST_NAMES = [
  "Dela Cruz", "Santos", "Reyes", "Bautista", "Garcia", "Mendoza", "Flores", "Gonzales",
  "Lopez", "Ramos", "Bañares", "Quinas", "Loretcha", "Teodocio", "Basquiñas", "Alvarez",
  "Castillo", "Villanueva", "Aquino", "Morales", "Tan", "Diaz", "Torres", "Navarro",
  "Del Rosario", "Domingo", "Pineda", "Valdez", "Sarmiento", "Mercado", "Velasco",
  "Soriano", "Salazar", "Santiago", "Ignacio", "Samson", "Espiritu", "Cordero",
  "Manalo", "Tolentino", "Guevarra", "Balagtas", "Arellano", "Pascual", "Salas",
  "Imperial", "Bitara", "Madrilejos", "Albay", "Nuyda", "Bobis", "Añonuevo", "Bien",
];

const MIDDLE_NAMES = [
  "Perez", "Cruz", "Reyes", "Gomez", "Ramos", "Diaz", "Santos", "Flores",
  "Castillo", "Mendoza", "Morales", "Lopez", "Aquino", "Bautista", "Garcia",
];

const LGUS = [
  { municipality: "Legazpi City", barangay: "Brgy. Bogtong", street: "Purok 3" },
  { municipality: "Legazpi City", barangay: "Brgy. Bitano", street: "Rizal Street" },
  { municipality: "Legazpi City", barangay: "Brgy. San Roque", street: "Purok 1" },
  { municipality: "Legazpi City", barangay: "Brgy. Rawis", street: "Purok 4" },
  { municipality: "Daraga", barangay: "Brgy. San Roque", street: "Gogon Road" },
  { municipality: "Daraga", barangay: "Brgy. Bagumbayan", street: "Purok Ilawod" },
  { municipality: "Daraga", barangay: "Brgy. Cullat", street: "National Highway" },
  { municipality: "Tabaco City", barangay: "Brgy. Quinale", street: "Ziga Avenue" },
  { municipality: "Tabaco City", barangay: "Brgy. San Carlos", street: "Purok 2" },
  { municipality: "Tabaco City", barangay: "Brgy. Basud", street: "Coastal Road" },
  { municipality: "Ligao City", barangay: "Brgy. Tuburan", street: "Mabini Street" },
  { municipality: "Ligao City", barangay: "Brgy. Dunao", street: "Purok 5" },
  { municipality: "Guinobatan", barangay: "Brgy. Travesia", street: "Diversion Road" },
  { municipality: "Guinobatan", barangay: "Brgy. Poblacion", street: "Bonifacio St." },
  { municipality: "Polangui", barangay: "Brgy. Centro Occidental", street: "Market Road" },
  { municipality: "Camalig", barangay: "Brgy. Salugan", street: "Heritage Zone" },
  { municipality: "Malilipot", barangay: "Brgy. San Isidro", street: "Purok Central" },
  { municipality: "Sto. Domingo", barangay: "Brgy. Sto. Domingo", street: "Baybayon St." },
];

const NON_COMPLETER_REASONS = [
  { code: "NON_COMPLIANCE", reason: "Non-compliance / Absconded / Dropped Out", intervention: "Case conference documented unexcused absences; court notified." },
  { code: "NON_COMPLIANCE", reason: "Non-compliance / Absconded / Dropped Out", intervention: "Failed to report after repeated home visits and notices." },
  { code: "DISCIPLINARY", reason: "Expelled / Disciplinary Action", intervention: "Violation of facility code of conduct." },
  { code: "TURNED_OVER_LAW_ENFORCEMENT", reason: "Court Order Turnover / Re-arrest / Incarcerated", intervention: "Re-arrested for independent offenses; formal turnover to BJMP." },
  { code: "EARLY_RELEASE", reason: "Early Release (Court-Granted)", intervention: "Court cleared client from further mandatory sessions." },
  { code: "TRANSFERRED", reason: "Referred / Transferred to Residential or Other Facility", intervention: "Transferred to residential therapeutic community per physician advice." },
  { code: "MEDICAL", reason: "Medical Discharge / Health Reasons", intervention: "Severe medical comorbidity requiring hospital confinement." },
];

export async function seedMockData() {
  console.log("=========================================================");
  console.log("  SEEDING PRESENTATION MOCK DATA STRICTLY FROM TABLE 2.0");
  console.log("=========================================================");

  await ensureAttendanceCompletionSchema();
  await ensureProgramDurationSchema();
  await ensureHistoricalReportSchema();
  await ensureInterventionSchema();
  await ensureCbteAndRiskSchema();

  // 1. Wipe current patient data cleanly
  console.log("\n[1/5] Wiping current patient-related tables...");
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  const tablesToClear = [
    "attendance",
    "certificate_issuances",
    "certificates",
    "court_progress_reports",
    "discharges",
    "drug_test_logs",
    "follow_ups",
    "generated_reports",
    "notifications",
    "patient_case_management",
    "patient_case_manager_history",
    "patient_cbte_evaluations",
    "patient_consult_logs",
    "patient_discharges",
    "patient_duration_history",
    "patient_hospitalizations",
    "patient_intakes",
    "patient_interventions",
    "patient_milestone_history",
    "patient_milestones",
    "patient_referral_documents",
    "patient_referrals",
    "patient_status_history",
    "patient_substances",
    "patient_treatment_plans",
    "patients",
    "progress_notes",
    "report_snapshots",
    "session_roster",
    "sessions",
    "archives",
  ];

  for (const t of tablesToClear) {
    try {
      await pool.query(`TRUNCATE TABLE ${t}`);
    } catch (err) {
      console.warn(`  Warning clearing ${t}:`, err.message);
    }
  }
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");
  console.log("  Cleaned all patient data tables.");

  // Fetch active case managers
  const [cmRows] = await pool.query(
    "SELECT id, full_name, username FROM users WHERE role = 'case_manager' AND status = 'active'"
  );
  const cm1 = cmRows[0] || { id: 3, full_name: "Joshua Loretcha", username: "casemanager" };
  const cm2 = cmRows[1] || cm1;

  // 2. Build the cohort plan
  console.log("\n[2/5] Building exact cohort lifecycles from Table 2.0...");
  const patientPlans = [];
  let nextPatientSeq = 1;
  let activePool = [];

  for (let i = 0; i < TABLE_2_DATA.length; i++) {
    const row = TABLE_2_DATA[i];
    const ym = `${row.y}-${String(row.m).padStart(2, "0")}`;
    const start = `${ym}-01`;
    const lastDay = new Date(row.y, row.m, 0).getDate();
    const end = `${ym}-${String(lastDay).padStart(2, "0")}`;

    // Handle excess carryover by archiving at month transition (21 patients across 5 transition months)
    if (activePool.length > row.census) {
      const excess = activePool.length - row.census;
      for (let k = 0; k < excess; k++) {
        const p = activePool.pop();
        p.is_archived = 1;
        p.archived_at = `${start} 00:00:00`;
        p.enrollment_status = "transferred";
        p.current_status = "transferred";
      }
    }

    // New admissions needed to reach exact census
    const needed = row.census - activePool.length;
    for (let a = 0; a < needed; a++) {
      const admitDay = String(Math.min(lastDay, 3 + (a * 2) % (lastDay - 4))).padStart(2, "0");
      const p = {
        seq: nextPatientSeq++,
        admission_date: `${ym}-${admitDay}`,
        rehab_start_date: `${ym}-${admitDay}`,
        discharge_date: null,
        outcome: null,
        reason_code: null,
        reason: null,
        intervention_upon_discharge: null,
        is_archived: 0,
        archived_at: null,
        enrollment_status: "active",
        current_status: "active",
      };
      patientPlans.push(p);
      activePool.push(p);
    }

    // Discharges: Completers
    for (let c = 0; c < row.comp; c++) {
      const p = activePool.shift();
      const discDay = String(Math.min(lastDay, 18 + (c * 2) % 10)).padStart(2, "0");
      p.discharge_date = `${ym}-${discDay}`;
      p.outcome = "COMPLETER";
      p.reason_code = "COMPLETED_PROGRAM";
      p.reason = "Completed Program (Graduated)";
      p.intervention_upon_discharge = "Completed 43 core curriculum requirements and all scheduled RDTs; endorsed to aftercare.";
      p.enrollment_status = "completed";
      p.current_status = "completed";
    }

    // Discharges: Non-Completers
    for (let nc = 0; nc < row.nonComp; nc++) {
      const p = activePool.shift();
      const discDay = String(Math.min(lastDay, 10 + (nc * 3) % 15)).padStart(2, "0");
      const reasonObj = NON_COMPLETER_REASONS[nc % NON_COMPLETER_REASONS.length];
      p.discharge_date = `${ym}-${discDay}`;
      p.outcome = "NON_COMPLETER";
      p.reason_code = reasonObj.code;
      p.reason = reasonObj.reason;
      p.intervention_upon_discharge = reasonObj.intervention;
      p.enrollment_status = "dropped";
      p.current_status = "dropped";
    }
  }

  console.log(`  Generated ${patientPlans.length} patient plans.`);
  console.log(`  Patients active in 2026: ${activePool.length} active patients.`);

  // 3. Insert patients and detailed clinical records
  console.log("\n[3/5] Inserting patients, milestones, intakes, and referrals...");
  let maleCount = 0;
  let femaleCount = 0;

  for (let i = 0; i < patientPlans.length; i++) {
    const p = patientPlans[i];
    const isFemale = i % 7 === 0; // ~14% female, ~86% male
    const gender = isFemale ? "female" : "male";
    const firstName = isFemale
      ? FIRST_NAMES_FEMALE[i % FIRST_NAMES_FEMALE.length]
      : FIRST_NAMES_MALE[i % FIRST_NAMES_MALE.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const middleName = MIDDLE_NAMES[i % MIDDLE_NAMES.length];
    const fullName = `${firstName} ${middleName.charAt(0)}. ${lastName}`;

    const lgu = LGUS[i % LGUS.length];
    const assignedCm = i % 2 === 0 ? cm1 : cm2;

    const admitYear = p.admission_date.slice(0, 4);
    const patientCode = `MTRC-${admitYear}-${String(p.seq).padStart(4, "0")}`;
    const pwudCode = `PWUD-${admitYear}-${String(p.seq).padStart(3, "0")}`;
    const opdNumber = `OPD-${admitYear}-${String(p.seq).padStart(4, "0")}`;

    // Birthdate (ages 20-52)
    const birthYear = Number(admitYear) - (20 + (i % 32));
    const birthdate = `${birthYear}-0${(i % 9) + 1}-15`;

    const referralCat = i % 3 === 0 ? "COURT_MANDATED" : i % 3 === 1 ? "VOLUNTARY" : "LGU_REFERRED";
    const referralSource =
      referralCat === "COURT_MANDATED"
        ? "Court-Mandated (Plea Bargaining)"
        : referralCat === "LGU_REFERRED"
        ? "CADAC / MADAC Referral"
        : "Voluntary Walk-in";
    const natureOfConfinement = referralCat === "COURT_MANDATED" ? "Court Mandated" : "Voluntary";
    const admissionCat = i % 15 === 0 ? "READMISSION" : i % 25 === 0 ? "RECOMMITMENT" : "NEW_ADMISSION";

    const requiredDuration = referralCat === "COURT_MANDATED" && i % 4 === 0 ? 12 : 7;
    const durationBasis = requiredDuration === 12 ? "COURT_ORDER_12_MONTHS" : "STANDARD_7_MONTHS";

    // Expected completion date
    const admitD = new Date(p.admission_date);
    const expCompD = new Date(admitD.getFullYear(), admitD.getMonth() + requiredDuration, admitD.getDate());
    const expectedCompletionDate = expCompD.toISOString().slice(0, 10);

    let programPhase = "Phase 2: Core CBT & Psychoeducation";
    if (p.outcome === "COMPLETER") programPhase = "Completed";
    else if (p.outcome === "NON_COMPLETER") programPhase = "Discontinued";
    else if (i % 4 === 0) programPhase = "Phase 1: Early Stabilization";
    else if (i % 4 === 3) programPhase = "Phase 3: Relapse Prevention";

    const [insertP] = await pool.query(
      `INSERT INTO patients (
        patient_code, pwud_code, opd_number, case_type,
        first_name, middle_name, last_name, full_name, gender, birthdate,
        municipality, barangay, street_address, province, region,
        civil_status, employment_status, educational_attainment,
        admission_date, rehab_start_date, referral_category, referral_source,
        admission_category, admission_type, enrollment_status, current_status,
        program_phase, required_duration_months, duration_basis, expected_completion_date,
        assigned_case_manager_id, is_archived, archived_at, primary_drug_use_reason,
        registered_by, created_at, updated_at
      ) VALUES (?, ?, ?, 'substance_use', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Albay', 'Region V (Bicol Region)',
        'single', 'Employed', 'High School Graduate',
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Peer influence / curiosity',
        ?, ?, ?)`,
      [
        patientCode, pwudCode, opdNumber,
        firstName, middleName, lastName, fullName, gender, birthdate,
        lgu.municipality, lgu.barangay, lgu.street,
        p.admission_date, p.rehab_start_date, referralCat, referralSource,
        admissionCat, referralCat === "COURT_MANDATED" ? "Court Mandated" : "Voluntary",
        p.enrollment_status, p.current_status,
        programPhase, requiredDuration, durationBasis, expectedCompletionDate,
        assignedCm.id, p.is_archived, p.archived_at,
        4, `${p.admission_date} 08:30:00`, `${p.admission_date} 08:30:00`
      ]
    );
    const patientId = insertP.insertId;
    p.dbId = patientId;
    p.fullName = fullName;
    p.patientCode = patientCode;
    p.pwudCode = pwudCode;
    p.assignedCm = assignedCm;

    // patient_referrals
    await pool.query(
      `INSERT INTO patient_referrals (
        patient_id, referral_source, admission_type, type_of_patient, nature_of_confinement,
        referring_organization, reason_for_referral, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 4, ?)`,
      [
        patientId, referralSource, referralCat === "COURT_MANDATED" ? "Court Mandated" : "Voluntary",
        admissionCat === "NEW_ADMISSION" ? "New" : "Old", natureOfConfinement,
        referralCat === "COURT_MANDATED" ? "RTC Branch 10, Legazpi City" : "LGU Health Office",
        referralCat === "COURT_MANDATED" ? `Plea Bargaining Framework (Crim Case ${admitYear}-${1000 + i})` : "Community-based referral",
        `${p.admission_date} 08:35:00`
      ]
    );

    // patient_intakes
    const comorbMedical = i % 8 === 0 ? "hypertension" : i % 15 === 0 ? "diabetes" : "";
    const comorbPsych = i % 10 === 0 ? "anxietyDisorder" : "";
    await pool.query(
      `INSERT INTO patient_intakes (
        patient_id, comorbidities, socioeconomic_classification, workflow_step, created_by, created_at
      ) VALUES (?, ?, 'C2', 5, 4, ?)`,
      [
        patientId,
        JSON.stringify({ medical: comorbMedical ? [comorbMedical] : [], psychiatric: comorbPsych ? [comorbPsych] : [], details: comorbMedical || comorbPsych || "None" }),
        `${p.admission_date} 09:00:00`
      ]
    );

    // Milestones
    const admitDt = new Date(p.admission_date);
    const datePo = p.admission_date;
    const dateVlts = p.admission_date;
    const dateAssessment = new Date(admitDt.getTime() + 2 * 86400000).toISOString().slice(0, 10);
    const dateTxPlan = new Date(admitDt.getTime() + 5 * 86400000).toISOString().slice(0, 10);
    const dateHomeVisit = new Date(admitDt.getTime() + 14 * 86400000).toISOString().slice(0, 10);
    const dateCaseConf = new Date(admitDt.getTime() + 30 * 86400000).toISOString().slice(0, 10);
    const dateStatusReport = new Date(admitDt.getTime() + 60 * 86400000).toISOString().slice(0, 10);

    let datePdc = null;
    let dateFinalReport = null;
    if (p.outcome === "COMPLETER" && p.discharge_date) {
      const discDt = new Date(p.discharge_date);
      datePdc = new Date(discDt.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      dateFinalReport = new Date(discDt.getTime() - 2 * 86400000).toISOString().slice(0, 10);
    }

    await pool.query(
      `INSERT INTO patient_milestones (
        patient_id, date_po, date_vlts_referral, date_initial_assessment,
        date_initial_tx_planning, date_initial_progress_report, date_home_visit,
        date_case_conference, date_status_reporting, date_acp_planning, date_pdc,
        date_final_progress_report, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId, datePo, dateVlts, dateAssessment,
        dateTxPlan, dateTxPlan, dateHomeVisit,
        dateCaseConf, dateStatusReport, datePdc, datePdc,
        dateFinalReport, `${p.admission_date} 10:00:00`
      ]
    );

    // Discharges table & patient_discharges table
    if (p.discharge_date) {
      const durationMos = Math.max(1, Math.round((new Date(p.discharge_date) - new Date(p.admission_date)) / (30.4 * 86400000)));

      await pool.query(
        `INSERT INTO patient_discharges (
          patient_id, discharge_date, status, reason, outcome, reason_code,
          treatment_duration_months, intervention_upon_discharge, court_notified,
          transition_to_aftercare, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          patientId, p.discharge_date, p.outcome === "COMPLETER" ? "Completer" : "Non-Completer",
          p.reason, p.outcome, p.reason_code, durationMos,
          p.intervention_upon_discharge, p.outcome === "COMPLETER" ? 1 : 0,
          `${p.discharge_date} 11:00:00`
        ]
      );

      await pool.query(
        `INSERT INTO discharges (
          patient_id, program_type, discharge_type, discharge_date, remarks,
          discharged_by, outcome, reason_code, created_at
        ) VALUES (?, 'outpatient', ?, ?, ?, ?, ?, ?, ?)`,
        [
          patientId, p.outcome === "COMPLETER" ? "Completer" : "Non-Completer",
          p.discharge_date, p.intervention_upon_discharge, assignedCm.full_name,
          p.outcome, p.reason_code, `${p.discharge_date} 11:00:00`
        ]
      );
    }

    // Status change history
    await pool.query(
      `INSERT INTO patient_status_history (
        patient_id, enrollment_status, effective_date, reason, changed_by, created_at
      ) VALUES (?, ?, ?, 'Initial intake admission', 4, ?)`,
      [patientId, "active", p.admission_date, `${p.admission_date} 09:00:00`]
    );

    if (p.discharge_date) {
      await pool.query(
        `INSERT INTO patient_status_history (
          patient_id, enrollment_status, effective_date, reason, changed_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          patientId, p.outcome === "COMPLETER" ? "completed" : "dropped",
          p.discharge_date, `Discharged: ${p.reason}`, assignedCm.id,
          `${p.discharge_date} 11:30:00`
        ]
      );
    }

    // Case manager assignment history
    await pool.query(
      `INSERT INTO patient_case_manager_history (
        patient_id, case_manager_id, case_manager_name, start_date, end_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [patientId, assignedCm.id, assignedCm.full_name, p.admission_date, p.discharge_date, `${p.admission_date} 09:30:00`]
    );
  }

  // 4. Clinical Activities: Attendance, CBT-E, Drug Tests, Consultations, Progress Notes
  console.log("\n[4/5] Generating attendance sessions, drug tests, CBT-E evaluations, and clinical notes...");

  // Let's create master scheduled sessions across 2024 to 2026
  // Including today (2026-11-15), yesterday, and upcoming days!
  const sessionCache = new Map(); // key: "date_type_slot" -> sessionId
  async function getOrCreateSession(dateStr, sessionType, topicId, topicName, facilitator) {
    const key = `${dateStr}_${sessionType}_${topicId || 0}`;
    if (sessionCache.has(key)) return sessionCache.get(key);

    const [res] = await pool.query(
      `INSERT INTO sessions (
        session_name, session_type, session_date, session_time, topic_id,
        topic_name, facilitator_name, case_manager_id, session_status, created_at
      ) VALUES (?, ?, ?, '09:00:00', ?, ?, ?, ?, 'COMPLETED', NOW())`,
      [
        `${topicName || sessionType}`, sessionType, dateStr,
        topicId || null, topicName || null, facilitator.full_name, facilitator.id
      ]
    );
    sessionCache.set(key, res.insertId);
    return res.insertId;
  }

  // Generate sessions for completers: all 43 core sessions!
  console.log("  Generating full 43-core curriculum completion records for Completers...");
  const completerPatients = patientPlans.filter((p) => p.outcome === "COMPLETER");
  const attendanceBatch = [];

  for (let ci = 0; ci < completerPatients.length; ci++) {
    const cp = completerPatients[ci];
    const admitD = new Date(cp.admission_date);
    const discD = new Date(cp.discharge_date);
    const totalDays = Math.max(43, Math.round((discD - admitD) / 86400000));
    const stepDays = totalDays / 45;

    // 28 CBT Sessions
    for (let s = 1; s <= 28; s++) {
      const sessD = new Date(admitD.getTime() + Math.round((s - 0.5) * stepDays * 86400000));
      const sessDateStr = sessD.toISOString().slice(0, 10);
      const topic = CORE_CBT_TOPICS[s - 1] || { title: `CBT Topic ${s}` };
      const sessId = await getOrCreateSession(sessDateStr, "CBT_GROUP", s, topic.title, cp.assignedCm);

      attendanceBatch.push([
        cp.dbId, sessId, sessDateStr, "CBT_GROUP", s, topic.title,
        cp.assignedCm.full_name, "present", "CREDITED", `[CBT-${String(s).padStart(2, "0")}] ${topic.title}`,
        "08:55", "NEGATIVE", 0, 0, 0, `${sessDateStr} 11:00:00`
      ]);
    }

    // 12 PE Sessions
    for (let p = 1; p <= 12; p++) {
      const sessD = new Date(admitD.getTime() + Math.round((28 + (p - 0.5)) * stepDays * 86400000));
      const sessDateStr = sessD.toISOString().slice(0, 10);
      const topic = CORE_PE_TOPICS[p - 1] || { title: `PE Topic ${p}` };
      const sessId = await getOrCreateSession(sessDateStr, "PSYCHO_EDUCATION", p, topic.title, cp.assignedCm);

      attendanceBatch.push([
        cp.dbId, sessId, sessDateStr, "PSYCHO_EDUCATION", p, topic.title,
        cp.assignedCm.full_name, "present", "CREDITED", `[PE-${String(p).padStart(2, "0")}] ${topic.title}`,
        "08:58", "NEGATIVE", 0, 0, 0, `${sessDateStr} 11:00:00`
      ]);
    }

    // 3 CBT-E Evaluations
    for (let e = 1; e <= 3; e++) {
      const offsetRatio = e === 1 ? 0.05 : e === 2 ? 0.5 : 0.95;
      const evalD = new Date(admitD.getTime() + Math.round(totalDays * offsetRatio * 86400000));
      const evalDateStr = evalD.toISOString().slice(0, 10);
      const evalType = `CBTE_${e}`;

      await pool.query(
        `INSERT INTO patient_cbte_evaluations (
          patient_id, evaluation_type, evaluation_date, evaluator_id, evaluator_name,
          overall_score, clinical_judgment, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'PROGRESSING', ?)`,
        [cp.dbId, evalType, evalDateStr, cp.assignedCm.id, cp.assignedCm.full_name, 28 + e * 4, `${evalDateStr} 14:00:00`]
      );
    }

    // Drug test logs (Multi-3: MET, THC, BZO - Negative for Completers)
    for (let dt = 1; dt <= 4; dt++) {
      const dtD = new Date(admitD.getTime() + Math.round((dt * totalDays) / 5 * 86400000));
      const dtDateStr = dtD.toISOString().slice(0, 10);

      await pool.query(
        `INSERT INTO drug_test_logs (
          patient_id, test_date, test_type, substance_tested, result,
          recorded_by, tested_by_name, remarks, created_at
        ) VALUES (?, ?, 'Random Urine Drug Test', 'MET, THC, BZO', 'NEGATIVE', ?, ?, 'All 3 panels NEGATIVE (MET-, THC-, BZO-)', ?)`,
        [cp.dbId, dtDateStr, cp.assignedCm.id, cp.assignedCm.full_name, `${dtDateStr} 10:00:00`]
      );
    }
  }

  // Active 2026 Patients: Progressive curriculum across warm modalities!
  console.log("  Generating progressive attendance and calendar schedules for 2026 Active Patients...");
  const [[{ curDate }]] = await pool.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS curDate");
  const todayStr = curDate;
  const currentMonth = Number(todayStr.slice(5, 7));
  const currentDay = Number(todayStr.slice(8, 10));

  const activePatients = patientPlans.filter((p) => p.enrollment_status === "active" && !p.is_archived);

  const interventionsBatch = [];
  const consultsBatch = [];
  const drugTestsBatch = [];
  const notesBatch = [];
  const cbteBatch = [];

  for (let ai = 0; ai < activePatients.length; ai++) {
    const ap = activePatients[ai];
    const admitD = new Date(ap.admission_date);
    const admitMonth = admitD.getMonth() + 1;

    let cbtTopicIdx = 1;
    let peTopicIdx = 1;

    // Monthly progression across each month from admission up to currentMonth
    for (let m = admitMonth; m <= currentMonth; m++) {
      const ym = `2026-${String(m).padStart(2, "0")}`;
      const isCurrentMonth = m === currentMonth;
      const maxDay = isCurrentMonth ? Math.max(2, Math.min(28, currentDay - 1)) : 28;

      // 1. CBT Group: 2 sessions per month
      const cbtDay1 = String(Math.min(maxDay, 4 + (ai % 3))).padStart(2, "0");
      const cbtDay2 = String(Math.min(maxDay, 18 + (ai % 4))).padStart(2, "0");

      if (Number(cbtDay1) <= maxDay && cbtTopicIdx <= 28) {
        const sessDateStr = `${ym}-${cbtDay1}`;
        const topic = CORE_CBT_TOPICS[cbtTopicIdx - 1] || { title: `CBT Topic ${cbtTopicIdx}` };
        const sessId = await getOrCreateSession(sessDateStr, "CBT_GROUP", cbtTopicIdx, topic.title, ap.assignedCm);
        attendanceBatch.push([
          ap.dbId, sessId, sessDateStr, "CBT_GROUP", cbtTopicIdx, topic.title,
          ap.assignedCm.full_name, "present", "CREDITED", `[CBT-${String(cbtTopicIdx).padStart(2, "0")}] ${topic.title}`,
          "08:50", "NEGATIVE", 0, 0, 0, `${sessDateStr} 11:00:00`
        ]);
        cbtTopicIdx++;
      }

      if (Number(cbtDay2) <= maxDay && cbtTopicIdx <= 28) {
        const sessDateStr = `${ym}-${cbtDay2}`;
        const topic = CORE_CBT_TOPICS[cbtTopicIdx - 1] || { title: `CBT Topic ${cbtTopicIdx}` };
        const sessId = await getOrCreateSession(sessDateStr, "CBT_GROUP", cbtTopicIdx, topic.title, ap.assignedCm);
        attendanceBatch.push([
          ap.dbId, sessId, sessDateStr, "CBT_GROUP", cbtTopicIdx, topic.title,
          ap.assignedCm.full_name, "present", "CREDITED", `[CBT-${String(cbtTopicIdx).padStart(2, "0")}] ${topic.title}`,
          "08:55", "NEGATIVE", 0, 0, 0, `${sessDateStr} 11:00:00`
        ]);
        cbtTopicIdx++;
      }

      // 2. PE Meetings: 1 session per month
      const peDay = String(Math.min(maxDay, 11 + (ai % 5))).padStart(2, "0");
      if (Number(peDay) <= maxDay && peTopicIdx <= 12) {
        const sessDateStr = `${ym}-${peDay}`;
        const topic = CORE_PE_TOPICS[peTopicIdx - 1] || { title: `PE Topic ${peTopicIdx}` };
        const sessId = await getOrCreateSession(sessDateStr, "PSYCHO_EDUCATION", peTopicIdx, topic.title, ap.assignedCm);
        attendanceBatch.push([
          ap.dbId, sessId, sessDateStr, "PSYCHO_EDUCATION", peTopicIdx, topic.title,
          ap.assignedCm.full_name, "present", "CREDITED", `[PE-${String(peTopicIdx).padStart(2, "0")}] ${topic.title}`,
          "08:58", "NEGATIVE", 0, 0, 0, `${sessDateStr} 11:00:00`
        ]);
        peTopicIdx++;
      }

      // 3. SHGM (Supplementary): 1 session every 2 months or current month
      if (m % 2 === 0 || m === currentMonth) {
        const shgmDay = String(Math.min(maxDay, 14 + (ai % 3))).padStart(2, "0");
        if (Number(shgmDay) <= maxDay) {
          const sessDateStr = `${ym}-${shgmDay}`;
          const sessId = await getOrCreateSession(sessDateStr, "SHGM", 0, "Self-Help 12-Steps Fellow Recovery Meeting", ap.assignedCm);
          attendanceBatch.push([
            ap.dbId, sessId, sessDateStr, "SHGM", 0, "Self-Help 12-Steps Fellow Recovery Meeting",
            ap.assignedCm.full_name, "present", "CREDITED", "[SHGM] Peer Recovery Group Support",
            "10:00", "NEGATIVE", 0, 0, 0, `${sessDateStr} 12:00:00`
          ]);
        }
      }

      // 4. Individual Counseling (Supplementary): 1 session per month
      const indDay = String(Math.min(maxDay, 7 + (ai % 4))).padStart(2, "0");
      if (Number(indDay) <= maxDay) {
        const sessDateStr = `${ym}-${indDay}`;
        const sessId = await getOrCreateSession(sessDateStr, "INDIVIDUAL_COUNSELING", 0, "Individual Psycho-Social Counseling", ap.assignedCm);
        attendanceBatch.push([
          ap.dbId, sessId, sessDateStr, "INDIVIDUAL_COUNSELING", 0, "Individual Psycho-Social Counseling",
          ap.assignedCm.full_name, "present", "CREDITED", "[IND] 1-on-1 Coping & Relapse Prevention Dialogue",
          "14:00", "NEGATIVE", 0, 0, 0, `${sessDateStr} 15:30:00`
        ]);
      }

      // 5. Conjoint / Family Session: Periodic (e.g. months 2, 5, 8, 11)
      if (m % 3 === 2 || m === currentMonth) {
        const famDay = String(Math.min(maxDay, 20 + (ai % 4))).padStart(2, "0");
        if (Number(famDay) <= maxDay) {
          const sessDateStr = `${ym}-${famDay}`;
          const sessId = await getOrCreateSession(sessDateStr, "CONJOINT_FAMILY", 1, "Family Support & Reintegration Dialogue", ap.assignedCm);
          attendanceBatch.push([
            ap.dbId, sessId, sessDateStr, "CONJOINT_FAMILY", 1, "Family Support & Reintegration Dialogue",
            ap.assignedCm.full_name, "present", "CREDITED", "[PE-FAM] Family Support Meeting",
            "09:30", "NEGATIVE", 0, 0, 0, `${sessDateStr} 11:30:00`
          ]);
        }
      }

      // 6. Multi-3 Drug Urinalyses: Every 2 months and always in currentMonth
      if (m % 2 === 1 || m === currentMonth) {
        const dtDay = String(Math.min(maxDay, 9 + (ai % 3))).padStart(2, "0");
        const dtDateStr = `${ym}-${dtDay}`;
        drugTestsBatch.push([
          ap.dbId, dtDateStr, "Random Urine Drug Test", "MET, THC, BZO", "NEGATIVE",
          ap.assignedCm.id, ap.assignedCm.full_name, "All 3 panels NEGATIVE (MET-, THC-, BZO-)", `${dtDateStr} 10:00:00`
        ]);
      }

      // 7. Clinical Interventions:
      const intervDay = String(Math.min(maxDay, 16 + (ai % 4))).padStart(2, "0");
      const intervDateStr = `${ym}-${intervDay}`;
      const intervType = m % 4 === 1 ? "HOME_VISIT" : m % 4 === 2 ? "CASE_CONFERENCE" : m % 4 === 3 ? "FAMILY_COORDINATION" : "TREATMENT_PLANNING";
      const intervRemarks =
        intervType === "HOME_VISIT"
          ? "Case manager conducted home visitation and family environment review."
          : intervType === "CASE_CONFERENCE"
          ? "Multidisciplinary case conference on client recovery trajectory."
          : intervType === "FAMILY_COORDINATION"
          ? "Coordination with family support system on recovery structure."
          : "Treatment planning review and milestone progression check.";

      interventionsBatch.push([
        ap.dbId, intervDateStr, intervType, null, ap.assignedCm.id, ap.assignedCm.full_name,
        intervType === "HOME_VISIT" ? "Home" : "Facility", 1, intervRemarks, ap.assignedCm.id,
        `${intervDateStr} 14:00:00`
      ]);

      // Consultations (Medical / Psychiatric)
      if (m === 2 || m === 7) {
        consultsBatch.push([
          ap.dbId, `${ym}-12`, "M", "General medical routine follow-up: vital signs and physical exam stable.", ap.assignedCm.id, `${ym}-12 11:00:00`
        ]);
      }
      if (m === 4 || m === currentMonth) {
        consultsBatch.push([
          ap.dbId, `${ym}-15`, "P", "Psychiatric mental state evaluation: sustained abstinence, no mood disturbances.", ap.assignedCm.id, `${ym}-15 11:00:00`
        ]);
      }

      // 8. Progress Notes in progress_notes
      const noteDay = String(Math.min(maxDay, 15 + (ai % 5))).padStart(2, "0");
      const noteDateStr = `${ym}-${noteDay}`;
      notesBatch.push([
        ap.dbId, noteDateStr, "CBT_GROUP", "Low", "Safe / Stable",
        "Client verbalizes sustained abstinence and demonstrates improved coping strategies.",
        "CBT Psychoeducation on high-risk situations and cravings management.",
        "Active participation during sessions; attentive and well-groomed.",
        "Continue regular attendance in CBT and Family Support sessions.",
        ap.assignedCm.id, "progress",
        `Clinical Progress Review: Client is maintaining abstinence; demonstrated good engagement in month ${m}.`,
        `${noteDateStr} 16:00:00`
      ]);
    }

    // CBT-E evaluations for active patients
    cbteBatch.push([
      ap.dbId, "CBTE_1", "2026-02-15", ap.assignedCm.id, ap.assignedCm.full_name, 28, "PROGRESSING", "2026-02-15 14:00:00"
    ]);
    cbteBatch.push([
      ap.dbId, "CBTE_2", "2026-06-20", ap.assignedCm.id, ap.assignedCm.full_name, 32, "PROGRESSING", "2026-06-20 14:00:00"
    ]);

    // Make 2 active patients "PDC Ready" (all 43 core complete + duration met) for presentation!
    if (ai === 0 || ai === 1) {
      cbteBatch.push([
        ap.dbId, "CBTE_3", "2026-11-05", ap.assignedCm.id, ap.assignedCm.full_name, 38, "PROGRESSING", "2026-11-05 14:00:00"
      ]);
      await pool.query(
        "UPDATE patient_milestones SET date_pdc = '2026-11-08', date_final_progress_report = '2026-11-12' WHERE patient_id = ?",
        [ap.dbId]
      );
    }
  }

  // Insert batch records for active patients
  if (cbteBatch.length > 0) {
    await pool.query(
      `INSERT INTO patient_cbte_evaluations (
        patient_id, evaluation_type, evaluation_date, evaluator_id, evaluator_name,
        overall_score, clinical_judgment, created_at
      ) VALUES ?`,
      [cbteBatch]
    );
  }

  if (drugTestsBatch.length > 0) {
    for (let b = 0; b < drugTestsBatch.length; b += 500) {
      const chunk = drugTestsBatch.slice(b, b + 500);
      await pool.query(
        `INSERT INTO drug_test_logs (
          patient_id, test_date, test_type, substance_tested, result,
          recorded_by, tested_by_name, remarks, created_at
        ) VALUES ?`,
        [chunk]
      );
    }
  }

  if (interventionsBatch.length > 0) {
    for (let b = 0; b < interventionsBatch.length; b += 500) {
      const chunk = interventionsBatch.slice(b, b + 500);
      await pool.query(
        `INSERT INTO patient_interventions (
          patient_id, intervention_date, intervention_type, consult_type,
          responsible_staff_id, responsible_staff_name, location_setting,
          qualifies_for_monthly_tracker, remarks, recorded_by, created_at
        ) VALUES ?`,
        [chunk]
      );
    }
  }

  if (consultsBatch.length > 0) {
    for (let b = 0; b < consultsBatch.length; b += 500) {
      const chunk = consultsBatch.slice(b, b + 500);
      await pool.query(
        `INSERT INTO patient_consult_logs (
          patient_id, consult_date, consult_type, notes, recorded_by, created_at
        ) VALUES ?`,
        [chunk]
      );
    }
  }

  if (notesBatch.length > 0) {
    for (let b = 0; b < notesBatch.length; b += 500) {
      const chunk = notesBatch.slice(b, b + 500);
      await pool.query(
        `INSERT INTO progress_notes (
          patient_id, session_date, session_type, relapse_risk, staff_risk_assessment,
          observation, intervention_provided, patient_response, recommendations,
          case_manager_id, note_type, content, created_at
        ) VALUES ?`,
        [chunk]
      );
    }
  }

  // 1 recent missed session for each case manager (3 days ago) to populate attention feed
  const activeSubset = activePatients.slice(0, 12);
  const apCm1 = activePatients.find((p) => p.assignedCm.id === cm1.id) || activeSubset[0];
  const apCm2 = activePatients.find((p) => p.assignedCm.id === cm2.id) || activeSubset[1];
  const recentMissedDate = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  const missedSess1 = await getOrCreateSession(recentMissedDate, "CBT_GROUP", 12, "Sesyon 12. Alak", cm1);
  const missedSess2 = await getOrCreateSession(recentMissedDate, "CBT_GROUP", 12, "Sesyon 12. Alak", cm2);
  attendanceBatch.push([
    apCm1.dbId, missedSess1, recentMissedDate, "CBT_GROUP", 12, "Sesyon 12. Alak",
    cm1.full_name, "absent", "NOT_CREDITED", "[CBT-12] Sesyon 12. Alak",
    null, null, 0, 0, 0, `${recentMissedDate} 11:00:00`
  ]);
  attendanceBatch.push([
    apCm2.dbId, missedSess2, recentMissedDate, "CBT_GROUP", 12, "Sesyon 12. Alak",
    cm2.full_name, "absent", "NOT_CREDITED", "[CBT-12] Sesyon 12. Alak",
    null, null, 0, 0, 0, `${recentMissedDate} 11:00:00`
  ]);

  // Insert all batched attendance records
  console.log(`  Writing ${attendanceBatch.length} attendance records in fast chunks...`);
  for (let b = 0; b < attendanceBatch.length; b += 500) {
    const chunk = attendanceBatch.slice(b, b + 500);
    await pool.query(
      `INSERT INTO attendance (
        patient_id, session_id, session_date, session_type, topic_id, topic_name,
        facilitator_name, status, completion_status, curriculum_requirement,
        arrival_time, drug_test_result, is_makeup, is_duplicate_topic, is_carryover, created_at
      ) VALUES ?`,
      [chunk]
    );
  }

  // Schedule active sessions for today and presentation demo!
  console.log("  Scheduling active sessions for today and presentation demo...");

  // 1. CBT Group at 09:00 AM for Joshua Loretcha (cm1)
  const [res1] = await pool.query(
    `INSERT INTO sessions (
      session_name, session_type, session_date, session_time, topic_id,
      topic_name, facilitator_name, case_manager_id, session_status, created_at
    ) VALUES (?, 'CBT_GROUP', ?, '09:00:00', 15, 'Sesyon 15. Pamamahala sa Pagkagalit at Emosyon', ?, ?, 'SCHEDULED', NOW())`,
    ["CBT Group: Sesyon 15. Pamamahala sa Pagkagalit at Emosyon", todayStr, cm1.full_name, cm1.id]
  );
  const demoSession1 = res1.insertId;

  // 2. Conjoint / Family Session at 10:30 AM for Ash Quinas (cm2)
  const [res2] = await pool.query(
    `INSERT INTO sessions (
      session_name, session_type, session_date, session_time, topic_id,
      topic_name, facilitator_name, case_manager_id, session_status, created_at
    ) VALUES (?, 'CONJOINT_FAMILY', ?, '10:30:00', 1, 'Family Support & Reintegration Dialogue', ?, ?, 'SCHEDULED', NOW())`,
    ["Conjoint / Family: Family Support & Reintegration Dialogue", todayStr, cm2.full_name, cm2.id]
  );
  const demoSession2 = res2.insertId;

  // 3. Psycho-Education at 02:00 PM for Joshua Loretcha (cm1)
  const [res3] = await pool.query(
    `INSERT INTO sessions (
      session_name, session_type, session_date, session_time, topic_id,
      topic_name, facilitator_name, case_manager_id, session_status, created_at
    ) VALUES (?, 'PSYCHO_EDUCATION', ?, '14:00:00', 4, 'Sesyon 4. Ang Proseso ng Adiksyon', ?, ?, 'SCHEDULED', NOW())`,
    ["Psycho-Education: Sesyon 4. Ang Proseso ng Adiksyon", todayStr, cm1.full_name, cm1.id]
  );
  const demoSession3 = res3.insertId;

  for (const ap of activeSubset.slice(0, 4)) {
    await pool.query("INSERT IGNORE INTO session_roster (session_id, patient_id, created_at) VALUES (?, ?, NOW())", [demoSession1, ap.dbId]);
  }
  for (const ap of activeSubset.slice(4, 8)) {
    await pool.query("INSERT IGNORE INTO session_roster (session_id, patient_id, created_at) VALUES (?, ?, NOW())", [demoSession2, ap.dbId]);
  }
  for (const ap of activeSubset.slice(8, 12)) {
    await pool.query("INSERT IGNORE INTO session_roster (session_id, patient_id, created_at) VALUES (?, ?, NOW())", [demoSession3, ap.dbId]);
  }

  // Follow-ups for case managers
  const apCm1Follow = activePatients.filter((p) => p.assignedCm.id === cm1.id);
  const apCm2Follow = activePatients.filter((p) => p.assignedCm.id === cm2.id);

  await pool.query(`INSERT INTO follow_ups (patient_id, assigned_to, reason, remarks, status, due_date, created_at) VALUES
    (?, ?, 'Court Order Compliance', 'Verify quarterly progress report submission to RTC Branch 2', 'pending', DATE_ADD(CURDATE(), INTERVAL 1 DAY), NOW()),
    (?, ?, 'Family Session Coordination', 'Follow-up family members for scheduled Saturday reintegration dialogue', 'pending', DATE_ADD(CURDATE(), INTERVAL 3 DAY), NOW()),
    (?, ?, 'Psychiatric Referral Endorsement', 'Review specialist recommendations and adjust counseling schedule', 'pending', DATE_ADD(CURDATE(), INTERVAL 2 DAY), NOW()),
    (?, ?, 'Home Visit Verification', 'Conduct follow-up home visit to evaluate living arrangement support', 'pending', DATE_ADD(CURDATE(), INTERVAL 4 DAY), NOW())
  `, [
    apCm1Follow[0].dbId, cm1.id,
    apCm1Follow[1].dbId, cm1.id,
    apCm2Follow[0].dbId, cm2.id,
    apCm2Follow[1].dbId, cm2.id,
  ]);

  // 5. Audit Log and Verification
  console.log("\n[5/5] Auditing seeded database records...");
  const [[{ totalP }]] = await pool.query("SELECT COUNT(*) AS totalP FROM patients");
  const [[{ activeP }]] = await pool.query("SELECT COUNT(*) AS activeP FROM patients WHERE enrollment_status = 'active'");
  const [[{ compP }]] = await pool.query("SELECT COUNT(*) AS compP FROM patient_discharges WHERE outcome = 'COMPLETER'");
  const [[{ nonCompP }]] = await pool.query("SELECT COUNT(*) AS nonCompP FROM patient_discharges WHERE outcome = 'NON_COMPLETER'");
  const [[{ attCount }]] = await pool.query("SELECT COUNT(*) AS attCount FROM attendance");
  const [[{ dtCount }]] = await pool.query("SELECT COUNT(*) AS dtCount FROM drug_test_logs");
  const [[{ sessCount }]] = await pool.query("SELECT COUNT(*) AS sessCount FROM sessions");

  console.log({
    totalPatients: totalP,
    activePatientsNow: activeP,
    totalCompleters: compP,
    totalNonCompleters: nonCompP,
    attendanceRecords: attCount,
    drugTestLogs: dtCount,
    scheduledSessions: sessCount,
  });

  console.log("\n✅ SEEDING COMPLETE! DATABASE SYNCHRONIZED TO TABLE 2.0 FOR PRESENTATION.");
}

// Execute when invoked directly
if (process.argv[1] && process.argv[1].includes("seedMockDataFromTable2.js")) {
  seedMockData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
