# Problems That Interrupt the Patient Cycle (audit of 2026-11-27)

**How this was checked:** I copied the database into a throwaway database (`mtrc_audit`) and ran a second backend against it on port 5055. A script then walked one test patient through the whole cycle by calling the API:

1. Registered the patient and took them through all five IDADIN steps.
2. Issued the enrollment certificate.
3. Scheduled sessions and recorded attendance: present, absent twice, late, and a positive drug test.
4. Added case-management records.
5. Checked eligibility, then discharged the patient.
6. Ran the DOH forms, the tracker, the snapshots and the dashboards.

The copied database was dropped afterwards, and your real `mtrc_entrepose` data was never written to. The frontend also builds without errors.

**Update (same day):** **all 19 items are fixed.**
- **Items 1–15** were confirmed by re-running the full cycle on a fresh copy of the database. That run included 10 simultaneous registrations and 10 simultaneous certificates.
- **Item 16** was confirmed by building a brand-new database from `database/schema.sql` and `database/seed_reference.sql`, then running registration, attendance, certificates, reports and dashboards on it.
- **Items 17–19** were done in the repository: the files were renamed, the README conflict was resolved, and the work was committed.

Severity levels:
- **Blocker:** the step fails with an error.
- **Breaks the rules:** the step goes through but gives a wrong result.
- **Friction:** it works, but it is confusing or unsafe.

---

## A. Blockers: the step fails

### 1. Saving attendance crashes unless every patient has a self-reported risk
- **Where:** `RecordAttendanceModal.jsx:655`, `attendanceController.js:308`, and the `attendance.relapse_risk` column.
- **What happens:**
  - The risk dropdown starts on "— Unanswered / Not Assessed —", and the frontend sends that as `null`.
  - The column is `NOT NULL DEFAULT 'SAFE'`, but the code inserts the `null` explicitly, so the default never applies.
  - MySQL rejects the row and the whole batch rolls back. The user only sees "Could not record attendance."
  - This also hits absent patients, who have no risk to report anyway.
- **Seen in the test:** every attendance save failed with HTTP 500 until a risk value was supplied.
- **Fix:**
  - On the backend, fall back to `'SAFE'` (or make the column nullable).
  - In the modal, either require a choice for attended patients or skip the field for absent ones.

### 2. Saving a progress note also crashes, in two ways
- **Where:** `progressNoteController.js:55` and `progressNoteController.js:83`.
- **Without a self-reported risk:** the note isn't saved, for the same `NOT NULL` reason as item 1.
- **With a risk of At Risk, Nearly Used or Used:**
  - The note **is** saved.
  - The alert insert then uses columns that don't exist (`user_id, event_type, title`; the table has `recipient_id, type, category, message`).
  - So the user gets "Could not save the progress note" even though it was saved. They will likely click Save again and create duplicate notes, and the case manager never gets the relapse alert.
- **Fix:**
  - Use `notifyUser(...)` from `utils/notify.js`, as `attendanceController` does.
  - Default the risk to `'SAFE'`.

### 3. Some patient dropdowns only show the first 10 patients
- **Where:** `listPatients` has `defaultLimit = 10`, and these screens call `api.get("/patients")` without a `limit`:
  - `Certificates.jsx:20`
  - `ProgressNoteModal.jsx:31`
  - `FollowUpModal.jsx:14`
  - `ReportGeneratorModal.jsx:32`
- **Impact:** with 75 patients, anyone after the 10th can't be picked for a certificate, a progress note, a follow-up or a report from those screens.
- **Fix:** pass `{ params: { limit: 100 } }` or add a search box.

---

## B. Breaks the rules: wrong result goes through

### 4. A patient can be discharged as a Completer without meeting the requirements
- **Where:** `caseManagementController.js` (`dischargePatient`) and `dischargeController.js` (`createDischarge`).
- **Seen in the test:**
  - The patient had 2/43 core requirements and a positive drug test.
  - Discharging them as "Completer (Graduated) / Completed Program" was **accepted**.
  - The completion certificate was correctly refused, but DOH Form 10.1/10.2 and the completion rate now count a false graduate.
- **Fix:** before accepting a Completer discharge, run the same checks the certificate already uses: duration, 43/43, no positive test, and the PDC date.

### 5. Discharged patients stay "active" for sessions, attendance and drug tests
- **Seen in the test:** after the discharge:
  - The same patient could still be scheduled, marked present and **credited** a CBT topic.
  - They could still be given a new drug test.
  - The database showed `enrollment_status = completed` but `current_status = active`.
- **Fix:**
  - Have discharge set `current_status` too.
  - Have scheduling and attendance refuse patients whose `enrollment_status` isn't `active`.

### 6. Archiving a certificate from the Patient Profile archives a different patient's certificate
- **Where:** `PatientProfile.jsx:172` sends an ID from `certificate_issuances`, but `archiveCertificate` updates the old `certificates` table by that ID.
- **Seen in the test:** archiving issuance #1 (patient 77) set `is_archived = 1` on `certificates` #1, which belongs to **patient 75**. The issuance itself has no archive column, so nothing happened to it.
- **Fix:** add archive columns and endpoints for `certificate_issuances`, and point the button at them.

### 7. User IDs 3 and 14 are hard-coded (uncommitted change)
- **Where:**
  - `patientController.js:165`
  - `analyticsController.js:24`
  - `auth.js:112`
- **What happens:** accounts #3 (`casemanager`) and #14 (`casitas`) share one caseload.
- **Impact:** on any other database (the panel's, or MTRC's real server), those IDs belong to different people or don't exist. Wrong case managers would see each other's patients, or the sharing would silently stop.
- **Fix:** remove the special case, or make it a setting or table, for example "co-handling case managers".

### 8. The same alerts repeat
- **Ready for PDC** fires again on every session the patient attends after reaching 43/43 (`attendanceController.js:490`).
- **2 consecutive absences** fires again on every further absence.
- Neither checks whether the alert was already sent, so the bell fills with duplicates during a long demo.

### 9. The positive drug-test alert doesn't name the drugs
- **What happens:** the database correctly stores "THC, METH", but the notification says "tested POSITIVE for [Multi-3 Panel]".
- **Cause:** `attendanceController.js:569` reads `r.substanceTested` instead of the Multi-3 summary.

---

## C. Friction: access and security gaps

10. **Admitting can list all attendance** (`GET /api/attendance` returns 200), even though attendance is clinical data they're blocked from on the profile. `attendanceRoutes.js` needs a role guard.
11. **Case manager access is inconsistent.** A second case manager is refused when **viewing** the patient (403) but allowed to **edit** them (`PUT /patients/:id` returned 200). Read and write should follow one rule.
12. **Case managers can change the attendance policy** (`PUT /attendance/policy`), even though it is labelled as approved by the Medical Center Chief.
13. **Expired logins aren't handled.**
    - `api/axios.js` has no response interceptor, so after 8 hours every call just fails and the page looks broken instead of returning to login.
    - The `session_timeout_minutes` setting is never used anywhere.
14. **Control numbers use `COUNT(*)+1`** for certificates and patient codes. Two saves at the same moment can produce the same number.
15. **Re-recording a session deletes its drug-test rows** and inserts them again (`attendanceController.js`, the "idempotency guard"), so any earlier correction history for that session is lost.

## D. Setup and repository issues (stop the system from being installed elsewhere)

16. **The schema can't be rebuilt from the repo.** `database/schema.sql` only creates 2 tables, and the rest are created on the fly by runtime migrations that hide their own errors.
17. **Filename case mismatch.** The code imports `followUpController.js` and `followUpRoutes.js`, but the files are `followupController.js` and `followupRoutes.js`. This works on Windows and **crashes on Linux**.
18. **`README.md` still has an unresolved merge conflict.**
19. **About 25 modified files are uncommitted**, including the Admitting fix. Commit them so the work isn't lost.

---

## What worked correctly in the test

- All five IDADIN steps enforce their order.
- Finalize makes the patient active.
- The enrollment certificate works.
- Admitting is blocked from clinical records on the profile.
- Late beyond the grace period is set to Pending Review.
- The 2-consecutive-absence flag fires.
- A positive test or a "Used" report creates follow-ups automatically.
- The completion certificate is correctly refused.
- A second discharge is refused (409).
- All 14 DOH and report endpoints, the tracker, the snapshots (versioned), and all dashboards and analytics returned data.
- An invalid token gets a 401.

## Suggested fix order before the defense
1. Items 1 and 2, which break the demo outright.
2. Item 3, then items 4 and 5, which a panelist can trigger.
3. Item 6.
4. Item 7, which breaks on any other machine.
5. Item 13: the interceptor.
6. The rest as time allows.
