# MTRC ENTREPOSE PMIS: System Review

*Reviewed 2026-11-15 on branch `Huaa` (last commit `e028154`, plus about 17.8k lines of uncommitted changes). Sources: the capstone proposal (PMIS_TRC.docx), the code, `docs/entrepose-system-reviewer.html`, and the MySQL Workbench dump `Dump20261113.sql`.*

**See also:** [EXCEL_FIDELITY_REVIEW.md](EXCEL_FIDELITY_REVIEW.md), which checks the OP CM Tracker, the DOH forms and TRAIS against MTRC's real spreadsheets.

**Updated after the team's answers:** the schema lives in MySQL Workbench (a dump was provided). The drug-test rule, case-manager visibility, discharge authority and deployment target are accepted as designed. The defense will be judged against **both** the proposal objectives and the expanded system (§10).

---

## 1. What the system is

This is a web-based Program Information System for **ENTREPOSE**, the outpatient drug-rehabilitation program at Malinao Treatment and Rehabilitation Center (MTRC). It replaces separate Excel files and logbooks with a single database. That database covers intake, attendance, case management, reporting, certificates, notifications and role-based access.

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite, react-router 6, axios, jsPDF/html2canvas (PDF), xlsx (Excel export), react-select, `phil-reg-prov-mun-brgy` (PSGC addresses) | About 30k LOC. Pages are very large (PatientProfile 3.9k, OpCmTracker 3.2k, Attendance 3.0k, RecordAttendanceModal 3.0k lines). Styling is mostly inline. |
| Backend | Node.js (ESM) + Express 4, mysql2/promise pool, bcryptjs, jsonwebtoken | About 20k LOC. 23 route files, 24 controllers, 2 large services (OP CM Tracker, DOH reports). |
| Database | MySQL 8.0.46, managed in Workbench | 31 tables in the Nov 13 dump, plus 6 tables and many columns the backend creates on its own at runtime, for 37 in total. Details in §3A. |
| Auth | JWT (8h) stored in localStorage ("Remember me") or sessionStorage | `verifyToken` and `requireRole(...)` middleware |

**Scale:** about 52.8k lines of JS/JSX and 60 commits. There are **no automated tests**.

---

## 2. Actors and roles

| Role (`users.role`) | Proposal intent | What the code actually lets them do |
|---|---|---|
| **Admitting** (`admitting`) | Register patients, encode intake, issue Certificate of Enrollment | Patients list, Register Patient, the 5-step IDADIN intake (drug history, clinical triage, consents and finalize), edit demographics, issue **ENROLLMENT** certificates |
| **Case Manager** (`case_manager`) | Monitor attendance, write progress notes, keep treatment plans current | Patients they are assigned to **plus unassigned ones**. Schedule and reschedule sessions, record bulk attendance with drug tests and relapse risk, progress notes (SOAP), follow-ups, ITP (treatment plan), CBT-E evaluations, interventions, milestones, Multi-3 drug tests, court progress reports, discharge, **COMPLETION** certificates, OP CM Tracker, Analytics. They can also edit the attendance policy. |
| **HIM Staff** (`him_staff`) | Program statistics, reports, external reporting | Read-only patients and attendance, Reports, DOH Forms (4-1, 4-2, 4-3 parts 1–6, 10-1, 10-2, 11), census, non-completers, positive-DT roster, OP CM Tracker with official monthly **snapshots**, Analytics, Archives (view). They can also create discharges and completion certificates. |
| **ICT Admin** (`ict_admin`) | Accounts and settings | Everything above, plus User Management, Audit Logs, Settings, DB backup/restore (`mysqldump`/`mysql`), archive and restore of patients |

Navigation for each role is in `frontend/src/config/roles.js`. Page guards are in `App.jsx` (`ProtectedRoute`). API guards are in `backend/src/routes/*.js` (`requireRole`).

---

## 3. The complete patient lifecycle (as implemented)

```
Referral ─► Registration ─► Intake (IDADIN) ─► Finalize/Enroll ─► Program Orientation
   │            (pending)                         (active)              │
   │                                                                    ▼
   │                                  ┌──── Active Treatment (7 months standard) ────┐
   │                                  │ sessions → attendance → drug test → risk     │
   │                                  │ progress notes · follow-ups · interventions  │
   │                                  │ ITP · CBT-E 1/2/3 · milestones · court report│
   │                                  └──────────────────────────────────────────────┘
   │                                                    │
   │                          43 core credited + duration met + no positive DT + PDC
   │                                                    ▼
   └──────────────────────────────── Discharge ─► completed (Completer) → Certificate of Completion
                                          └──► dropped (AWOL/non-compliance/arrest…) / transferred
                                                       → (Completers) SIBOL aftercare phase
```

### Stage by stage

| # | Stage | Who | Screen / API | What changes in the data |
|---|---|---|---|---|
| 1 | **Referral** (voluntary, court/plea bargain, LGU CADAC/MADAC/BADAC, workplace, NGO) | Admitting | `/patients/:id/referral` · `/api/referrals/*` | `patient_referrals` and `patient_referral_documents` (PDF/JPG/PNG stored as blobs, with magic-byte check) |
| 2 | **Register** (Step 1 Demographics) | Admitting | `/patients/register` · `POST /api/patients` | `patients` row created. `patient_code` and `pwud_code` (LGU-coded) are generated. Duplicate check on name + birthdate. **A case manager is required.** Status is `pending`. CM assignment and status history rows are added. Notifications go out. |
| 3 | **Admission history** (Step 2) | Admitting | referral page | Admission type, legal track, ASSIST, DDE, baseline DT, hospitalizations |
| 4 | **Drug use history** (Step 3) | Admitting | `/patients/:id/intake/drug-history` · `PUT /api/intakes/patient/:id/drug-history` | `patient_intakes`, `patient_substances`. `workflow_step` moves up. |
| 5 | **Clinical triage** (Step 4) | Admitting | `.../clinical-triage` | Vitals, MSE, comorbidities, socio-economic class. `workflow_step` becomes 5. |
| 6 | **Consents and finalize** (Step 5) | Admitting | `.../finalize` · `POST .../finalize` | Consents are verified. `workflow_step` becomes 6. `enrollment_status` and `current_status` become `active`. Admission date and OPD number are set. Notifications go out. |
| 7 | **Session scheduling** | CM | Attendance page · `/api/sessions/schedule`, `/reschedule` | `sessions` (topic, facilitator, status SCHEDULED/COMPLETED/CANCELLED/RESCHEDULED), `session_roster` |
| 8 | **Attendance** (4-step modal) | CM | `POST /api/attendance/bulk` | `attendance` (present/late/excused/absent + credit decision), Multi-3 `drug_test_logs`, relapse risk. Session is auto-completed when nothing is left unresolved. **Side effects:** missed-session notice, 2-consecutive-absence flag, "43 core complete, ready for PDC" alert, relapse-risk and positive-DT alerts, and auto-created `follow_ups`. |
| 9 | **Curriculum credit** | system | `utils/curriculumProgress.js` | 28 CBT + 3 CBT-E + 12 PE = **43 core**. Orientation is separate. Late arrival within 15 minutes is credited; beyond that it goes to pending review. Repeated topics never get credit twice. Excuses need a makeup session. |
| 10 | **Case management** | CM | Patient Profile tabs · `/api/case-management/*` | Progress notes, ITP, CBT-E evaluations, interventions (home visit, case conference, ITP review…, each linked to a milestone), milestones (PO, initial assessment, ITP, PDC, ACP…), court progress report, duration changes (court order, plea bargain, extension) |
| 11 | **Monitoring** | CM / HIM | Dashboard "attention" flags, OP CM Tracker, Analytics | Computed when the page loads; there is no background job |
| 12 | **Completion check** | CM / HIM | `GET /api/certificates/:id/eligibility` | Checks: active/completed status, required duration met, 43/43 core, **zero positive DTs ever**, PDC date set |
| 13 | **Discharge** | CM (and HIM) | `/api/case-management/patients/:id/discharge` **or** `POST /api/discharges` | `discharges` and `patient_discharges` (two tables). `enrollment_status` becomes `completed` or `dropped`. Status history and notifications are recorded. |
| 14 | **Certificates** | Admitting (Enrollment) / CM, HIM (Completion) | `POST /api/certificates/:id/generate` | `certificate_issuances` with control number `CERT-ENR/CMP-YY-#####` |
| 15 | **Reporting** | HIM | Reports, DOH forms, OP CM Tracker snapshots | `generated_reports`, `report_snapshots` (frozen monthly issuance) |
| 16 | **Archive / restore** | ICT | `/api/archives` | `is_archived` flag and `archives` table |

---

## 3A. Data model (from `Dump20261113.sql` plus runtime migrations)

### Tables by domain

| Domain | Tables | Key relationships |
|---|---|---|
| **Identity and security** | `users`, `audit_log`, `system_settings`, `backups` | `audit_log` stores `actor_username` (text, not a FK) |
| **Patient core** | `patients` (90+ columns), `programs` | `patients.assigned_case_manager_id → users`, `program_id → programs`. `patient_code` and `pwud_code` are UNIQUE. |
| **Intake (IDADIN)** | `patient_referrals` (1:1), `patient_referral_documents` (blobs), `patient_intakes` (1:1, `workflow_step` 3→6), `patient_substances`, `patient_hospitalizations` | All `ON DELETE CASCADE` from `patients` |
| **Sessions and attendance** | `session_topics` (76 seeded rows), `sessions`, `session_roster`\*, `attendance`, `drug_test_logs` | `attendance → patients, sessions, users`. The roster is unique on (session, patient). |
| **Case management** | `progress_notes`, `follow_ups`, `patient_treatment_plans`, `patient_cbte_evaluations`, `patient_interventions`\*, `patient_consult_logs`, `patient_milestones` (1:1), `patient_milestone_history`, `patient_case_management` (1:1), `court_progress_reports` | |
| **History (for past reports)** | `patient_status_history`\*, `patient_case_manager_history`\*, `patient_duration_history`\*, `report_snapshots`\* | Effective-dated rows |
| **Outcomes** | `discharges`, `patient_discharges`, `certificates`, `certificate_issuances` | See issues below |
| **Reporting and housekeeping** | `generated_reports`, `notifications`, `archives` | |

\* *Not in the dump. Created by `ensure*Schema()` the first time the matching feature runs.*

### What the dump confirmed

- ✅ **Curriculum IDs match.** `session_topics` IDs 1 (Orientation), 2–29 (CBT-01..28), 48–50 (CBT-E), 51–62 (PE-PAT-01..12) line up exactly with `curriculumProgress.js`. CBT-29..46 (IDs 30–47) exist but are electives that never count toward the 43. The `altTitle` lists in the code don't match the DB titles; they look like a different manual edition. They're harmless, but worth cleaning up.
- ⚠️ **The dump is older than the code.** It's missing the 6 runtime tables and columns the uncommitted code needs (for example `sessions.session_status`, attendance credit fields). It also still has enums that the code later widens to VARCHAR (`attendance.relapse_risk` lacks `NEARLY_USED`, `drug_test_logs.result` lacks `PENDING/INVALID/NOT_PERFORMED`). So **the real schema is the dump plus whatever the backend migrated on first run.** On a fresh install, that only happens once someone uses each feature.
- ⚠️ **Runtime migrations hide their own failures.** Every `ALTER`/`CREATE` is wrapped in `.catch(() => {})` and guarded by a once-per-process flag. If one fails (permissions, FK order, a typo), the server keeps running and the feature breaks later with a confusing SQL error. Turning enums into VARCHAR also removes the database's own check on allowed values.

### Data-model issues

1. **Two certificate tables, and the UI mixes up their IDs (confirmed bug).** Finalizing enrollment writes an auto Enrollment certificate to `certificates` (14 rows). The statutory flow writes to `certificate_issuances` (2 rows, with a control number). The Patient Profile lists **issuances** (`/certificates/:id/history`). But its Archive button calls `/certificates/:certId/archive`, which updates **`certificates`** by that ID. **Archiving issuance #1 archives a different patient's legacy certificate #1.** Merge these into one table, or give each its own endpoints.
2. **Two discharge tables.** `discharges` has **no FK to `patients` and no UNIQUE on `patient_id`**, so the "already discharged" check is in code only. `patient_discharges` holds overlapping data. Both are written on every discharge.
3. **Intake data is stored twice.** `patients` still has the old intake columns (drug history, vitals, consents, `drugs_used_last_12_months`, and base64 `court_order_data` / `dde_result_data` as `longtext`). The same data now lives in `patient_intakes`, `patient_referrals` and `patient_referral_documents`. Pick one source of truth and drop or ignore the old columns. The base64 copies inflate every `SELECT p.*`.
4. **Milestones are stored twice.** `patient_case_management.program_orientation_date` and `milestone_1..4_date` overlap with `patient_milestones.date_po` and the other milestone dates.
5. **Missing constraints.** `attendance` has no UNIQUE (patient, session); only `session_roster` does, so duplicate attendance rows are possible through `/case-management/sessions/log`. `patient_milestone_history` has no FK to patients. There's no composite index on `attendance(patient_id, session_date)` or `drug_test_logs(patient_id, result)`, though at about 20 patients that doesn't matter yet.
6. **Privacy (RA 10173).** The dump holds patient records, uploaded court/DDE documents and password hashes. Keep it out of git and shared drives. Commit a **schema-only plus seed** file instead (see §8).

---

## 4. Proposal objectives vs implementation

| # | Objective (proposal) | Status | Comment |
|---|---|---|---|
| 1 | Centralized database | ⚠️ Partly | It works on the dev machine, but the schema **cannot be rebuilt from the repo** (§6.1) |
| 2 | Client profiling module | ✅ Exceeds | Full IDADIN/TRAIS-style 5-step intake, PSGC addresses, guardian rules for minors, duplicate detection |
| 3 | Attendance and missed-session flags | ✅ / ⚠️ | Rich attendance and credit policy. Flags fire **only when a session is marked absent**; a scheduled session that nobody records is never flagged (no scheduler) |
| 4 | Real-time dashboard | ✅ | Separate dashboards for the 4 roles |
| 5 | Reporting tool | ✅ Exceeds | Attendance, program stats, DOH Forms 4-x/10-x/11, OP CM Tracker with Excel export and snapshots |
| 6 | Certificate of Enrollment | ✅ | Also includes a Certificate of Completion and a Court Progress Report |
| 7 | Role-based access | ⚠️ | Implemented, but with server-side gaps (§6.2) |
| 8 | Notifications | ✅ | In-system only, as scoped. It sends a lot of notices, some of them duplicates (§6.4) |

**Scope note for the defense:** the system now goes well beyond the proposal. It adds the CBT/PE/CBT-E curriculum engine, Multi-3 drug testing, relapse risk, court/plea-bargain duration rules, the ITP, DOH statutory forms and SIBOL aftercare. Two parts of the proposal now disagree with the code. The proposal says residential and aftercare are **out of scope**, but the code has an aftercare phase. The proposal says settings include **Rules & Permissions**, but permissions are hard-coded. Update Chapter 1 Scope/Limitations or be ready to explain both.

---

## 5. Strengths

- **Domain fidelity.** Curriculum targets, the late-arrival credit policy, the duplicate-credit rule, the near-use vs actual-use distinction, LGU-coded PWUD IDs, and longitudinal history tables (CM assignment, status, duration) all show real engagement with MTRC's process.
- **Historical correctness.** `patient_status_history`, `patient_case_manager_history` and `report_snapshots` let past monthly reports be reproduced. This is easy to get wrong, and the team got it right.
- **Validation at registration** (phone, email, minors need a guardian, birthdate range, address completeness, duplicate person).
- **Parameterized SQL everywhere I looked.** No obvious SQL injection.
- **Upload hardening.** MIME allow-list plus magic-byte signature check.
- **Audit log and lockout.** Login, registration, discharge, settings and backup are audited. Accounts lock after N failed logins.
- **Transactions** are used where it matters most (bulk attendance, finalize enrollment).

---

## 6. Issues found (ranked)

### 6.1 Critical: deployment and reproducibility

1. **The schema only lives in Workbench.** That's fine day to day, but the repo's `database/schema.sql` still creates only `users` and `audit_log`, and `.gitignore` excludes `*.sql`. Nobody else (a teammate, the panel, MTRC's ICT unit) can set up the system from the repo. The fix is a **schema-only** export (`mysqldump --no-data mtrc_entrepose`) **taken after** the runtime migrations have run, plus a seed file for `session_topics`, `programs` and default `system_settings`. **No patient data.** See §3A for why the Nov 13 dump is already behind the code.
2. ~~Curriculum topic IDs might not match~~ **Checked against the dump: they match.** Keep `session_topics` in the seed file so the IDs stay fixed.
3. **Filename case mismatch** (`followUpRoutes.js` vs `followupRoutes.js`, and the same for the controller). Harmless on the team's Windows machines. It's a two-line fix, so do it anyway in case the code ever runs on Linux or macOS.
4. **About 17.8k lines of uncommitted work** (45 modified files and many new untracked files, including `backend/src/utils/*Schema.js`). One disk failure would lose a month of work. Commit soon.
5. **README.md contains an unresolved merge conflict** (`<<<<<<< HEAD … >>>>>>>`).

### 6.2 High: access control and business-rule enforcement

6. **Completion certificates are not checked on the server.** `generateCertificate` (`certificateController.js`) issues a COMPLETION certificate without calling the eligibility logic. Only the UI hides the button, so a direct API call can certify a client who has not completed the program.
7. **Discharge does not enforce completion criteria.** Both discharge paths let staff mark someone "Completer" without 43/43, duration, or PDC. They also detect "completed" differently: `dischargeController` uses a regex `/complete|graduat/`, while `caseManagementController` uses the exact string `'Completer (Graduated)'`. Neither sets `current_status`, which the eligibility check reads.
8–9. *Case-manager visibility and editing of other caseloads: **accepted by the team as intended** (group sessions are shared). One inconsistency remains: a CM can **edit** another CM's patient but gets a 403 when trying to **open** that patient's profile (`verifyPatientAccess`). Make read and write follow the same rule.*
10. **Case managers can change the attendance policy.** The policy is labeled "approved by Medical Center Chief", but `PUT /api/attendance/policy` allows `case_manager`. It should probably be ICT only.
11. **Control numbers can collide.** Patient codes and certificate control numbers are generated with `COUNT(*)+1` / `MAX` outside a transaction, so two staff saving at the same moment can get the same number. Use a counter table with `SELECT ... FOR UPDATE` or a unique index plus retry.
12. **The certificate ID mix-up is confirmed:** archiving from the Patient Profile archives the wrong record. See §3A, data-model issue 1.

### 6.3 Medium: security hygiene (expect panel questions)

13. The **`session_timeout_minutes` setting is never enforced**. The JWT always lasts 8h, and the frontend has **no 401 interceptor**, so an expired token leaves the user on a broken page instead of returning them to login.
14. **CORS is fully open** (`app.use(cors())`), there is **no login rate limit by IP**, and the JWT is kept in localStorage, which is exposed to XSS. Acceptable for a LAN deployment, but say so.
15. **Lockout and deactivation share one flag** (`status='inactive'`), so an admin cannot tell a locked user from a deactivated one. Failed logins for usernames that do not exist are not audited.
16. **`xlsx@0.18.5` from npm has known CVEs** (prototype pollution, ReDoS) and is no longer maintained on npm. Switch to the SheetJS CDN build or `exceljs`.
17. **Restore pipes uploaded SQL straight into `mysql`.** It is ICT-only, but a wrong file can wipe the DB. Add a confirmation step and take an automatic backup before restore.

### 6.4 Low: quality and maintainability

18. **No automated tests** at all. The proposal's Testing section is also written in the past tense ("Unit testing was performed…").
19. **Notifications repeat.** "Ready for PDC" fires again on *every* attended session after completion. The consecutive-absence flag fires again on every further absence. ICT admins get an attendance summary for every session.
20. **N+1 queries** in the bulk-attendance side effects, and `getUnifiedPatientProgress` is called per patient in loops.
21. **Huge components** (3–4k lines) with inline styles, which are hard to review and test. Split them by tab or step.
22. **Dead OPD flow.** Code exists for a `general_outpatient` 3-step flow, but `createPatient` hard-codes `case_type = "substance_use"`.
23. ~~"No positive DT ever" rule~~: **accepted by the team as program policy.** Expect a panel question on it and cite the ENTREPOSE manual section it comes from.
24. **`.vs/` and other noise** are in the working tree. `.vs/` is ignored, which is good; just check it was never committed earlier.

---

## 7. Issues in the proposal document (PMIS_TRC.docx)

- RRL: the paragraph on *Mobile and Computer-Based Applications… Knee Arthroplasty* is attributed to **Shimu et al. (2024)**, but the reference list (and Project Context) gives it to **Pritwani et al. (2024)**.
- Methodology: the **Development** paragraph is a copy of User Design ("The Design phase turns…"). It never describes development itself.
- Tools: the text says "Visual Studio Code" in one place and "Visual Studio" as the IDE in Table 4.0.
- Table 3.0 Software Requirements has only the OS row. The browser row that the text refers to is missing.
- Limitations has a sentence cut off: "…does not function as a full messaging." (*system* is missing).
- Source of Data says 5 respondents, but the appendix has only one transcript (R. A. R. Bongon). The "Survey" section describes interviews, not a survey.
- The UI design list repeats "Client Profiles" twice.
- The Proposal's tech background lists no auth/JWT, PDF/Excel export or DOH reporting, all of which the system now relies on.
- Scope contradictions with the system: aftercare, DOH form generation (the proposal says external exchange is "manual"), and a Rules & Permissions screen.

---

## 8. Recommended next steps (in order)

1. Commit the current work; fix the README conflict and the `followUp` filename case.
2. Commit a schema-only export (taken after the runtime migrations) plus seed data for `session_topics`, `programs` and `system_settings`. Allow those files through `.gitignore`. Never commit the full dump.
3. Enforce eligibility on the server for COMPLETION certificates and Completer discharges. Make the two discharge paths share one rule.
4. Fix the certificate archive ID bug. Better still, merge `certificates` into `certificate_issuances`.
5. Add a 401 interceptor that logs the user out, and make the JWT expiry follow `session_timeout_minutes`.
6. Make code and control-number generation safe when two users save at once.
7. Add a small test suite for `curriculumProgress`, `programDuration` and eligibility. These are the rules most likely to break quietly.
8. Update the proposal's scope and limitations to match what was built.

---

## 9. Team decisions (answered 2026-11-15)

| Question | Decision |
|---|---|
| Where is the schema? | MySQL Workbench. Dump `Dump20261113.sql` provided. |
| Any positive DT blocks completion | Accepted as is |
| CM sees and edits other caseloads | Accepted as is |
| HIM can create discharges | Accepted as is |
| Deployment target | Not a concern |
| Defense framing | **Both** the proposal objectives and the expanded system (see §10) |

---

## 10. Defense readiness (objectives + expanded system)

### A. Proving each proposal objective: live demo path

| Obj. | Show this | Role to log in as |
|---|---|---|
| 1 Centralized DB | The ER grouping in §3A. One Patient Profile pulls referral, intake, attendance, notes and certificates from about 20 tables. | any |
| 2 Client profiling | Register Patient (Step 1), then Referral (Step 2), Drug History (3), Triage (4), Finalize (5). Show the duplicate-name warning and the guardian rule for minors. | Admitting |
| 3 Attendance + flags | Schedule a session, then Record Attendance. Mark one patient absent and show the notification bell plus the dashboard "attention" list. Mark one positive and show the auto follow-up. | Case Manager |
| 4 Dashboard | Switch between the 4 role dashboards | each |
| 5 Reporting | Generate an attendance report, then DOH Form 4-3, then an OP CM Tracker snapshot and Excel export | HIM |
| 6 Certificate of Enrollment | Finalize, then auto-filled printable COE with a control number | Admitting |
| 7 RBAC | Try opening `/settings/users` as a case manager: redirected. Same through the API: 403. | CM / ICT |
| 8 Notifications | Bell and unread count. Show a reassignment notice reaching the new CM. | CM |

### B. Justifying the expanded scope
Present each addition as **a requirement found during the RAD review cycles**, not as feature creep. Tie each one to an MTRC source document:

| Expansion | Justification to cite |
|---|---|
| 43-session curriculum engine (CBT/PE/CBT-E) | ENTREPOSE program manual; completion cannot be judged by attendance counts alone |
| Multi-3 drug testing and relapse risk | Program protocol; drives follow-ups (objective 8) |
| Duration rules (7-month standard, court/plea bargain, extensions) | RA 9165 and plea-bargaining orders; court progress reports |
| DOH Forms 4-x / 10-x / 11 | HIM's actual external reporting (objective 5, "external compliance") |
| Historical snapshots | Monthly reports must not change after they are submitted |

### C. Fix these before the defense
The panel is likely to test these, and they are the ones most likely to embarrass:
- Updating Chapter 1 Scope & Limitations to match the code: aftercare phase, DOH form generation, and permissions being role-based and hard-coded rather than a configurable screen.
- Issues **6, 7** (a completion certificate or Completer discharge can be issued without meeting the requirements) and the **certificate archive bug**. A panelist clicking around can trigger these.
- **13** (an expired session leaves the user on a broken page). This happens naturally during a long demo.
- §7 document errors (citation mix-up, duplicated Development paragraph, 1 transcript vs 5 respondents).
- Questions to rehearse: *"Why does the backend change its own schema?"*, *"What happens if two staff save a patient at the same time?"* (issue 11), *"How is patient data protected under RA 10173?"*, *"Where are your test results?"* (issue 18).
