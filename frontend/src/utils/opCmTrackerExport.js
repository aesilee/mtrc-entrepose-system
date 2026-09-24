import * as XLSX from "xlsx";

const MONTH_NAMES = [
  "", "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

function milestoneCell(value) {
  if (!value) return 0;
  return value;
}

function dateCell(value) {
  if (!value) return "";
  return value;
}

export function exportOpCmTrackerWorkbook(report) {
  const { period, grid, summaries } = report;
  const monthLabel = MONTH_NAMES[period.month] || String(period.month);
  const wb = XLSX.utils.book_new();

  const caseloadHeaders = [
    "#",
    "PWUD CODE (starting January 2026 enrollees)",
    "NAME OF CLIENT",
    "SEX (M or F)",
    "LGU",
    "CM",
    "Category (LGU-referred,  Court-Mandated, Voluntary)",
    "Date Enrolled (FULL DATE",
    "New Enrollee? (Write 1, if YES, 0, if NO)",
    "Date of  PO (Write 0 if N/A)",
    "Date of Referral to VLTS  (Write 0 if N/A)",
    "Date of Initial Assessment (Write 0 if N/A)",
    "Date of Initial Treatment Planning (Write 0 if N/A)",
    "Date of Initial Progress Reporting (Write 0 if N/A))",
    "No. of Scheduled CBT Sessions",
    "No. of CBT Attended Sessions  (including CBT-E)",
    "No. of Scheduled PE Sessions (Meetings not Topics)",
    "No. of Attended PE Sessions provided (Meetings not Topics)",
    "No. of SHGM (Meetings not Topics)",
    "No. of Individual sessions provided",
    "No. of Conjoint sessions provided",
    "No. of DT Conducted",
    "Date of  Referral  outside MTRC (indicate kind of referral in remarks)",
    "Date of Case Conference (Write 0 if N/A)",
    "Date of  Status Reporting (Write 0 if N/A)",
    "Date of Home Visit (Write 0 if N/A)",
    "Date of Follow-up Assessment (Write 0 if N/A)",
    "Date of ACP Treatment Planning",
    "Date of PDC (Write 0 if N/A)",
    "Date of Final Progress Reporting (Write 0 if N/A)",
    "Interventions Conducted w/in the month? (Write 1, if YES, 0, if NO)",
    "Medical Comorbity  (Write 1, if YES, 0, if NO)",
    "Psychiatric Comorbidity  (Write 1, if YES, 0, if NO)",
    "Date of Medical/ Psychiatric/Dental Consult within MTRC  (Write M-if Medical; P-Psychiatric,;D-if Dental; if NONE-LEAVE BLANK)",
    "Write the name of comorbity(s) here",
    "Date of Discharge ( FULL DATE)",
    "STATUS OF DISCHARGE",
    "REMARKS   and other interventions provided",
  ];

  const titleRow = Array(caseloadHeaders.length).fill(null);
  titleRow[12] = `OP MONTHLY INTERVENTION TRACKER (${monthLabel} ${period.year})`;

  const caseloadRows = grid.map((r, idx) => [
    idx + 1,
    r.pwudCode,
    r.clientName,
    r.sex,
    r.lgu,
    r.cm,
    r.category,
    dateCell(r.dateEnrolled),
    r.newEnrollee,
    milestoneCell(r.datePo),
    milestoneCell(r.dateVltsReferral),
    milestoneCell(r.dateInitialAssessment),
    milestoneCell(r.dateInitialTreatmentPlanning),
    milestoneCell(r.dateInitialProgressReporting),
    r.scheduledCbtSessions,
    r.attendedCbtSessions,
    r.scheduledPeSessions,
    r.attendedPeSessions,
    r.attendedShgmSessions,
    r.individualCounselingSessions,
    r.conjointFamilySessions,
    r.drugTestsConducted,
    milestoneCell(r.dateReferralOutsideMtrc),
    milestoneCell(r.dateCaseConference),
    milestoneCell(r.dateStatusReporting),
    milestoneCell(r.dateHomeVisit),
    milestoneCell(r.dateFollowupAssessment),
    milestoneCell(r.dateAcpTreatmentPlanning),
    milestoneCell(r.datePdc),
    milestoneCell(r.dateFinalProgressReporting),
    r.interventionsConductedInMonth,
    r.medicalComorbidity,
    r.psychiatricComorbidity,
    r.consultTypeWithinMtrc || "",
    r.comorbidityDetails || "",
    dateCell(r.dateOfDischarge),
    r.statusOfDischarge || "",
    r.remarks || "",
  ]);

  const caseloadSheet = XLSX.utils.aoa_to_sheet([
    titleRow,
    caseloadHeaders,
    ...caseloadRows,
  ]);
  XLSX.utils.book_append_sheet(wb, caseloadSheet, "CASELOADS");

  const censusAoA = buildCensusSheetAoA(summaries, monthLabel, period.year);
  const censusSheet = XLSX.utils.aoa_to_sheet(censusAoA);
  XLSX.utils.book_append_sheet(wb, censusSheet, "CENSUS");

  const noncompAoA = buildNonCompleterAoA(summaries.nonCompleters);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(noncompAoA), "NONCOMPLETER");

  const dtAoA = buildPositiveDtAoA(summaries.positiveDrugTests);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dtAoA), "(+) DT");

  const perfAoA = buildAttendancePerformanceAoA(summaries.attendancePerformance, monthLabel);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(perfAoA), "STAFF PERFORMANCE");

  XLSX.writeFile(wb, `OP_CM_TRACKER_${monthLabel}_${period.year}.xlsx`);
}

function buildCensusSheetAoA(summaries, monthLabel, year) {
  const rows = [];
  rows.push(["CENSUS", null, null, null, null, null, null, null, null, "DISCHARGE"]);
  rows.push([
    "CASE MANAGER", "OP ", null, null, null, null, null, "TOTAL", null,
    "CASE MANAGER", "Completer", null,
    "NON-COMPLETER", null, null, null, null, null, null, null, "TOTAL",
  ]);
  rows.push([
    null, "Voluntary", null, "LGU-Referred", null, "Court-mandated", null, null, null,
    null, null, null,
    "Non-compliance", null, "Incarcerated", null,
    "Referred to Other Program/Facility", null, "Medical Discharge", null, null,
  ]);
  rows.push([
    null, "Male", "Female", "Male", "Female", "Male", "Female", null, null,
    null, "Male", "Female",
    "Male", "Female", "Male", "Female",
    "Male", "Female", "Male", "Female", null,
  ]);

  const dischargeList = Array.isArray(summaries.discharges) ? summaries.discharges : (summaries.discharges?.rows || []);

  for (const row of summaries.activeCensus.rows) {
    const dRow = dischargeList.find((d) => d.caseManager === row.caseManager);
    const compM = dRow?.Completer?.Male ?? 0;
    const compF = dRow?.Completer?.Female ?? 0;
    const nonM = dRow?.["Non-compliance"]?.Male ?? 0;
    const nonF = dRow?.["Non-compliance"]?.Female ?? 0;
    const incM = dRow?.Incarcerated?.Male ?? 0;
    const incF = dRow?.Incarcerated?.Female ?? 0;
    const refM = dRow?.["Referred to Other Program/Facility"]?.Male ?? dRow?.["Referred to Other Program/Facilty"]?.Male ?? 0;
    const refF = dRow?.["Referred to Other Program/Facility"]?.Female ?? dRow?.["Referred to Other Program/Facilty"]?.Female ?? 0;
    const medM = dRow?.["Medical Discharge"]?.Male ?? 0;
    const medF = dRow?.["Medical Discharge"]?.Female ?? 0;
    const dTotal = dRow?.total ?? (compM + compF + nonM + nonF + incM + incF + refM + refF + medM + medF);

    rows.push([
      row.caseManager,
      row.Voluntary.Male, row.Voluntary.Female,
      row["LGU-Referred"].Male, row["LGU-Referred"].Female,
      row["Court-mandated"].Male, row["Court-mandated"].Female,
      row.total,
      null,
      row.caseManager,
      compM, compF,
      nonM, nonF,
      incM, incF,
      refM, refF,
      medM, medF,
      dTotal,
    ]);
  }

  const st = summaries.activeCensus.subtotal;
  const dst = summaries.discharges?.subtotal;
  const dCompM = dst?.Completer?.Male ?? 0;
  const dCompF = dst?.Completer?.Female ?? 0;
  const dNonM = dst?.["Non-compliance"]?.Male ?? 0;
  const dNonF = dst?.["Non-compliance"]?.Female ?? 0;
  const dIncM = dst?.Incarcerated?.Male ?? 0;
  const dIncF = dst?.Incarcerated?.Female ?? 0;
  const dRefM = dst?.["Referred to Other Program/Facility"]?.Male ?? dst?.["Referred to Other Program/Facilty"]?.Male ?? 0;
  const dRefF = dst?.["Referred to Other Program/Facility"]?.Female ?? dst?.["Referred to Other Program/Facilty"]?.Female ?? 0;
  const dMedM = dst?.["Medical Discharge"]?.Male ?? 0;
  const dMedF = dst?.["Medical Discharge"]?.Female ?? 0;
  const dSubTotal = dst?.total ?? (dCompM + dCompF + dNonM + dNonF + dIncM + dIncF + dRefM + dRefF + dMedM + dMedF);

  rows.push([
    "Subtotal",
    st.Voluntary.Male, st.Voluntary.Female,
    st["LGU-Referred"].Male, st["LGU-Referred"].Female,
    st["Court-mandated"].Male, st["Court-mandated"].Female,
    st.total,
    null,
    "Subtotal",
    dCompM, dCompF,
    dNonM, dNonF,
    dIncM, dIncF,
    dRefM, dRefF,
    dMedM, dMedF,
    dSubTotal,
  ]);

  rows.push([
    "TOTAL",
    st.Voluntary.Male + st.Voluntary.Female, null,
    st["LGU-Referred"].Male + st["LGU-Referred"].Female, null,
    st["Court-mandated"].Male + st["Court-mandated"].Female, null,
    st.total,
    null,
    "GRAND TOTAL",
    dCompM + dCompF, null,
    dNonM + dNonF, null,
    dIncM + dIncF, null,
    dRefM + dRefF, null,
    dMedM + dMedF, null,
    dSubTotal,
  ]);

  rows.push([]);
  rows.push(["NO. OF ENROLLMENT", null, null, null, null, null, null, null, null, null, null, null, `${monthLabel} ${year}`]);
  rows.push(["CASE MANAGER", "OP ", null, null, null, null, null, "TOTAL"]);
  rows.push([null, "Voluntary", null, "LGU-Referred", null, "Court-mandated", null, "TOTAL"]);
  rows.push([null, "Male", "Female", "Male", "Female", "Male", "Female"]);

  for (const row of summaries.enrollments.rows) {
    rows.push([
      row.caseManager,
      row.Voluntary.Male, row.Voluntary.Female,
      row["LGU-Referred"].Male, row["LGU-Referred"].Female,
      row["Court-mandated"].Male, row["Court-mandated"].Female,
      row.total,
    ]);
  }

  if (summaries.enrollments?.subtotal) {
    const est = summaries.enrollments.subtotal;
    rows.push([
      "Subtotal",
      est.Voluntary.Male, est.Voluntary.Female,
      est["LGU-Referred"].Male, est["LGU-Referred"].Female,
      est["Court-mandated"].Male, est["Court-mandated"].Female,
      est.total,
    ]);
    rows.push([
      "TOTAL",
      est.Voluntary.Male + est.Voluntary.Female, null,
      est["LGU-Referred"].Male + est["LGU-Referred"].Female, null,
      est["Court-mandated"].Male + est["Court-mandated"].Female, null,
      est.total,
    ]);
  }

  return rows;
}

function findDischarge(cm, discharges, bucket, gender) {
  const list = Array.isArray(discharges) ? discharges : (discharges?.rows || []);
  const row = list.find((d) => d.caseManager === cm);
  if (!row || !row[bucket]) return 0;
  return row[bucket][gender] || 0;
}

function buildNonCompleterAoA(nonCompleters) {
  const rows = [
    [null, "LIST OF NON-COMPLETERS FOR THE MONTH "],
    [],
    [null, "NAME (LAST NAME, FIRST, MI)", "SEX", "DATE  ENROLLED IN THE CURRENT PROGRAM ", "DATE OF DISCHARGE", "REASON FOR DISCHARGE", "LENGTH OF TREATMENT (months)", "INTERVENTIONS DONE e.g.reported to court/LGU"],
  ];
  let lastCm = null;
  for (const item of nonCompleters) {
    if (item.caseManager !== lastCm) {
      rows.push([]);
      rows.push([item.caseManager]);
      lastCm = item.caseManager;
    }
    rows.push([
      null,
      item.clientName,
      item.sex,
      item.dateEnrolled,
      item.dateDischarged,
      item.reasonForDischarge,
      item.lengthOfTreatmentMonths,
      item.interventionsDone,
    ]);
  }
  return rows;
}

function buildPositiveDtAoA(entries) {
  const rows = [
    ["LIST OF PWUDS WITH POSITIVE DT RESULTS "],
    [],
    ["If you have no clients with positive DT result during the month, just leave it blank."],
    [],
    ["CASE MANAGER", "NAME OF CLIENT", "SUSTANCE USED", "NO. OF MONTHS IN THE PROGRAM"],
  ];
  let lastCm = null;
  for (const item of entries) {
    rows.push([
      item.caseManager !== lastCm ? item.caseManager : null,
      item.clientName,
      item.substanceDetected,
      item.monthsInProgramLabel,
    ]);
    lastCm = item.caseManager;
  }
  return rows;
}

function buildAttendancePerformanceAoA(performance, monthLabel) {
  const rows = [
    [null, null, null, null, null, null, null, null, null, "SUMMARY OF CLIENTS' ATTENDANCE RATE PER CASE MANAGER"],
    [],
    ["CASE MANAGER", "Target (CBT+PE)", "Actual (CBT+PE)", "Attendance Rate (%)"],
  ];
  const perfRows = Array.isArray(performance) ? performance : (performance?.rows || []);
  for (const row of perfRows) {
    const rate = row.attendanceRatePercent != null ? `${row.attendanceRatePercent}%` : "N/A";
    rows.push([row.caseManager, row.targetScheduled, row.actualAttended, rate]);
  }
  if (performance?.facilityTotal) {
    const ft = performance.facilityTotal;
    const rate = ft.attendanceRatePercent != null ? `${ft.attendanceRatePercent}%` : "N/A";
    rows.push([ft.caseManager, ft.targetScheduled, ft.actualAttended, rate]);
  }
  rows.push([]);
  rows.push(["Period", monthLabel]);
  return rows;
}
