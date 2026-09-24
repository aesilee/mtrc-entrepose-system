import * as opCmTrackerService from "../services/opCmTrackerService.js";

export async function getOpCmTracker(req, res) {
  const month = Number(req.query.month);
  const year = Number(req.query.year);
  const caseManagerId = req.query.caseManagerId ? Number(req.query.caseManagerId) : null;

  if (!month || !year) {
    return res.status(400).json({ message: "Month and year are required." });
  }

  if (req.user.role === "case_manager") {
    if (caseManagerId && caseManagerId !== req.user.id) {
      return res.status(403).json({ message: "You can only view your own caseload tracker." });
    }
  }

  try {
    const effectiveCmId = req.user.role === "case_manager" ? req.user.id : caseManagerId;
    const data = await opCmTrackerService.getOpCmTrackerReport(month, year, effectiveCmId || null);
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    if (err.message === "Invalid month or year.") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Could not generate OP CM Tracker report." });
  }
}

export async function getOpCmTrackerSummary(req, res) {
  const month = Number(req.query.month);
  const year = Number(req.query.year);
  const caseManagerId = req.query.caseManagerId ? Number(req.query.caseManagerId) : null;

  if (!month || !year) {
    return res.status(400).json({ message: "Month and year are required." });
  }

  if (req.user.role === "case_manager") {
    if (caseManagerId && caseManagerId !== req.user.id) {
      return res.status(403).json({ message: "You can only view your own caseload tracker." });
    }
  }

  try {
    const effectiveCmId = req.user.role === "case_manager" ? req.user.id : caseManagerId;
    const data = await opCmTrackerService.getOpCmTrackerReport(month, year, effectiveCmId || null);
    res.json({ success: true, data: { period: data.period, summaries: data.summaries } });
  } catch (err) {
    console.error(err);
    if (err.message === "Invalid month or year.") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Could not generate OP CM Tracker summary." });
  }
}
