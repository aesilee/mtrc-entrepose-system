import * as dohService from "../services/dohReportService.js";

// Helper to handle async errors and format responses
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
