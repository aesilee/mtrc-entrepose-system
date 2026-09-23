import * as dohService from "../services/dohReportService.js";
import { notifyRoles } from "../utils/notify.js";

const FORM_NAMES = {
  "/doh-form-4-1": "DOH Form 4.1 (Cases Managed)",
  "/doh-form-4-2": "DOH Form 4.2 (Service Provision)",
  "/doh-form-4-3-demographics": "DOH Form 4.3 Part I (Demographics)",
  "/doh-form-4-3-employment": "DOH Form 4.3 Part II (Employment)",
  "/doh-form-4-3-education": "DOH Form 4.3 Part III (Education)",
  "/doh-form-4-3-substance": "DOH Form 4.3 Part IV (Substance Profile)",
  "/doh-form-4-3-readmissions": "DOH Form 4.3 Part V (Readmissions)",
  "/doh-form-4-3-comorbidities": "DOH Form 4.3 Part VI (Comorbidities)",
  "/doh-form-10-1": "DOH Form 10.1 (Completion Rates)",
  "/doh-form-10-2": "DOH Form 10.2 (Discharges Summary)",
  "/doh-form-11": "DOH Form 11 (Drug Testing Matrix)",
  "/program-census": "Program Census Summary",
  "/non-completers": "Non-Completers Roster",
  "/positive-dt": "Positive Drug Test Roster"
};

// Helper to handle async errors, format responses, and dispatch report-ready alerts
const handleReport = (serviceFn) => async (req, res) => {
  try {
    const { month, year, quarter } = req.query;
    // Default to current date if not provided
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const q = parseInt(quarter) || Math.floor(new Date().getMonth() / 3) + 1;

    let data;
    if (req.route.path.includes("10-1")) {
      data = await serviceFn(q, y);
    } else {
      data = await serviceFn(m, y);
    }

    // Phase 4: Dispatch report-ready notification to HIM and ICT Admins
    const formTitle = FORM_NAMES[req.route.path] || "DOH Statutory Report";
    const periodLabel = req.route.path.includes("10-1") ? `Q${q} ${y}` : `${m}/${y}`;
    notifyRoles(
      ["ict_admin", "him_staff"],
      "reports",
      "report_generated",
      `${formTitle} generated for ${periodLabel} — by ${req.user.username}`
    ).catch((err) => console.error("Report notification error:", err));

    res.json({ success: true, data });
  } catch (err) {
    console.error(`Error generating report at ${req.route.path}:`, err);
    res.status(500).json({ success: false, message: "Failed to generate report" });
  }
};

export const getForm41 = handleReport(dohService.getCensusMetrics);
export const getForm42 = handleReport(dohService.getServiceTallies);
export const getForm43Part1 = handleReport(dohService.getDemographics);
export const getForm43Part2 = handleReport(dohService.getEmployment);
export const getForm43Part3 = handleReport(dohService.getEducationResidence);
export const getForm43Part4 = handleReport(dohService.getSubstanceProfile);
export const getForm43Part5 = handleReport(dohService.getReadmissions);
export const getForm43Part6 = handleReport(dohService.getComorbidities);
export const getForm101 = handleReport(dohService.getCompletionRates);
export const getForm102 = handleReport(dohService.getDischargeSummary);
export const getForm11 = handleReport(dohService.getDrugTestSurveillance);
export const getProgramCensus = handleReport(dohService.getProgramCensus);
export const getNonCompleters = handleReport(dohService.getNonCompleters);
export const getPositiveDTRoster = handleReport(dohService.getPositiveDTRoster);
