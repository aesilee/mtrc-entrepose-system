import pool from "../config/db.js";
import { getOpCmTrackerReport } from "../services/opCmTrackerService.js";

const TABLE_2 = [
  { y: 2024, m: 1, c: 51, comp: 1, nc: 3 },
  { y: 2024, m: 2, c: 40, comp: 15, nc: 1 },
  { y: 2024, m: 3, c: 37, comp: 7, nc: 3 },
  { y: 2024, m: 4, c: 41, comp: 0, nc: 1 },
  { y: 2024, m: 5, c: 35, comp: 8, nc: 1 },
  { y: 2024, m: 6, c: 37, comp: 5, nc: 0 },
  { y: 2024, m: 7, c: 37, comp: 2, nc: 1 },
  { y: 2024, m: 8, c: 40, comp: 3, nc: 0 },
  { y: 2024, m: 9, c: 39, comp: 6, nc: 0 },
  { y: 2024, m: 10, c: 44, comp: 0, nc: 0 },
  { y: 2024, m: 11, c: 39, comp: 6, nc: 3 },
  { y: 2024, m: 12, c: 34, comp: 7, nc: 0 },
  { y: 2025, m: 1, c: 38, comp: 1, nc: 2 },
  { y: 2025, m: 2, c: 41, comp: 7, nc: 1 },
  { y: 2025, m: 3, c: 44, comp: 5, nc: 0 },
  { y: 2025, m: 4, c: 49, comp: 3, nc: 0 },
  { y: 2025, m: 5, c: 52, comp: 3, nc: 2 },
  { y: 2025, m: 6, c: 53, comp: 4, nc: 2 },
  { y: 2025, m: 7, c: 52, comp: 6, nc: 1 },
  { y: 2025, m: 8, c: 55, comp: 3, nc: 3 },
  { y: 2025, m: 9, c: 51, comp: 10, nc: 1 },
  { y: 2025, m: 10, c: 55, comp: 1, nc: 1 },
  { y: 2025, m: 11, c: 52, comp: 8, nc: 0 },
  { y: 2025, m: 12, c: 41, comp: 12, nc: 2 },
  { y: 2026, m: 1, c: 46, comp: 2, nc: 2 },
  { y: 2026, m: 2, c: 52, comp: 5, nc: 0 }
];

async function verify() {
  console.log("=========================================================");
  console.log("       VERIFYING OP CM TRACKER AGAINST TABLE 2.0         ");
  console.log("=========================================================");

  let allMatched = true;
  for (const t of TABLE_2) {
    const report = await getOpCmTrackerReport(t.m, t.y, null);
    const summary = report.summaries || {};
    const actualCensus = report.grid?.length || 0;

    const completerObj = summary.discharges?.subtotal?.Completer || { Male: 0, Female: 0, Unspecified: 0 };
    const actualComp = (completerObj.Male || 0) + (completerObj.Female || 0) + (completerObj.Unspecified || 0);
    const actualNc = summary.nonCompleters?.length || 0;

    const ok = actualCensus === t.c && actualComp === t.comp && actualNc === t.nc;
    if (!ok) {
      allMatched = false;
      console.log(`[MISMATCH] ${t.y}-${String(t.m).padStart(2, "0")}: Expected {census:${t.c}, comp:${t.comp}, nc:${t.nc}} | Got {census:${actualCensus}, comp:${actualComp}, nc:${actualNc}}`);
    } else {
      console.log(`[PASS] ${t.y}-${String(t.m).padStart(2, "0")}: Census ${actualCensus}, Completers ${actualComp}, Non-Completers ${actualNc}`);
    }
  }

  console.log("\n---------------------------------------------------------");
  console.log("Final Audit Status:", allMatched ? "PERFECT 100% MATCH ACROSS ALL 26 MONTHS!" : "ATTENTION: SOME MONTHS NEED ADJUSTMENT");
  console.log("---------------------------------------------------------");

  // Also verify grand totals
  const [[{ compTotal }]] = await pool.query("SELECT COUNT(*) AS compTotal FROM patient_discharges WHERE outcome = 'COMPLETER'");
  const [[{ ncTotal }]] = await pool.query("SELECT COUNT(*) AS ncTotal FROM patient_discharges WHERE outcome = 'NON_COMPLETER'");
  const [[{ activeNow }]] = await pool.query("SELECT COUNT(*) AS activeNow FROM patients WHERE enrollment_status = 'active' AND is_archived = 0");

  console.log(`Grand Totals:`);
  console.log(`- Total Completers: ${compTotal} (Expected: 130)`);
  console.log(`- Total Non-Completers: ${ncTotal} (Expected: 30)`);
  console.log(`- Active Remaining in 2026: ${activeNow} (Expected: 47)`);

  process.exit(0);
}

verify().catch((e) => {
  console.error("Verification failed:", e);
  process.exit(1);
});
