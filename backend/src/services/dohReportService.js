import pool from "../config/db.js";

function formatDateYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Utility to create start/end date for a month
function getMonthRange(month, year) {
  const m = Number(month);
  const y = Number(year);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end, month: m, year: y };
}

const isFemale = (gender) => gender && String(gender).trim().toLowerCase().startsWith("f");

// 1. Form 4.1 (A & B) — Percentage of Drug Abuse Cases Managed (Outpatient & Aftercare)
export async function getCensusMetrics(month, year) {
  const { start, end } = getMonthRange(month, year);

  // Fetch all relevant active/enrolled patients and referrals
  const [patients] = await pool.query(
    `SELECT p.id, p.patient_code, p.gender, p.admission_date, p.enrollment_status,
            p.current_status, p.program_phase, p.prior_rehab_admissions, p.notes,
            COALESCE(r.referral_source, p.referral_source) as referral_source,
            COALESCE(r.nature_of_confinement, p.nature_of_confinement) as nature_of_confinement,
            COALESCE(r.prior_rehab_admissions, p.prior_rehab_admissions, 0) as prior_admissions
     FROM patients p
     LEFT JOIN patient_referrals r ON r.patient_id = p.id
     WHERE p.is_archived = FALSE`
  );

  // Initialize Form 4.1 A (Outpatient Service) counters
  const op = {
    new_court_voluntary: { m: 0, f: 0, total: 0 },
    new_court_compulsory: { m: 0, f: 0, total: 0 },
    new_court_plea: { m: 0, f: 0, total: 0 },
    subtotal_court: { m: 0, f: 0, total: 0 },
    new_non_court_voluntary: { m: 0, f: 0, total: 0 },
    new_non_court_lgu: { m: 0, f: 0, total: 0 },
    subtotal_non_court: { m: 0, f: 0, total: 0 },
    total_new: { m: 0, f: 0, total: 0 },

    readm_court_voluntary: { m: 0, f: 0, total: 0 },
    readm_court_compulsory: { m: 0, f: 0, total: 0 },
    subtotal_readm_court: { m: 0, f: 0, total: 0 },
    readm_non_court_voluntary: { m: 0, f: 0, total: 0 },
    readm_non_court_lgu: { m: 0, f: 0, total: 0 },
    subtotal_readm_non_court: { m: 0, f: 0, total: 0 },
    total_readm: { m: 0, f: 0, total: 0 },

    recommit_court: { m: 0, f: 0, total: 0 },
    recommit_non_court: { m: 0, f: 0, total: 0 },
    total_recommit: { m: 0, f: 0, total: 0 },

    total_new_readm_recommit: { m: 0, f: 0, total: 0 },
    cases_before_period: { m: 0, f: 0, total: 0 },
    grand_total: { m: 0, f: 0, total: 0 },
    performance: { numerator: 0, denominator: 0, rate: 100 }
  };

  // Initialize Form 4.1 B (Aftercare Service) counters
  const ac = {
    new_inpatient_same: { m: 0, f: 0, total: 0 },
    new_inpatient_other: { m: 0, f: 0, total: 0 },
    subtotal_inpatient: { m: 0, f: 0, total: 0 },
    new_outpatient_same: { m: 0, f: 0, total: 0 },
    new_outpatient_other: { m: 0, f: 0, total: 0 },
    subtotal_outpatient: { m: 0, f: 0, total: 0 },
    total_new: { m: 0, f: 0, total: 0 },

    readm_total: { m: 0, f: 0, total: 0 },
    total_new_readm: { m: 0, f: 0, total: 0 },
    cases_before_period: { m: 0, f: 0, total: 0 },
    grand_total: { m: 0, f: 0, total: 0 },
    performance: { numerator: 0, denominator: 0, rate: 100 }
  };

  function addCount(target, gender) {
    const isF = isFemale(gender);
    if (isF) {
      target.f++;
    } else {
      target.m++;
    }
    target.total++;
  }

  patients.forEach((p) => {
    const isAc =
      (p.current_status && String(p.current_status).toLowerCase() === "aftercare") ||
      (p.program_phase && String(p.program_phase).toLowerCase() === "aftercare");

    const admDate = p.admission_date ? new Date(p.admission_date) : null;
    const isAdmittedThisMonth =
      admDate &&
      formatDateYMD(admDate) >= start &&
      formatDateYMD(admDate) <= end;

    const isAdmittedBeforeMonth =
      admDate &&
      formatDateYMD(admDate) < start &&
      (p.enrollment_status === "active" || p.current_status === "active");

    const nature = (p.nature_of_confinement || "").toLowerCase();
    const refSrc = (p.referral_source || "").toLowerCase();
    const priorAdm = Number(p.prior_admissions) || 0;
    const isRecommitment = nature.includes("recommit") || (p.notes && p.notes.toLowerCase().includes("recommit"));

    if (isAc) {
      // AFTERCARE SERVICE
      if (isAdmittedThisMonth) {
        if (priorAdm > 0) {
          addCount(ac.readm_total, p.gender);
        } else {
          // New enrollment in aftercare
          const fromInpatient = refSrc.includes("inpatient") || nature.includes("inpatient");
          const isOther = refSrc.includes("other") || nature.includes("other");
          if (fromInpatient) {
            if (isOther) addCount(ac.new_inpatient_other, p.gender);
            else addCount(ac.new_inpatient_same, p.gender);
          } else {
            if (isOther) addCount(ac.new_outpatient_other, p.gender);
            else addCount(ac.new_outpatient_same, p.gender);
          }
        }
      } else if (isAdmittedBeforeMonth) {
        addCount(ac.cases_before_period, p.gender);
      }
    } else {
      // OUTPATIENT SERVICE
      if (isAdmittedThisMonth) {
        if (isRecommitment) {
          if (nature.includes("court") || refSrc.includes("court")) {
            addCount(op.recommit_court, p.gender);
          } else {
            addCount(op.recommit_non_court, p.gender);
          }
        } else if (priorAdm > 0) {
          // Readmission
          if (nature.includes("plea") || nature.includes("court") || nature.includes("compulsory") || refSrc.includes("court")) {
            if (nature.includes("compulsory")) {
              addCount(op.readm_court_compulsory, p.gender);
            } else {
              addCount(op.readm_court_voluntary, p.gender);
            }
          } else {
            if (refSrc.includes("lgu")) {
              addCount(op.readm_non_court_lgu, p.gender);
            } else {
              addCount(op.readm_non_court_voluntary, p.gender);
            }
          }
        } else {
          // New Enrolment
          const isCourt =
            nature.includes("plea") ||
            nature.includes("court") ||
            nature.includes("compulsory") ||
            nature.includes("arrested") ||
            refSrc.includes("court");

          if (isCourt) {
            if (nature.includes("plea")) {
              addCount(op.new_court_plea, p.gender);
            } else if (nature.includes("compulsory")) {
              addCount(op.new_court_compulsory, p.gender);
            } else {
              addCount(op.new_court_voluntary, p.gender);
            }
          } else {
            if (refSrc.includes("lgu")) {
              addCount(op.new_non_court_lgu, p.gender);
            } else {
              addCount(op.new_non_court_voluntary, p.gender);
            }
          }
        }
      } else if (isAdmittedBeforeMonth) {
        addCount(op.cases_before_period, p.gender);
      }
    }
  });

  // Calculate subtotals for Outpatient (A)
  ["m", "f", "total"].forEach((k) => {
    op.subtotal_court[k] = op.new_court_voluntary[k] + op.new_court_compulsory[k] + op.new_court_plea[k];
    op.subtotal_non_court[k] = op.new_non_court_voluntary[k] + op.new_non_court_lgu[k];
    op.total_new[k] = op.subtotal_court[k] + op.subtotal_non_court[k];

    op.subtotal_readm_court[k] = op.readm_court_voluntary[k] + op.readm_court_compulsory[k];
    op.subtotal_readm_non_court[k] = op.readm_non_court_voluntary[k] + op.readm_non_court_lgu[k];
    op.total_readm[k] = op.subtotal_readm_court[k] + op.subtotal_readm_non_court[k];

    op.total_recommit[k] = op.recommit_court[k] + op.recommit_non_court[k];
    op.total_new_readm_recommit[k] = op.total_new[k] + op.total_readm[k] + op.total_recommit[k];
    op.grand_total[k] = op.total_new_readm_recommit[k] + op.cases_before_period[k];
  });
  op.performance.numerator = op.grand_total.total;
  op.performance.denominator = op.grand_total.total;
  op.performance.rate = op.grand_total.total > 0 ? 100 : 100;

  // Calculate subtotals for Aftercare (B)
  ["m", "f", "total"].forEach((k) => {
    ac.subtotal_inpatient[k] = ac.new_inpatient_same[k] + ac.new_inpatient_other[k];
    ac.subtotal_outpatient[k] = ac.new_outpatient_same[k] + ac.new_outpatient_other[k];
    ac.total_new[k] = ac.subtotal_inpatient[k] + ac.subtotal_outpatient[k];
    ac.total_new_readm[k] = ac.total_new[k] + ac.readm_total[k];
    ac.grand_total[k] = ac.total_new_readm[k] + ac.cases_before_period[k];
  });
  ac.performance.numerator = ac.grand_total.total;
  ac.performance.denominator = ac.grand_total.total;
  ac.performance.rate = ac.grand_total.total > 0 ? 100 : 100;

  return { outpatient: op, aftercare: ac, month: Number(month), year: Number(year) };
}

// 2. Form 4.2 — Service Provision to PWUDs (Outpatient & Aftercare Modalities)
export async function getServiceTallies(month, year) {
  const { start, end } = getMonthRange(month, year);

  // Group attendance by session_type, patient gender, and modality
  const [attendanceRows] = await pool.query(
    `SELECT a.session_type, p.gender,
            CASE WHEN p.current_status = 'aftercare' OR p.program_phase = 'Aftercare' THEN 'aftercare' ELSE 'outpatient' END as modality,
            COUNT(*) as session_count
     FROM attendance a
     JOIN patients p ON p.id = a.patient_id
     WHERE a.session_date BETWEEN ? AND ? AND a.status = 'present'
     GROUP BY a.session_type, p.gender, modality`,
    [start, end]
  );

  // Drug tests in period
  const [drugTestRows] = await pool.query(
    `SELECT p.gender,
            CASE WHEN p.current_status = 'aftercare' OR p.program_phase = 'Aftercare' THEN 'aftercare' ELSE 'outpatient' END as modality,
            COUNT(*) as dt_count
     FROM drug_test_logs d
     JOIN patients p ON p.id = d.patient_id
     WHERE d.test_date BETWEEN ? AND ?
     GROUP BY p.gender, modality`,
    [start, end]
  );

  // Screening & DDE in period (from referrals/intakes)
  const [assessmentRows] = await pool.query(
    `SELECT r.assist_risk_level, r.dde_severity_diagnosis, p.gender,
            CASE WHEN p.current_status = 'aftercare' OR p.program_phase = 'Aftercare' THEN 'aftercare' ELSE 'outpatient' END as modality
     FROM patient_referrals r
     JOIN patients p ON p.id = r.patient_id
     WHERE (r.referral_date BETWEEN ? AND ? OR p.admission_date BETWEEN ? AND ?)`,
    [start, end, start, end]
  );

  const initCounter = () => ({ m: 0, f: 0, total: 0 });
  const bump = (obj, gender, count = 1) => {
    if (isFemale(gender)) obj.f += count;
    else obj.m += count;
    obj.total += count;
  };

  const op = {
    // A. Screening, Assessment & DDE
    assist_low: initCounter(),
    assist_moderate: initCounter(),
    assist_high: initCounter(),
    brief_intervention: initCounter(),
    social_worker_eval: initCounter(),
    dde_mild: initCounter(),
    dde_moderate: initCounter(),
    dde_severe: initCounter(),
    // B. Medical & Mental Health
    medical_assessment: initCounter(),
    mental_assessment: initCounter(),
    // C. Structured Outpatient Modalities
    cbte_sessions: initCounter(),
    individual_counseling: initCounter(),
    shgm: initCounter(),
    psycho_education: initCounter(),
    life_skills: initCounter(),
    asi_interview: initCounter(),
    home_visit: initCounter(),
    program_orientation: initCounter(),
    // Support Services
    drug_tests: initCounter(),
    psychiatric_eval: initCounter(),
    hiv_screening: initCounter(),
    grand_total: initCounter()
  };

  const ac = {
    medical_mental_health: initCounter(),
    miop: initCounter(),
    family_dialogue: initCounter(),
    individual_counseling: initCounter(),
    pre_discharge_conf: initCounter(),
    home_visit: initCounter(),
    surveillance_drug_test: initCounter(),
    case_conference: initCounter(),
    sibol_virtual: initCounter(),
    sibol_f2f: initCounter(),
    skills_vocational: initCounter(),
    spiritual_pastoral: initCounter(),
    recovery_coaching: initCounter(),
    family_support: initCounter(),
    livelihood_referral: initCounter(),
    community_outreach: initCounter(),
    grand_total: initCounter()
  };

  // Map screening & assessments
  assessmentRows.forEach((r) => {
    const target = r.modality === "aftercare" ? ac : op;
    if (r.assist_risk_level) {
      const lvl = String(r.assist_risk_level).toLowerCase();
      if (lvl.includes("low")) bump(op.assist_low, r.gender);
      else if (lvl.includes("mod")) bump(op.assist_moderate, r.gender);
      else if (lvl.includes("high")) bump(op.assist_high, r.gender);
      bump(op.brief_intervention, r.gender);
    }
    if (r.dde_severity_diagnosis) {
      const dde = String(r.dde_severity_diagnosis).toLowerCase();
      if (dde.includes("mild")) bump(op.dde_mild, r.gender);
      else if (dde.includes("mod")) bump(op.dde_moderate, r.gender);
      else if (dde.includes("sev")) bump(op.dde_severe, r.gender);
    }
    bump(target === ac ? ac.medical_mental_health : op.medical_assessment, r.gender);
  });

  // Map attendance
  attendanceRows.forEach((r) => {
    const st = (r.session_type || "").toUpperCase();
    const count = Number(r.session_count) || 0;
    if (r.modality === "aftercare") {
      if (st.includes("SIBOL") || st.includes("GROUP")) bump(ac.sibol_f2f, r.gender, count);
      else if (st.includes("INDIVIDUAL")) bump(ac.individual_counseling, r.gender, count);
      else if (st.includes("FAMILY")) bump(ac.family_dialogue, r.gender, count);
      else if (st.includes("HOME")) bump(ac.home_visit, r.gender, count);
      else bump(ac.miop, r.gender, count);
    } else {
      if (st.includes("CBT")) bump(op.cbte_sessions, r.gender, count);
      else if (st.includes("INDIVIDUAL")) bump(op.individual_counseling, r.gender, count);
      else if (st.includes("SHGM") || st.includes("SELF_HELP") || st.includes("GROUP")) bump(op.shgm, r.gender, count);
      else if (st.includes("PSYCHO") || st.includes("FAMILY")) bump(op.psycho_education, r.gender, count);
      else if (st.includes("LIFE") || st.includes("SKILLS")) bump(op.life_skills, r.gender, count);
      else if (st.includes("ASI")) bump(op.asi_interview, r.gender, count);
      else if (st.includes("HOME")) bump(op.home_visit, r.gender, count);
      else bump(op.program_orientation, r.gender, count);
    }
  });

  // Map drug tests
  drugTestRows.forEach((r) => {
    const count = Number(r.dt_count) || 0;
    if (r.modality === "aftercare") {
      bump(ac.surveillance_drug_test, r.gender, count);
    } else {
      bump(op.drug_tests, r.gender, count);
    }
  });

  // Compute Grand Totals
  ["m", "f", "total"].forEach((k) => {
    op.grand_total[k] =
      op.assist_low[k] +
      op.assist_moderate[k] +
      op.assist_high[k] +
      op.brief_intervention[k] +
      op.social_worker_eval[k] +
      op.dde_mild[k] +
      op.dde_moderate[k] +
      op.dde_severe[k] +
      op.medical_assessment[k] +
      op.mental_assessment[k] +
      op.cbte_sessions[k] +
      op.individual_counseling[k] +
      op.shgm[k] +
      op.psycho_education[k] +
      op.life_skills[k] +
      op.asi_interview[k] +
      op.home_visit[k] +
      op.program_orientation[k] +
      op.drug_tests[k] +
      op.psychiatric_eval[k] +
      op.hiv_screening[k];

    ac.grand_total[k] =
      ac.medical_mental_health[k] +
      ac.miop[k] +
      ac.family_dialogue[k] +
      ac.individual_counseling[k] +
      ac.pre_discharge_conf[k] +
      ac.home_visit[k] +
      ac.surveillance_drug_test[k] +
      ac.case_conference[k] +
      ac.sibol_virtual[k] +
      ac.sibol_f2f[k] +
      ac.skills_vocational[k] +
      ac.spiritual_pastoral[k] +
      ac.recovery_coaching[k] +
      ac.family_support[k] +
      ac.livelihood_referral[k] +
      ac.community_outreach[k];
  });

  return { outpatient: op, aftercare: ac, month: Number(month), year: Number(year) };
}

// 3. Form 4.3 Part I — Demographic and Clinical Profile (Age & Civil Status)
export async function getDemographics(month, year) {
  const { end } = getMonthRange(month, year);

  const [rows] = await pool.query(
    `SELECT p.id, p.gender, p.civil_status, p.birthdate,
            CASE WHEN p.current_status = 'aftercare' OR p.program_phase = 'Aftercare' THEN 'aftercare' ELSE 'outpatient' END as modality,
            TIMESTAMPDIFF(YEAR, p.birthdate, ?) as age
     FROM patients p
     WHERE p.is_archived = FALSE AND (p.admission_date <= ? OR p.admission_date IS NULL)`,
    [end, end]
  );

  const AGE_BRACKETS = ["<18", "18-19", "20-30", "31-40", "41-50", "51-60", "61+"];
  const CIVIL_STATUSES = ["Single", "Married", "Widowed", "Separated/Annulled", "Common-law/Live-in", "Unknown"];

  function initSection() {
    const tableRows = AGE_BRACKETS.map((bracket) => {
      const row = { age_bracket: bracket };
      CIVIL_STATUSES.forEach((cs) => {
        row[`${cs}_m`] = 0;
        row[`${cs}_f`] = 0;
      });
      row.total_m = 0;
      row.total_f = 0;
      row.grand_total = 0;
      return row;
    });

    const totals = { age_bracket: "TOTAL" };
    CIVIL_STATUSES.forEach((cs) => {
      totals[`${cs}_m`] = 0;
      totals[`${cs}_f`] = 0;
    });
    totals.total_m = 0;
    totals.total_f = 0;
    totals.grand_total = 0;

    return { rows: tableRows, totals };
  }

  const result = {
    outpatient: initSection(),
    aftercare: initSection()
  };

  rows.forEach((p) => {
    const sec = p.modality === "aftercare" ? result.aftercare : result.outpatient;
    const age = p.age !== null && p.age !== undefined ? Number(p.age) : 25; // fallback average if missing

    let bracketIndex = 2; // default 20-30
    if (age < 18) bracketIndex = 0;
    else if (age <= 19) bracketIndex = 1;
    else if (age <= 30) bracketIndex = 2;
    else if (age <= 40) bracketIndex = 3;
    else if (age <= 50) bracketIndex = 4;
    else if (age <= 60) bracketIndex = 5;
    else bracketIndex = 6;

    const row = sec.rows[bracketIndex];
    const isF = isFemale(p.gender);
    const suffix = isF ? "_f" : "_m";

    let cs = "Single";
    const rawCs = (p.civil_status || "").toLowerCase();
    if (rawCs.includes("marr")) cs = "Married";
    else if (rawCs.includes("wid")) cs = "Widowed";
    else if (rawCs.includes("sep") || rawCs.includes("annul")) cs = "Separated/Annulled";
    else if (rawCs.includes("live") || rawCs.includes("common")) cs = "Common-law/Live-in";
    else if (rawCs.includes("unk")) cs = "Unknown";
    else if (rawCs.includes("sing")) cs = "Single";

    row[`${cs}${suffix}`]++;
    if (isF) row.total_f++;
    else row.total_m++;
    row.grand_total++;

    sec.totals[`${cs}${suffix}`]++;
    if (isF) sec.totals.total_f++;
    else sec.totals.total_m++;
    sec.totals.grand_total++;
  });

  return result;
}

// 4. Form 4.3 Part II — PWUDs Employment Status
export async function getEmployment(month, year) {
  const { end } = getMonthRange(month, year);

  const [rows] = await pool.query(
    `SELECT p.employment_status, p.gender,
            CASE WHEN p.current_status = 'aftercare' OR p.program_phase = 'Aftercare' THEN 'aftercare' ELSE 'outpatient' END as modality,
            COUNT(*) as count
     FROM patients p
     WHERE p.is_archived = FALSE AND (p.admission_date <= ? OR p.admission_date IS NULL)
     GROUP BY p.employment_status, p.gender, modality`,
    [end]
  );

  const CATEGORIES = ["Employed", "Unemployed", "Self-Employed", "Student", "Others"];
  const data = CATEGORIES.map((cat) => ({
    category: cat,
    outpatient_m: 0,
    outpatient_f: 0,
    outpatient_total: 0,
    aftercare_m: 0,
    aftercare_f: 0,
    aftercare_total: 0,
    grand_total: 0
  }));

  const totals = {
    category: "TOTAL",
    outpatient_m: 0,
    outpatient_f: 0,
    outpatient_total: 0,
    aftercare_m: 0,
    aftercare_f: 0,
    aftercare_total: 0,
    grand_total: 0
  };

  rows.forEach((r) => {
    const raw = (r.employment_status || "").toLowerCase();
    let index = 1; // default Unemployed
    if (raw.includes("self")) index = 2;
    else if (raw.includes("employ")) index = 0;
    else if (raw.includes("stud")) index = 3;
    else if (raw.includes("other")) index = 4;

    const row = data[index];
    const cnt = Number(r.count) || 0;
    const isF = isFemale(r.gender);
    const mod = r.modality === "aftercare" ? "aftercare" : "outpatient";
    const key = `${mod}_${isF ? "f" : "m"}`;
    const totKey = `${mod}_total`;

    row[key] += cnt;
    row[totKey] += cnt;
    row.grand_total += cnt;

    totals[key] += cnt;
    totals[totKey] += cnt;
    totals.grand_total += cnt;
  });

  return { rows: data, totals };
}

// 5. Form 4.3 Part III — Residence and Educational Status
export async function getEducationResidence(month, year) {
  const { end } = getMonthRange(month, year);

  const [rows] = await pool.query(
    `SELECT p.educational_attainment, p.municipality,
            CASE WHEN p.current_status = 'aftercare' OR p.program_phase = 'Aftercare' THEN 'aftercare' ELSE 'outpatient' END as modality,
            COUNT(*) as count
     FROM patients p
     WHERE p.is_archived = FALSE AND (p.admission_date <= ? OR p.admission_date IS NULL)
     GROUP BY p.educational_attainment, p.municipality, modality`,
    [end]
  );

  const initTable = () => ({
    rural: { elem_under: 0, elem_grad: 0, hs_under: 0, hs_grad: 0, col_under: 0, col_grad: 0, voc: 0, post_grad: 0, total: 0 },
    urban: { elem_under: 0, elem_grad: 0, hs_under: 0, hs_grad: 0, col_under: 0, col_grad: 0, voc: 0, post_grad: 0, total: 0 },
    total: { elem_under: 0, elem_grad: 0, hs_under: 0, hs_grad: 0, col_under: 0, col_grad: 0, voc: 0, post_grad: 0, total: 0 }
  });

  const result = {
    outpatient: initTable(),
    aftercare: initTable()
  };

  rows.forEach((r) => {
    const table = r.modality === "aftercare" ? result.aftercare : result.outpatient;
    const mun = (r.municipality || "").toLowerCase();
    // Bicol PSA classification: Legazpi, Daraga, Tabaco are classified Urban; Malinao, Tiwi, Bacacay, etc. Rural
    const isUrban = mun.includes("legazpi") || mun.includes("daraga") || mun.includes("tabaco") || mun.includes("urban");
    const row = isUrban ? table.urban : table.rural;
    const cnt = Number(r.count) || 0;

    const edu = (r.educational_attainment || "").toLowerCase();
    let col = "hs_grad";
    if (edu.includes("elem")) {
      col = edu.includes("under") ? "elem_under" : "elem_grad";
    } else if (edu.includes("high") || edu.includes("hs") || edu.includes("secondary")) {
      col = edu.includes("under") ? "hs_under" : "hs_grad";
    } else if (edu.includes("college") || edu.includes("tertiary") || edu.includes("degree")) {
      col = edu.includes("under") ? "col_under" : "col_grad";
    } else if (edu.includes("voc")) {
      col = "voc";
    } else if (edu.includes("post") || edu.includes("master") || edu.includes("doctor")) {
      col = "post_grad";
    }

    row[col] += cnt;
    row.total += cnt;
    table.total[col] += cnt;
    table.total.total += cnt;
  });

  return result;
}

// 6. Form 4.3 Part IV — Substance of Abuse and Duration of Use
export async function getSubstanceProfile(month, year) {
  const { end } = getMonthRange(month, year);

  const [rows] = await pool.query(
    `SELECT ps.drug_used, ps.is_primary_substance, pi.length_of_use,
            CASE WHEN p.current_status = 'aftercare' OR p.program_phase = 'Aftercare' THEN 'aftercare' ELSE 'outpatient' END as modality,
            COUNT(*) as count
     FROM patient_substances ps
     JOIN patients p ON p.id = ps.patient_id
     LEFT JOIN patient_intakes pi ON pi.patient_id = p.id
     WHERE p.is_archived = FALSE AND (p.admission_date <= ? OR p.admission_date IS NULL)
     GROUP BY ps.drug_used, ps.is_primary_substance, pi.length_of_use, modality`,
    [end]
  );

  const DURATIONS = [
    "< 1 year",
    "1 - 2.9 years",
    "3 - 4.9 years",
    "5 - 6.9 years",
    "7 - 8.9 years",
    "9 - 10.9 years",
    "11 years and above",
    "Unknown"
  ];

  const DRUG_KEYS = [
    "methamphetamine",
    "cannabis",
    "ecstasy",
    "cocaine",
    "opiates",
    "other_amphetamines",
    "poly_users",
    "others_alcohol"
  ];

  function initSection() {
    const tableRows = DURATIONS.map((dur) => {
      const row = { duration: dur };
      DRUG_KEYS.forEach((k) => { row[k] = 0; });
      row.total = 0;
      return row;
    });

    const totals = { duration: "TOTAL" };
    DRUG_KEYS.forEach((k) => { totals[k] = 0; });
    totals.total = 0;

    return { rows: tableRows, totals };
  }

  const result = {
    outpatient: initSection(),
    aftercare: initSection()
  };

  rows.forEach((r) => {
    const sec = r.modality === "aftercare" ? result.aftercare : result.outpatient;
    const durRaw = (r.length_of_use || "").toLowerCase();

    let durIndex = 7; // Unknown
    if (durRaw.includes("<") || durRaw.includes("less") || durRaw.includes("month")) durIndex = 0;
    else if (durRaw.includes("1") && (durRaw.includes("2") || durRaw.includes("year"))) durIndex = 1;
    else if (durRaw.includes("3") || durRaw.includes("4")) durIndex = 2;
    else if (durRaw.includes("5") || durRaw.includes("6")) durIndex = 3;
    else if (durRaw.includes("7") || durRaw.includes("8")) durIndex = 4;
    else if (durRaw.includes("9") || durRaw.includes("10")) durIndex = 5;
    else if (durRaw.includes("11") || durRaw.includes("above") || durRaw.includes(">")) durIndex = 6;

    const drugRaw = (r.drug_used || "").toLowerCase();
    let col = "others_alcohol";
    if (drugRaw.includes("meth") || drugRaw.includes("shabu")) col = "methamphetamine";
    else if (drugRaw.includes("cannabis") || drugRaw.includes("marijuana") || drugRaw.includes("thc")) col = "cannabis";
    else if (drugRaw.includes("ecstasy") || drugRaw.includes("mdma")) col = "ecstasy";
    else if (drugRaw.includes("cocaine")) col = "cocaine";
    else if (drugRaw.includes("opiate") || drugRaw.includes("opioid")) col = "opiates";
    else if (drugRaw.includes("amphet")) col = "other_amphetamines";

    const cnt = Number(r.count) || 0;
    const row = sec.rows[durIndex];
    row[col] += cnt;
    row.total += cnt;
    sec.totals[col] += cnt;
    sec.totals.total += cnt;
  });

  return result;
}

// 7. Form 4.3 Part V — Readmission or Recommitment Count
export async function getReadmissions(month, year) {
  const { end } = getMonthRange(month, year);

  const [rows] = await pool.query(
    `SELECT p.prior_rehab_admissions, p.gender,
            CASE WHEN p.current_status = 'aftercare' OR p.program_phase = 'Aftercare' THEN 'aftercare' ELSE 'outpatient' END as modality,
            COUNT(*) as count
     FROM patients p
     WHERE p.is_archived = FALSE AND p.prior_rehab_admissions > 0 AND (p.admission_date <= ? OR p.admission_date IS NULL)
     GROUP BY p.prior_rehab_admissions, p.gender, modality`,
    [end]
  );

  const data = [
    { times: "1x", outpatient_m: 0, outpatient_f: 0, outpatient_total: 0, aftercare_m: 0, aftercare_f: 0, aftercare_total: 0, combined_total: 0 },
    { times: "2x", outpatient_m: 0, outpatient_f: 0, outpatient_total: 0, aftercare_m: 0, aftercare_f: 0, aftercare_total: 0, combined_total: 0 },
    { times: "3x and above", outpatient_m: 0, outpatient_f: 0, outpatient_total: 0, aftercare_m: 0, aftercare_f: 0, aftercare_total: 0, combined_total: 0 }
  ];

  const totals = {
    times: "TOTAL",
    outpatient_m: 0,
    outpatient_f: 0,
    outpatient_total: 0,
    aftercare_m: 0,
    aftercare_f: 0,
    aftercare_total: 0,
    combined_total: 0
  };

  rows.forEach((r) => {
    const prior = Number(r.prior_rehab_admissions) || 1;
    let index = 0;
    if (prior === 2) index = 1;
    else if (prior >= 3) index = 2;

    const row = data[index];
    const isF = isFemale(r.gender);
    const mod = r.modality === "aftercare" ? "aftercare" : "outpatient";
    const cnt = Number(r.count) || 0;
    const key = `${mod}_${isF ? "f" : "m"}`;
    const totKey = `${mod}_total`;

    row[key] += cnt;
    row[totKey] += cnt;
    row.combined_total += cnt;

    totals[key] += cnt;
    totals[totKey] += cnt;
    totals.combined_total += cnt;
  });

  return { rows: data, totals };
}

// 8. Form 4.3 Part VI — Complications & Co-morbidities (Medical & Psychiatric)
export async function getComorbidities(month, year) {
  const { end } = getMonthRange(month, year);

  const [rows] = await pool.query(
    `SELECT pi.comorbidities, p.gender,
            CASE WHEN p.current_status = 'aftercare' OR p.program_phase = 'Aftercare' THEN 'aftercare' ELSE 'outpatient' END as modality
     FROM patient_intakes pi
     JOIN patients p ON p.id = pi.patient_id
     WHERE p.is_archived = FALSE AND (p.admission_date <= ? OR p.admission_date IS NULL)`,
    [end]
  );

  const MEDICAL_LIST = [
    "Hypertension",
    "Diabetes Mellitus",
    "Pulmonary Tuberculosis (PTB)",
    "Acute Respiratory Infection",
    "Bronchial Asthma",
    "COPD",
    "Pneumonia",
    "Hepatitis B",
    "Hepatitis C",
    "HIV/AIDS",
    "Hyperthyroidism",
    "Skin Diseases",
    "EENT Disorders",
    "Cardio-Vascular Diseases",
    "Musculoskeletal Conditions",
    "Genitourinary Diseases",
    "Surgical Conditions",
    "Gastrointestinal Conditions",
    "Parasitic Infections",
    "Physical Disability",
    "Dental Conditions",
    "Others"
  ];

  const PSYCH_LIST = [
    "Thought Disorders (Schizophrenia)",
    "Mood Disorders (Depression, Bipolar)",
    "Somatoform / Anxiety / Personality / OCD",
    "Neurologic Disorders (Epilepsy, etc.)",
    "Substance-Induced Disorders",
    "Others"
  ];

  function initGroup(list) {
    return list.map((c) => ({
      condition: c,
      facility_m: 0,
      facility_f: 0,
      specialty_m: 0,
      specialty_f: 0,
      attending_m: 0,
      attending_f: 0,
      total_m: 0,
      total_f: 0,
      grand_total: 0
    }));
  }

  const result = {
    outpatient: { medical: initGroup(MEDICAL_LIST), psychiatric: initGroup(PSYCH_LIST) },
    aftercare: { medical: initGroup(MEDICAL_LIST), psychiatric: initGroup(PSYCH_LIST) }
  };

  rows.forEach((r) => {
    if (!r.comorbidities) return;
    const sec = r.modality === "aftercare" ? result.aftercare : result.outpatient;
    const isF = isFemale(r.gender);

    try {
      const parsed = typeof r.comorbidities === "string" ? JSON.parse(r.comorbidities) : r.comorbidities;
      const conditions = Array.isArray(parsed) ? parsed : Object.keys(parsed || {});

      conditions.forEach((c) => {
        const cLower = String(c).toLowerCase();
        let matched = false;

        // Check medical list
        sec.medical.forEach((item) => {
          if (cLower.includes(item.condition.toLowerCase().slice(0, 5))) {
            matched = true;
            if (isF) { item.facility_f++; item.total_f++; }
            else { item.facility_m++; item.total_m++; }
            item.grand_total++;
          }
        });

        // Check psych list if not matched
        if (!matched) {
          sec.psychiatric.forEach((item) => {
            if (cLower.includes("depress") || cLower.includes("mood") || cLower.includes("anxiet") || cLower.includes("psych")) {
              if (isF) { item.facility_f++; item.total_f++; }
              else { item.facility_m++; item.total_m++; }
              item.grand_total++;
            }
          });
        }
      });
    } catch {}
  });

  return result;
}

// 9. Form 10.1 — Program Completion Rate (Quarterly Evaluation - 7-Month Adjusted)
export async function getCompletionRates(quarter, year) {
  const y = Number(year) || new Date().getFullYear();
  const qSelected = Number(quarter) || 1;

  // Build quarters Q1 to Q4
  const quartersData = [];

  for (let q = 1; q <= 4; q++) {
    const evalEndMonth = q * 3;
    const evalStartMonth = evalEndMonth - 2;

    const evalEndDate = new Date(y, evalEndMonth, 0);
    const evalStartDate = new Date(y, evalStartMonth - 1, 1);

    // Target Cohort was admitted 7 months before the evaluation quarter
    const cohortStartDate = new Date(y, evalStartMonth - 1 - 7, 1);
    const cohortEndDate = new Date(y, evalEndMonth - 7, 0);

    const startFmt = formatDateYMD(evalStartDate);
    const endFmt = formatDateYMD(evalEndDate);
    const cohortStartFmt = formatDateYMD(cohortStartDate);
    const cohortEndFmt = formatDateYMD(cohortEndDate);

    // Outpatient Target Cohort
    const [targetOp] = await pool.query(
      `SELECT gender, COUNT(*) as count 
       FROM patients 
       WHERE is_archived = FALSE AND (current_status != 'aftercare' OR current_status IS NULL)
         AND admission_date BETWEEN ? AND ?
       GROUP BY gender`,
      [cohortStartFmt, cohortEndFmt]
    );

    // Outpatient Actual Completers
    const [completersOp] = await pool.query(
      `SELECT p.gender, COUNT(*) as count 
       FROM patient_discharges pd
       JOIN patients p ON p.id = pd.patient_id
       WHERE pd.status LIKE '%Completer%' AND pd.discharge_date BETWEEN ? AND ?
       GROUP BY p.gender`,
      [startFmt, endFmt]
    );

    // Outpatient Non-completers (dropped out or transferred)
    const [[{ non_completers_op }]] = await pool.query(
      `SELECT COUNT(*) as non_completers_op
       FROM patient_discharges pd
       WHERE pd.status LIKE '%Non-Completer%' AND pd.discharge_date BETWEEN ? AND ?`,
      [startFmt, endFmt]
    );

    let targetOpM = 0, targetOpF = 0;
    targetOp.forEach(r => { if (isFemale(r.gender)) targetOpF += r.count; else targetOpM += r.count; });
    const targetOpTotal = targetOpM + targetOpF;

    let compOpM = 0, compOpF = 0;
    completersOp.forEach(r => { if (isFemale(r.gender)) compOpF += r.count; else compOpM += r.count; });
    const compOpTotal = compOpM + compOpF;

    const rateOp = targetOpTotal > 0 ? (compOpTotal / targetOpTotal) * 100 : (compOpTotal > 0 ? 100 : 0);

    quartersData.push({
      quarter: `Q${q}`,
      label: `${q === 1 ? "1st" : q === 2 ? "2nd" : q === 3 ? "3rd" : "4th"} Quarter`,
      cohort_range: `${cohortStartFmt} to ${cohortEndFmt}`,
      eval_range: `${startFmt} to ${endFmt}`,
      target_m: targetOpM,
      target_f: targetOpF,
      target_total: targetOpTotal,
      actual_m: compOpM,
      actual_f: compOpF,
      actual_total: compOpTotal,
      non_completers: Number(non_completers_op) || 0,
      completion_rate: Number(rateOp.toFixed(2)),
      remarks: rateOp >= 100 ? "Met Target" : rateOp > 0 ? "Ongoing" : "No cohort scheduled"
    });
  }

  const totals = {
    quarter: "TOTAL",
    label: "Annual Total",
    target_m: quartersData.reduce((s, q) => s + q.target_m, 0),
    target_f: quartersData.reduce((s, q) => s + q.target_f, 0),
    target_total: quartersData.reduce((s, q) => s + q.target_total, 0),
    actual_m: quartersData.reduce((s, q) => s + q.actual_m, 0),
    actual_f: quartersData.reduce((s, q) => s + q.actual_f, 0),
    actual_total: quartersData.reduce((s, q) => s + q.actual_total, 0),
    non_completers: quartersData.reduce((s, q) => s + q.non_completers, 0),
    completion_rate: 0,
    remarks: ""
  };
  totals.completion_rate = totals.target_total > 0 ? Number(((totals.actual_total / totals.target_total) * 100).toFixed(2)) : 0;
  totals.remarks = totals.completion_rate >= 100 ? "Met Statutory Standard" : "Performance Logged";

  // Selected quarter highlight
  const selectedQuarterData = quartersData[qSelected - 1] || quartersData[0];

  return {
    year: y,
    selectedQuarter: qSelected,
    selectedCohort: selectedQuarterData,
    quarters: quartersData,
    annualTotal: totals
  };
}

// 10. Form 10.2 — Discharges from the Program (Outpatient & ACP)
export async function getDischargeSummary(month, year) {
  const { start, end } = getMonthRange(month, year);

  // Roster of discharged patients (Page 19 & 20)
  const [roster] = await pool.query(
    `SELECT pd.id, pd.discharge_date, pd.status, pd.reason, pd.treatment_duration_months, pd.intervention_upon_discharge,
            p.patient_code, p.gender, p.admission_date,
            CASE WHEN p.current_status = 'aftercare' OR p.program_phase = 'Aftercare' THEN 'aftercare' ELSE 'outpatient' END as modality
     FROM patient_discharges pd
     JOIN patients p ON p.id = pd.patient_id
     WHERE pd.discharge_date BETWEEN ? AND ?
     ORDER BY pd.discharge_date ASC`,
    [start, end]
  );

  // Consolidated Reason Breakdown (Page 21)
  const REASONS = [
    "Non-compliance with rules and regulations",
    "Early release",
    "Turned over to law enforcers per court order",
    "Transferred to other facility",
    "Death",
    "Graduate from Program (Completer - 43 sessions)"
  ];

  const consolidated = REASONS.map((r) => ({
    reason: r,
    outpatient_m: 0,
    outpatient_f: 0,
    outpatient_total: 0,
    aftercare_m: 0,
    aftercare_f: 0,
    aftercare_total: 0,
    grand_total: 0
  }));

  const totals = {
    reason: "TOTAL",
    outpatient_m: 0,
    outpatient_f: 0,
    outpatient_total: 0,
    aftercare_m: 0,
    aftercare_f: 0,
    aftercare_total: 0,
    grand_total: 0
  };

  roster.forEach((r) => {
    const isF = isFemale(r.gender);
    const mod = r.modality === "aftercare" ? "aftercare" : "outpatient";
    const reasonText = (r.reason || r.status || "").toLowerCase();

    let index = 0;
    if (reasonText.includes("graduat") || reasonText.includes("complet")) index = 5;
    else if (reasonText.includes("early")) index = 1;
    else if (reasonText.includes("court") || reasonText.includes("law") || reasonText.includes("enforce")) index = 2;
    else if (reasonText.includes("transfer")) index = 3;
    else if (reasonText.includes("dead") || reasonText.includes("death") || reasonText.includes("deceas")) index = 4;
    else index = 0; // non-compliance

    const row = consolidated[index];
    const key = `${mod}_${isF ? "f" : "m"}`;
    const totKey = `${mod}_total`;

    row[key]++;
    row[totKey]++;
    row.grand_total++;

    totals[key]++;
    totals[totKey]++;
    totals.grand_total++;
  });

  return { roster, consolidated, totals, month: Number(month), year: Number(year) };
}

// 11. Form 11 — Consolidated Report on Illegal Substance Use (Surveillance Matrix)
export async function getDrugTestSurveillance(month, year) {
  const { start, end } = getMonthRange(month, year);

  // Query tests conducted in the selected rating period
  const [rows] = await pool.query(
    `SELECT d.id, d.test_date, d.substance_tested, d.result, d.remarks,
            p.patient_code, p.gender, p.admission_date,
            DATEDIFF(d.test_date, p.admission_date) as days_elapsed
     FROM drug_test_logs d
     JOIN patients p ON p.id = d.patient_id
     WHERE d.test_date BETWEEN ? AND ?
     ORDER BY d.test_date ASC`,
    [start, end]
  );

  const initWindow = (label, daysRange) => ({
    label,
    daysRange,
    tested: 0,
    meth: 0,
    thc: 0,
    ecstasy: 0,
    cocaine: 0,
    opiates: 0,
    amphetamines: 0,
    positive: 0,
    negative: 0,
    positive_rate: 0
  });

  const windows = [
    initWindow("Window 1: Within 60 Days (Month 1 & 2)", "1-60"),
    initWindow("Window 2: Within 61–120 Days (Month 3 & 4)", "61-120"),
    initWindow("Window 3: Within 121–180 Days (Month 5 & 6)", "121-180"),
    initWindow("Window 4: Beyond 180 Days (Month 7 & 8)", ">180")
  ];

  const totals = {
    label: "TOTAL",
    tested: 0,
    meth: 0,
    thc: 0,
    ecstasy: 0,
    cocaine: 0,
    opiates: 0,
    amphetamines: 0,
    positive: 0,
    negative: 0,
    positive_rate: 0
  };

  const roster = [];

  rows.forEach((r) => {
    const days = Number(r.days_elapsed) || 0;
    if (days < 1) return; // omit pre-admission baseline tests

    let wIdx = 3;
    if (days <= 60) wIdx = 0;
    else if (days <= 120) wIdx = 1;
    else if (days <= 180) wIdx = 2;

    const w = windows[wIdx];
    w.tested++;
    totals.tested++;

    const isPos = String(r.result).toUpperCase() === "POSITIVE";
    const sub = (r.substance_tested || "").toLowerCase();

    if (isPos) {
      w.positive++;
      totals.positive++;

      if (sub.includes("meth") || sub.includes("shabu")) { w.meth++; totals.meth++; }
      if (sub.includes("marijuana") || sub.includes("thc") || sub.includes("cannabis")) { w.thc++; totals.thc++; }
      if (sub.includes("ecstasy") || sub.includes("mdma") || sub.includes("ecs")) { w.ecstasy++; totals.ecstasy++; }
      if (sub.includes("cocaine")) { w.cocaine++; totals.cocaine++; }
      if (sub.includes("opiate")) { w.opiates++; totals.opiates++; }
      if (sub.includes("amphet") && !sub.includes("meth")) { w.amphetamines++; totals.amphetamines++; }
    } else {
      w.negative++;
      totals.negative++;
    }

    roster.push({
      patient_code: r.patient_code,
      gender: r.gender,
      test_date: formatDateYMD(new Date(r.test_date)),
      days_elapsed: days,
      window: `Window ${wIdx + 1}`,
      substance_tested: r.substance_tested || "Meth / THC",
      result: isPos ? "POSITIVE" : "NEGATIVE",
      remarks: r.remarks || "Surveillance Drug Test"
    });
  });

  windows.forEach((w) => {
    w.positive_rate = w.tested > 0 ? Number(((w.positive / w.tested) * 100).toFixed(2)) : 0;
  });
  totals.positive_rate = totals.tested > 0 ? Number(((totals.positive / totals.tested) * 100).toFixed(2)) : 0;

  return { windows, totals, roster, month: Number(month), year: Number(year) };
}

// 12. Program Census Summary
export async function getProgramCensus(month, year) {
  const [rows] = await pool.query(
    `SELECT u.full_name as case_manager, p.referral_source, p.gender,
            COUNT(*) as active_caseload
     FROM patients p
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     WHERE p.enrollment_status = 'active' AND p.is_archived = FALSE
     GROUP BY u.full_name, p.referral_source, p.gender`
  );
  return rows;
}

// 13. Non-Completer Roster
export async function getNonCompleters(month, year) {
  const { start, end } = getMonthRange(month, year);
  const [rows] = await pool.query(
    `SELECT p.full_name, p.gender, p.patient_code, pd.discharge_date, pd.reason, pd.intervention_upon_discharge
     FROM patient_discharges pd
     JOIN patients p ON p.id = pd.patient_id
     WHERE pd.status LIKE '%Non-Completer%' AND pd.discharge_date BETWEEN ? AND ?`,
    [start, end]
  );
  return rows;
}

// 14. Positive DT Roster
export async function getPositiveDTRoster(month, year) {
  const { start, end } = getMonthRange(month, year);
  const [rows] = await pool.query(
    `SELECT p.full_name, p.patient_code, u.full_name as case_manager, d.substance_tested,
            DATEDIFF(d.test_date, p.admission_date) as days_in_program,
            d.test_date, d.remarks
     FROM drug_test_logs d
     JOIN patients p ON p.id = d.patient_id
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     WHERE d.result = 'POSITIVE' AND d.test_date BETWEEN ? AND ?`,
    [start, end]
  );
  return rows;
}
