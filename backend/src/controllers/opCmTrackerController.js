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

export async function getOpCmTrackerDrilldown(req, res) {
  const month = Number(req.query.month);
  const year = Number(req.query.year);
  const caseManagerId = req.query.caseManagerId ? Number(req.query.caseManagerId) : null;
  const metric = req.query.metric || "all";
  const modality = req.query.modality || "all";

  if (!month || !year) {
    return res.status(400).json({ message: "Month and year are required." });
  }

  if (req.user.role === "case_manager") {
    if (caseManagerId && caseManagerId !== req.user.id) {
      return res.status(403).json({ message: "You can only view your own caseload tracker drilldown." });
    }
  }

  try {
    const effectiveCmId = req.user.role === "case_manager" ? req.user.id : caseManagerId;
    const data = await opCmTrackerService.getOpCmTrackerDrilldown(month, year, effectiveCmId || null, metric, modality);
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    if (err.message === "Invalid month or year.") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Could not generate OP CM Tracker drilldown records." });
  }
}

export async function issueOpCmTrackerSnapshot(req, res) {
  const { month, year, caseManagerId, title, notes } = req.body;
  if (!month || !year) {
    return res.status(400).json({ message: "Month and year are required." });
  }

  // Only HIM Staff and ICT Admin can issue official statutory snapshots
  if (req.user.role !== "him_staff" && req.user.role !== "ict_admin") {
    return res.status(403).json({ message: "Only HIM Staff or ICT Admin can issue official statutory snapshots." });
  }

  try {
    const result = await opCmTrackerService.issueOpCmTrackerSnapshot({
      month: Number(month),
      year: Number(year),
      caseManagerId: caseManagerId ? Number(caseManagerId) : null,
      title,
      notes,
      user: req.user,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error("Error in issueOpCmTrackerSnapshot:", err);
    res.status(500).json({ message: err.message || "Could not issue official report snapshot." });
  }
}

export async function listOpCmTrackerSnapshots(req, res) {
  const month = req.query.month ? Number(req.query.month) : null;
  const year = req.query.year ? Number(req.query.year) : null;
  const caseManagerId = req.query.caseManagerId ? Number(req.query.caseManagerId) : null;

  try {
    const snapshots = await opCmTrackerService.listOpCmTrackerSnapshots({ month, year, caseManagerId });
    res.json({ success: true, snapshots });
  } catch (err) {
    console.error("Error in listOpCmTrackerSnapshots:", err);
    res.status(500).json({ message: "Could not list report snapshots." });
  }
}

export async function getOpCmTrackerSnapshotById(req, res) {
  const { id } = req.params;
  try {
    const snapshot = await opCmTrackerService.getOpCmTrackerSnapshotById(id);
    if (!snapshot) return res.status(404).json({ message: "Snapshot not found." });
    res.json({ success: true, snapshot });
  } catch (err) {
    console.error("Error in getOpCmTrackerSnapshotById:", err);
    res.status(500).json({ message: "Could not retrieve snapshot." });
  }
}
