# Tasks 1–14: Implementation Check

*Checked 2026-11-15 against branch `Huaa` (including uncommitted changes) and the schema in `Dump20261113.sql` plus the code's own runtime migrations. This is a code reading only; nothing was run against a live database.*

## Summary

| # | Task | Verdict | One-line reason |
|---|---|---|---|
| 1 | Attendance status vs completion | ⚠️ Mostly done | Model is right. Gaps: re-saving duplicates rows, an unknown status silently becomes Present, and approvers/reasons are auto-filled |
| 2 | Scheduling / expected attendance | ✅ Done | Roster, states, unresolved, and reschedule history all work |
| 3 | One progress calculation | ⚠️ Mostly done | Curriculum progress is unified. **Attendance rate** still has 3 different formulas |
| 4 | Patient-specific duration | ✅ Done | One small bypass when editing a patient |
| 5 | Multi-3 consistency | ⚠️ UI done, **database will reject some saves** | `attendance.drug_test_result` is still ENUM(NEGATIVE, POSITIVE); `substance_tested` is VARCHAR(50) |
| 6 | CBT-E and risk documentation | ⚠️ CBT-E done; risk defaults still preselect **SAFE** | |
| 7 | Interventions and milestones | ⚠️ Recording done; tracker falls back to old dates | |
| 8 | Report definitions and traceability | ⚠️ Definitions done; **drill-down is broken** (queries use columns that don't exist) | |
| 9 | Historical reports | ⚠️ OP CM Tracker done; DOH forms still use current status | |
| 10 | Exact categories and discharge codes | ❌ **The expected behavior fails:** "Non-Completer" is counted as Completer in 3 places | |
| 11 | Readiness vs approval | **Necessary** | Certificates and court-report text can claim things the records don't support |
| 12 | Backend access control | **Necessary (narrowed)** | Session timeout not enforced; some HIM write access. CM caseload access was already accepted by the team. |
| 13 | Outpatient scope | **Necessary, low effort** | "Aftercare" flags change which DOH section a patient is counted in |
| 14 | Verification and usability | **Necessary** | The schema can't be rebuilt; an end-to-end test would have caught several bugs below |

On the "Confirmed problem" note at the top: **it's fixed in the UI.** `DrugTestModal.jsx` now has three independent THC/METH/ECS checkboxes (old "BOTH" records are read as THC + METH). Neither form defaults the result any more, and both endpoints require at least one substance for a POSITIVE result. The remaining Multi-3 problem is in the database (task 5 below).

---

## 1. Attendance: status vs completion (⚠️)

**Implemented correctly:**
- Present/Late/Absent/Excused kept separate from Credited/Not Credited/Pending Review.
- `curriculum_requirement`, `arrival_time`, `decision_reason`, `authorized_by_name`, `reviewed_at` are stored.
- Makeups link to the original row (`makeup_for_attendance_id`, checked to belong to the same patient), and a missed requirement can only be credited by one makeup.
- Duplicate topic credit is blocked (`checkDuplicateCurriculumCredit`).
- A center-cancelled session writes `cancelled` rows, not absences.
- The review endpoint restricts case managers to their own caseload.

**Problems:**
1. **Saving the same session twice creates duplicate attendance *and* drug-test rows.** Nothing checks for an existing `(session_id, patient_id)` attendance row, and `attendance` has no unique key (only `session_roster` does). Double-clicking Save or re-opening the modal doubles that day's counts. (`attendanceController.js` `recordAttendanceBulk`)
2. **An unknown status silently becomes Present** (`attendanceController.js:140-142`). It should be rejected with a 400.
3. **"Authorized staff" and "reason" are auto-filled**, so the record looks approved when nobody approved it. An excuse, a withheld credit or a late credit defaults `authorized_by_name` to the person recording, with a stock reason sentence. The policy flags `requireSupervisorForExcuse` and `requireReasonForLateDecision` are saved and displayed but **never enforced on the server**. `authorized_by` also always stores the recorder's ID, even when a different name is typed in.
4. **The late-arrival grace rule is only applied in the browser.** The server defaults every Late to `PENDING_REVIEW` unless the client sends a decision, so `lateGraceMinutes` / `lateWithinGraceDecision` have no server effect.
5. **The modal pre-fills every patient as Present + Credited + risk SAFE** (`RecordAttendanceModal.jsx:81-111`). That's the opposite of task 2's "Not Yet Recorded". A rushed save marks unconfirmed patients as present.
6. **Case managers can edit the attendance policy** (`PUT /api/attendance/policy`), but the task says MTRC's designated supervisor approves it.

*Still to decide (from the task): the lateness threshold, minimum participation, and who can approve credit exceptions. Problems 3 and 4 can't be fully fixed until those are decided.*

## 2. Scheduling (✅)
`scheduleSession` requires at least one expected patient and fills `session_roster`. Sessions have SCHEDULED/COMPLETED/CANCELLED/RESCHEDULED states. `rescheduleSession` requires a reason, keeps the original as RESCHEDULED, copies its roster and links `original_session_id`. Unresolved (expected but not recorded) entries are computed for the attendance list and the tracker, and the tracker takes the larger of roster and attendance counts as its denominator. The task's 10 expected / 8 recorded / 2 unresolved example works.
*Small issue:* patients recorded but not on the roster are added to it afterwards, so walk-ins raise "expected" after the fact. That's reasonable; just document it in the report definitions.

## 3. One progress calculation (⚠️)
`getUnifiedPatientProgress` / `getBulkUnifiedPatientProgress` is used by the dashboard, analytics, patient profile, certificates, court report, attention flags and tracker. 28/3/12 are counted separately, only credited rows count, and missing topics are listed. The "43+ activities attended but core incomplete" flag exists ✅.

**Gap: "attendance rate" has three different formulas**
| Screen | Formula |
|---|---|
| Analytics, per CM and per municipality (`analyticsController.js:35-36, 67, 287`) | `present` ÷ **all** rows (excludes Late; includes cancelled) |
| Patient list (`patientController.js:334-335`) | `present + late` ÷ non-cancelled |
| OP CM Tracker | credited (CBT + PE) ÷ scheduled (CBT + PE). MTRC's sheet uses **CBT only** |

Pick one approved definition (task 8) and use it on all three.

## 4. Duration (✅)
Required months, basis, agreed start (`rehab_start_date`, falling back to `admission_date`), extensions and expected completion are all handled. `recordPatientDurationChange` requires a reason and an approver and writes to `patient_duration_history`. Eligibility uses `isDurationMet`, so a 12-month client is not eligible at 7 months ✅.
*Small issue:* editing duration through `PUT /api/patients/:id` fills the approver with the current user's name instead of requiring one. Route that change through the duration-change endpoint only.

## 5. Multi-3 (⚠️: UI correct, database will reject some saves)
Both forms now share the same structure: explicit result, three independent checkboxes, at least one required for POSITIVE, the PENDING/INVALID/NOT_PERFORMED states, and time, staff, session and correction tracking. THC + ECS is saved as one test ✅.

**Two problems with how the columns are defined.** MySQL 8 runs in strict mode by default, which rejects a value that doesn't fit its column instead of trimming it.
1. **`attendance.drug_test_result` is still `ENUM('NEGATIVE','POSITIVE')`.** The code widens `drug_test_logs.result` but never this column. Recording attendance with **Pending, Invalid or Not Performed** for any patient fails, and the whole session save rolls back.
2. **`drug_test_logs.substance_tested` is `VARCHAR(50)`.** "Multi-3: THC (Marijuana), METH (Methamphetamine), ECS (Ecstasy)" (63 chars) and "Multi-3 Rapid Drug Screen (Invalid Specimen — Retest Required)" (62) are too long. **A triple-positive or an Invalid result fails to save**, from either form.

*Still to decide (from the task): whether a test belongs to each activity or to the whole visit.* Today every attended session row creates a test, so two sessions on one visit means two tests.

## 6. CBT-E and risk (⚠️)
CBT-E is good: items start unanswered, no score is invented (`overallScore: null`), form basis, approving lead and adaptation notes are stored, self-report, staff assessment and drug test are kept separate, and NEARLY_USED is kept (columns widened to VARCHAR).
**Still preselected or defaulted:**
- The attendance modal and `ProgressNoteModal.jsx:18` default relapse risk to **SAFE**.
- On the server, `normalizeSelfReportedRisk("")` returns **"SAFE"** (`cbteAndRiskSchema.js`), so an unanswered self-report on attendance *and* CBT-E is saved as "Safe / Abstinent".

Use empty or `NOT_ASSESSED` and store NULL.
*I can't check field-by-field against the supplied CBT-E workbook without the file.*

## 7. Interventions and milestones (⚠️)
Dated, repeatable `patient_interventions` (type, staff, location, remarks, qualifies-for-tracker) and `patient_milestone_history` are in place. The tracker's "intervention conducted" now includes home visits, consults, milestones and notes, so a home-visit-only client counts ✅.
**Gaps:**
- Tracker date columns **fall back to the lifetime milestone date** when nothing happened that month (`opCmTrackerService.js:815-853`). The sheet writes 0.
- The progress-note part reads `progress_notes.note_date`, which doesn't exist, so it is always 0.
- The export prints consult letters (M/P) but not their dates.

## 8. Report definitions and traceability (⚠️)
`ReportDefinitionsModal`, the 74-vs-73 reconciliation (`caseloadReconciliation`), N/A for empty denominators and frozen snapshots exist ✅.
**Broken:** the drill-down is meant to "reveal the patient-session records that produced a total", but its queries reference columns that exist neither in the dump nor in any migration: `attendance.session_time`, `sessions.facilitator_id`, `sessions.start_time`, `patient_cbte_evaluations.cbt_session_reference` / `overall_relapse_risk`. Each is wrapped in `.catch(() => [[]])`, so the **traceability lists are always empty and "CBT-E conducted" is always 0** (`opCmTrackerService.js:1089-1165`).
**Open:** CBT-only vs CBT + PE (MTRC's August sheet, 193 ÷ 235 = 82%, is CBT-only), and the Form 4.1 wording. Both are HIM decisions the task already flags.

## 9. Historical reports (⚠️)
OP CM Tracker ✅: CM taken from `patient_case_manager_history` as of the month, archived patients kept for months before archiving, membership from admission and discharge dates, and the regenerated-vs-issued snapshot comparison.
**Not done:**
- **DOH forms** still use *current* `enrollment_status` / `current_status` / `program_phase` (Form 4.1 "cases before the month", the outpatient/aftercare split in every form) and the current CM (`getProgramCensus`, `getPositiveDTRoster`). Last month's DOH report changes after today's discharge or reassignment.
- `patient_status_history` is **never read** by any report. It is also **not written** when enrollment is finalized (pending → active) or by the main case-manager discharge path (`caseManagementController.dischargePatient`). Only registration, patient edit and the HIM discharge path write it.

## 10. Exact categories and discharge codes (❌)
**Breaks the task's own expected behavior: "Non-Completer" is counted as Completer.** The case-manager discharge writes `discharges.discharge_type = 'Non-Completer'`, and these filters match it because "Non-Completer" contains "complete":
| Where | Code | Effect |
|---|---|---|
| `patientController.js:147` (Patients filter "completed") | `discharge_type REGEXP 'complete\|graduat'` | Non-completers appear under Completed and **disappear from Dropped** (line 149 uses NOT REGEXP) |
| `reportController.js:135` (completed-cases report) | `LIKE '%complet%'` | Non-completers counted as completed |
| `dohReportService.js:931` (Form 10.1 completion rate) | `pd.status LIKE '%Completer%'` | **Every non-completer is counted as a completer** in the DOH completion rate |

**Other problems:**
- **Discharge stamps `date_pdc` = discharge date for every outcome**, including non-completers (`caseManagementController.js` ~691). A dropped client gets a PDC milestone they never had.
- The two discharge paths still decide "completed" differently: `dischargeController` uses a regex on free text (which matches "Non-Completer" too), and the case-manager path uses the exact string.
- **Missing sex still becomes Male** in every DOH form (`isFemale()` → otherwise male). The tracker correctly uses "Unspecified".
- **Categories are still guessed from text.** `mapCategory` (tracker) checks "voluntary" first, so "Voluntary **with Court Order**" becomes Voluntary and LGU-referred voluntary clients become Voluntary. DOH Form 4.1 uses a different matcher and gets the same patients right, so the two reports disagree.
- **Recommitment is never detected** in Form 4.1 (it reads nature of confinement or notes, not `admission_type`). Readmission depends on a prior-admissions count rather than the admission type chosen.
- **Fix:** store one coded value per category and outcome (e.g. `COMPLETER`, `NON_COMPLETER`, plus a reason code) and compare those codes exactly everywhere. No text matching.

---

## 11–14: Are they necessary?

### 11. Readiness vs approval: **Yes, necessary**
Evidence from the current code:
- `generateCertificate` issues a COMPLETION certificate **without re-checking eligibility**. Only the UI checks.
- **The court progress report writes statements without checking them**: the INITIAL text says baseline testing was "satisfactory", MIDTERM says "Routine urine screening remains negative", and FINAL says "certified negative urine drug surveillance records… completed PDC". None of these read the drug-test results or the PDC milestone (`caseManagementController.js` ~1371-1380).
- Discharge fills in a PDC date automatically (task 10).
- The certificate's signatory is just whoever clicked Issue. No reviewer or approver is recorded.

**Minimum to do:** a server-side eligibility check at issue time; generated text built only from verified data; a "Ready for review → Approved by [role] → Issued" record. The approving position is still MTRC's decision.

### 12. Backend access control: **Yes, but narrower**
The team already accepted case managers viewing and editing other caseloads, so that part is out. What's still needed:
- **Enforce `session_timeout_minutes`.** It's a setting that does nothing; the JWT is always 8h. Also add a 401 handler that logs the user out.
- **HIM write access:** HIM can `POST /api/discharges` and `POST .../court-report` even though the task describes HIM as summaries and reporting. Confirm whether that's intended.
- Make sure exports follow the same rules. The tracker export is correctly scoped to the case manager's own caseload ✅.
- Clinical approval (task 11) must not simply follow `ict_admin`. ICT currently passes every `requireRole` check.

### 13. Outpatient scope: **Yes, low effort**
Aftercare still appears in places that change data:
- Discharge "Endorsed to Aftercare" sets `program_phase = 'Aftercare'`. Every DOH form then **moves that patient into its Aftercare section**.
- Forms 4.1 B, 4.2 Aftercare, 4.3 Aftercare and 10.1 compute aftercare numbers the system can't produce correctly.
- Registration offers "Aftercare Program (ACP / SIBOL)" as a type of service; `discharges.program_type` allows residential/aftercare/medical_detox; court-report text says "endorsed to the 9-Month aftercare".

**Fix:** record "referred to aftercare" as a discharge referral only, without changing the phase or modality. Mark the aftercare DOH sections as manual entry or remove them, and remove aftercare from the service-type choices.

### 14. Verification and usability: **Yes, essential before deployment or defense**
- The schema can't be rebuilt from the repo, and the runtime migrations hide their errors. That's exactly how the task 5 column problems and the task 8 missing columns got through.
- An end-to-end run with fictional patients covering the task's list (late arrival, makeup, repeat, multiple positives, 12-month requirement, reassignment, readmission, both discharge outcomes) would have caught: the save failure on Pending/Invalid results, the triple-positive save failure, duplicate rows on re-save, Non-Completer counted as Completer, and the empty drill-down.

---

## Fix order

1. **Database fixes (blockers):** widen `attendance.drug_test_result` and `drug_test_logs.substance_tested`; add the missing columns or fix the four tracker queries; add a UNIQUE `(session_id, patient_id)` on attendance and update instead of insert when re-saving.
2. **Task 10 codes:** coded outcome values; fix the three "complete" filters; stop auto-stamping PDC; one classifier shared by the tracker and DOH; unknown sex = Unspecified.
3. **Task 1/6 defaults:** no preselected Present/Credited/SAFE; reject unknown status; require a real reason and approver where the policy says so, enforced on the server.
4. **Task 11** server-side eligibility check and verified generated text; **task 13** aftercare clean-up.
5. **Task 9** for DOH forms (status history written everywhere and read by the reports); **task 3/8** single attendance-rate definition.
6. **Task 14:** commit schema plus seed data, then run the fictional end-to-end checklist.
