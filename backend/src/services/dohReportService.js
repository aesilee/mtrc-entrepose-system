import pool from "../config/db.js";

// Utility to create start/end date for a month
function getMonthRange(month, year) {
  const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const end = new Date(year, month, 0).toISOString().slice(0, 10);
  return { start, end };
}

// 1. Form 4.1 A & B - Cases Managed
export async function getCensusMetrics(month, year) {
  const { start, end } = getMonthRange(month, year);
  const [rows] = await pool.query(
    `SELECT 
        gender,
        CASE WHEN case_type = 'general_outpatient' THEN 'court_mandated' ELSE 'voluntary' END as court_status,
        CASE WHEN current_status = 'aftercare' THEN 'aftercare' ELSE 'outpatient' END as modality,
        SUM(CASE WHEN admission_date BETWEEN ? AND ? THEN 1 ELSE 0 END) as new_admissions,
        SUM(CASE WHEN prior_rehab_admissions > 0 AND admission_date BETWEEN ? AND ? THEN 1 ELSE 0 END) as readmissions,
        SUM(CASE WHEN enrollment_status = 'active' THEN 1 ELSE 0 END) as active_cases
     FROM patients
     WHERE is_archived = FALSE
     GROUP BY gender, court_status, modality`,
    [start, end, start, end]
  );
  return rows;
}

// 2. Form 4.2 B & C - Service Provision Tally
export async function getServiceTallies(month, year) {
  const { start, end } = getMonthRange(month, year);
  const [attendance] = await pool.query(
    `SELECT session_type, COUNT(*) as count 
     FROM attendance 
     WHERE session_date BETWEEN ? AND ? AND status = 'present'
     GROUP BY session_type`,
    [start, end]
  );
  
  const [drugTests] = await pool.query(
    `SELECT COUNT(*) as drug_test_count FROM drug_test_logs WHERE test_date BETWEEN ? AND ?`,
    [start, end]
  );
  
  return { attendance, drugTests: drugTests[0].drug_test_count };
}

// 3. Form 4.3 Part I - Demographics
export async function getDemographics(month, year) {
  const [rows] = await pool.query(
    `SELECT gender, civil_status,
            CASE 
              WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) < 18 THEN '<18'
              WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 18 AND 25 THEN '18-25'
              WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 26 AND 35 THEN '26-35'
              WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 36 AND 45 THEN '36-45'
              ELSE '>45'
            END as age_bracket,
            COUNT(*) as count
     FROM patients
     WHERE enrollment_status = 'active' AND is_archived = FALSE
     GROUP BY gender, civil_status, age_bracket`
  );
  return rows;
}

// 4. Form 4.3 Part II - Employment
export async function getEmployment(month, year) {
  const [rows] = await pool.query(
    `SELECT employment_status, COUNT(*) as count
     FROM patients
     WHERE enrollment_status = 'active' AND is_archived = FALSE
     GROUP BY employment_status`
  );
  return rows;
}

// 5. Form 4.3 Part III - Education & Residence
export async function getEducationResidence(month, year) {
  const [rows] = await pool.query(
    `SELECT educational_attainment, municipality, COUNT(*) as count
     FROM patients
     WHERE enrollment_status = 'active' AND is_archived = FALSE
     GROUP BY educational_attainment, municipality`
  );
  return rows;
}

// 6. Form 4.3 Part IV - Substance Profile
export async function getSubstanceProfile(month, year) {
  const [rows] = await pool.query(
    `SELECT ps.drug_used, pi.length_of_use, COUNT(*) as count
     FROM patient_substances ps
     JOIN patients p ON p.id = ps.patient_id
     JOIN patient_intakes pi ON pi.patient_id = p.id
     WHERE p.enrollment_status = 'active' AND ps.is_primary_substance = TRUE AND p.is_archived = FALSE
     GROUP BY ps.drug_used, pi.length_of_use`
  );
  return rows;
}

// 7. Form 4.3 Part V - Readmissions
export async function getReadmissions(month, year) {
  const [rows] = await pool.query(
    `SELECT prior_rehab_admissions as prior_admissions, COUNT(*) as count
     FROM patients
     WHERE enrollment_status = 'active' AND is_archived = FALSE
     GROUP BY prior_rehab_admissions`
  );
  return rows;
}

// 8. Form 4.3 Part VI - Clinical Comorbidities
export async function getComorbidities(month, year) {
  const [rows] = await pool.query(
    `SELECT pi.comorbidities
     FROM patient_intakes pi
     JOIN patients p ON p.id = pi.patient_id
     WHERE p.enrollment_status = 'active' AND p.is_archived = FALSE AND pi.comorbidities IS NOT NULL`
  );
  
  const matrix = {};
  rows.forEach(r => {
    try {
      const list = JSON.parse(r.comorbidities);
      list.forEach(c => { matrix[c] = (matrix[c] || 0) + 1; });
    } catch {}
  });
  return matrix;
}

// 9. Form 10.1 - Quarterly Completion Rates (7-Month Adjusted)
export async function getCompletionRates(quarter, year) {
  // Quarter 1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec
  // A completion evaluation in Q(X) evaluates the cohort enrolled 7 months prior.
  // Example: For Q3 (Jul-Sep) 2024, 7 months prior is Dec 2023 - Feb 2024.
  const evalEndMonth = quarter * 3;
  const evalStartMonth = evalEndMonth - 2;
  
  const evalEndDate = new Date(year, evalEndMonth, 0);
  const evalStartDate = new Date(year, evalStartMonth - 1, 1);
  
  const cohortStartDate = new Date(year, evalStartMonth - 1 - 7, 1);
  const cohortEndDate = new Date(year, evalEndMonth - 7, 0);
  
  const startFmt = evalStartDate.toISOString().slice(0, 10);
  const endFmt = evalEndDate.toISOString().slice(0, 10);
  const cohortStartFmt = cohortStartDate.toISOString().slice(0, 10);
  const cohortEndFmt = cohortEndDate.toISOString().slice(0, 10);

  const [[{ cohort_size }]] = await pool.query(
    `SELECT COUNT(*) as cohort_size FROM patients WHERE admission_date BETWEEN ? AND ?`,
    [cohortStartFmt, cohortEndFmt]
  );
  
  const [[{ completers }]] = await pool.query(
    `SELECT COUNT(*) as completers FROM patient_discharges WHERE status = 'Completer (Graduated)' AND discharge_date BETWEEN ? AND ?`,
    [startFmt, endFmt]
  );
  
  return { cohort_size, completers, rate: cohort_size ? (completers / cohort_size) * 100 : 0, cohortStartFmt, cohortEndFmt };
}

// 10. Form 10.2 - Discharges Summary
export async function getDischargeSummary(month, year) {
  const { start, end } = getMonthRange(month, year);
  const [rows] = await pool.query(
    `SELECT pd.*, p.full_name, p.patient_code 
     FROM patient_discharges pd
     JOIN patients p ON p.id = pd.patient_id
     WHERE pd.discharge_date BETWEEN ? AND ?`,
    [start, end]
  );
  return rows;
}

// 11. Form 11 - Drug Testing Matrix (7-Month Adjusted)
export async function getDrugTestSurveillance(month, year) {
  const { start, end } = getMonthRange(month, year);
  const [rows] = await pool.query(
    `SELECT 
        d.result,
        DATEDIFF(d.test_date, p.admission_date) as days_elapsed
     FROM drug_test_logs d
     JOIN patients p ON p.id = d.patient_id
     WHERE d.test_date BETWEEN ? AND ?`,
    [start, end]
  );
  
  const matrix = { 
    window1: { positive: 0, negative: 0 }, // 1-60
    window2: { positive: 0, negative: 0 }, // 61-120
    window3: { positive: 0, negative: 0 }, // 121-180
    window4: { positive: 0, negative: 0 }, // >180
  };
  
  rows.forEach(r => {
    const key = r.result === 'POSITIVE' ? 'positive' : 'negative';
    if (r.days_elapsed <= 60) matrix.window1[key]++;
    else if (r.days_elapsed <= 120) matrix.window2[key]++;
    else if (r.days_elapsed <= 180) matrix.window3[key]++;
    else matrix.window4[key]++; // Month 7 falls here
  });
  
  return matrix;
}

// 12. Program Census Summary
export async function getProgramCensus(month, year) {
  const { start, end } = getMonthRange(month, year);
  const [rows] = await pool.query(
    `SELECT u.full_name as case_manager, p.referral_source, COUNT(*) as active_caseload
     FROM patients p
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     WHERE p.enrollment_status = 'active' AND p.is_archived = FALSE
     GROUP BY u.full_name, p.referral_source`
  );
  return rows;
}

// 13. Non-Completer Roster
export async function getNonCompleters(month, year) {
  const { start, end } = getMonthRange(month, year);
  const [rows] = await pool.query(
    `SELECT p.full_name, p.gender, p.pwud_code, pd.discharge_date, pd.reason, pd.intervention_upon_discharge
     FROM patient_discharges pd
     JOIN patients p ON p.id = pd.patient_id
     WHERE pd.status = 'Non-Completer' AND pd.discharge_date BETWEEN ? AND ?`,
    [start, end]
  );
  return rows;
}

// 14. Positive DT Roster
export async function getPositiveDTRoster(month, year) {
  const { start, end } = getMonthRange(month, year);
  const [rows] = await pool.query(
    `SELECT p.full_name, u.full_name as case_manager, d.substance_tested, DATEDIFF(d.test_date, p.admission_date)/30 as months_in_program
     FROM drug_test_logs d
     JOIN patients p ON p.id = d.patient_id
     LEFT JOIN users u ON u.id = p.assigned_case_manager_id
     WHERE d.result = 'POSITIVE' AND d.test_date BETWEEN ? AND ?`,
    [start, end]
  );
  return rows;
}
