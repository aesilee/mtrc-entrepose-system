# MTRC Source Spreadsheets vs System: Fidelity Review

*Reviewed 2026-11-15. This compares the three working files MTRC staff actually use against the code on branch `Huaa`, including uncommitted changes.*

| Source file | What it is | Implemented in |
|---|---|---|
| `OP CM TRACKER AUGUST 2026` (20 pp.) | Monthly per-client intervention tracker, census/discharge per CM, enrollments, non-completers, positive DT list, attendance rate per CM | `backend/src/services/opCmTrackerService.js`, `frontend/src/pages/OpCmTracker.jsx`, `frontend/src/utils/opCmTrackerExport.js` |
| `REPORTS-SEPT 2024` (29 pp.) | DOH statutory forms 4.1 A/B, 4.2 OP/Aftercare, 4.3 Parts I–VI, 10.1 (completion rate), 10.2 (discharges), 11 (illegal substance use) | `backend/src/services/dohReportService.js`, `frontend/src/components/dohReports/DohReportViews.jsx` |
| `TRAIS.xlsx` | DOH/DDB TRAIS "Drug Dependent Information" encoding template and its 30 lookup lists | `RegisterPatient.jsx`, `ReferralInformation.jsx`, `IntakeWorkflow.jsx`, `patientController.js`, `intakeController.js` |

**Verdict.** The **OP CM Tracker is the most faithful**: almost every column and summary block exists. Its main problems are how a few numbers are counted and the date columns. **The DOH forms have the right layout but several wrong formulas.** Form 4.3, 4.2 comorbidities and Form 11 would produce numbers MTRC could not submit. **TRAIS is partly covered:** most fields exist, but several dropdown lists differ from TRAIS, and some TRAIS fields are never captured.

Legend: ✅ matches · ⚠️ partly / different rule · ❌ wrong or missing

---

## 1. OP CM Tracker (August 2026)

### 1.1 Caseload grid: column by column

| # | Spreadsheet column | System field | Status | Note |
|---|---|---|---|---|
| 1 | PWUD CODE | `pwud_code` (`OP-<LGU>-<YY>-<seq>`) | ⚠️ | Format matches. **The prefix rule doesn't:** the sheet has OP-LEG-26-005 for a Rapu-rapu client, OP-LEG-26-002 for a Sorsogon client, OP-TAB-26-040 for a Guinobatan client, plus SOR/MAS prefixes. The system takes the prefix from the client's **home municipality** (`getLguCode`), and SOR and MAS become `OTH`. See Q1. |
| 2 | Name of client | `full_name` | ✅ | The non-completer sheet wants "LAST, FIRST, MI"; the system prints "First Middle Last" |
| 3–5 | Sex, LGU, CM | `gender`, `municipality`, effective CM (from assignment history) | ✅ | The sheet shows CM **surnames**; the system shows full names |
| 6 | Category (LGU-referred / Court-mandated / Voluntary) | `mapCategory()` | ❌ | Checks the word "voluntary" **first**. So *"Voluntary **with Court Order**"* becomes **Voluntary**, but DOH Form 4.1 (and the same system's DOH code) treats it as **Court-Mandated → Voluntary**. An **LGU-referred** client whose nature of confinement is "Voluntary without Court Order" also becomes **Voluntary**, so LGU referrals drop out of the census (the sheet has one on row 29). |
| 7 | Date Enrolled (full date) | `admission_date` | ✅ | |
| 8 | New Enrollee? (1/0) | admission in month | ✅ | |
| 9–13 | Date of PO, VLTS referral, Initial Assessment, Initial Tx Planning, Initial Progress Reporting ("write 0 if N/A") | milestones | ❌ | **In the sheet, a date appears only if the event happened in the tracked month** (e.g. only the August enrollees have August PO dates; everyone else has 0). The system prints the patient's **lifetime** date, so a January PO still shows on the August tracker. Assessment and Tx-planning first look for an event in the month, then **fall back** to the old date. |
| 14 | No. of Scheduled CBT Sessions | max(roster, attendance rows) | ✅ | |
| 15 | No. of CBT **Attended** Sessions (including CBT-E) | `credited` count | ⚠️ | The system counts only **credited** sessions. Late-beyond-grace and **repeated topics** are excluded. The sheet counts attendance. CBT-E is included ✅ (CBT-E topics use modality `CBT_GROUP`). |
| 16–17 | Scheduled / Attended PE (**"Meetings not Topics"**) | `credited` PE | ❌ | The header explicitly says to count meetings, not topics. The system de-duplicates by topic, so a repeated PE meeting counts as 0. |
| 18 | No. of SHGM (**Meetings not Topics**) | `credited` SHGM | ❌ | Same issue |
| 19–20 | Individual / Conjoint sessions | attendance by modality | ✅ | |
| 21 | No. of DT Conducted | `drug_test_logs` in month | ✅ | |
| 22–29 | Referral outside MTRC, Case Conference, Status Reporting, Home Visit, Follow-up Assessment, ACP Planning, PDC, Final Progress Reporting | interventions or milestones in month, **else lifetime date** | ❌ | Same "only if in this month" rule as 9–13. Follow-up assessment, ACP and Final Progress Report use the lifetime date only. |
| 30 | Interventions conducted w/in the month? (1/0) | sessions, interventions, consults, milestones or notes in month | ✅ | The note-count part never fires: `progress_notes.note_date` doesn't exist (§1.4) |
| 31–32 | Medical / Psychiatric comorbidity (1/0) | intake comorbidities (status ≠ none) | ✅ | |
| 33 | **Date** of Medical/Psychiatric/Dental consult within MTRC (M/P/D) | `consultTypeWithinMtrc` = "M, P" | ⚠️ | The sheet wants the **date** together with the letter (e.g. "August 4"). The export prints only the letters. |
| 34 | Name of comorbidity | `comorbidityDetails` ("HPN, Diabetes") | ✅ | Labels match the sheet's style (HPN, PD) |
| 35–37 | Date of Discharge, Status of Discharge, Remarks | latest `patient_discharges` | ✅ | |
| – | Date format "August 3" (year only for enrollment and discharge) | `YYYY-MM-DD` | ⚠️ | Cosmetic, but staff will notice |
| – | TOTAL row with M/F splits (e.g. "M-175; F-18") under the grid | – | ❌ | Not in the export |
| – | Remark: names with asterisk = 12-month mandated duration | `durationSummary` | ⚠️ | The data exists (duration basis), but there is no asterisk or marker in the grid or export |

### 1.2 Summary blocks

| Block (sheet p.) | Status | Note |
|---|---|---|
| CENSUS per CM × Voluntary/LGU/Court × M/F (p.5) | ⚠️ | Structure ✅. Uses month-end active census ✅, which matches the sheet's 73 = 74 managed − 1 completer. Counts are wrong where Category is wrong (row 6). Workplace referrals fold into Voluntary ✅, matching the DOH definition. |
| "No. of Cases Managed" per CM (p.1, 24/11/23/16 = 74) | ⚠️ | Computed (`casesManagedCensus`) but **not printed** in the export |
| DISCHARGE per CM: Completer / Non-compliance / Incarcerated / Medical / Referred × M/F (p.5) | ✅ | |
| NO. OF ENROLLMENT per CM (p.5) | ✅ | |
| **"OP FOR DIGS": OP-ACP 5, RES ACP 4, total 9** (p.5) | ❌ | Not implemented. See Q2. |
| List of Non-Completers (p.6) | ✅ | All 7 columns present |
| List of PWUDs with Positive DT (p.18) | ✅ | Including the "6 months above" label. One row is printed per *test*, so a client who tests positive twice appears twice. |
| **Summary of Clients' Attendance Rate per CM** (p.20) | ❌ | **Wrong formula.** The sheet's August facility total is 235 target / 193 actual = 82%. Those are exactly the grid's **Scheduled CBT** and **Attended CBT** totals, so **the rate is CBT-only**. The system's headline rate and the "STAFF PERFORMANCE" export use **CBT + PE**. A CBT-only rate exists in the UI toggle but isn't the default. |
| Attendance rate **per month Jan–Aug** (year-to-date) (p.20) and Target/Actual chart (p.19) | ❌ | The system only shows the selected month. There is no year-to-date table. |

### 1.3 What's good
Historical CM assignment (reports show the CM *at that time*), the active census vs cases-managed reconciliation, frozen official snapshots, archived patients kept in past months, and the export's sheet names (CASELOADS, CENSUS, NONCOMPLETER, (+) DT) all mirror the real workbook closely.

### 1.4 Queries that silently return nothing
These queries reference columns that exist **neither in the Nov 13 dump nor in any runtime migration**. Each is wrapped in `.catch(() => [[]])`, so the feature shows empty or zero instead of an error:

| Query | Missing column(s) | Effect |
|---|---|---|
| CBT-E evaluations in month | `patient_cbte_evaluations.cbt_session_reference`, `overall_relapse_risk` | **"CBT-E conducted" per CM is always 0** |
| Attendance traceability drill-down | `attendance.session_time`, `sessions.facilitator_id` | **The Attendance Traceability modal is always empty** |
| Unresolved-session drill-down | `sessions.start_time`, `sessions.facilitator_id` | Unresolved list is always empty. The *counts* still work, because they use a different query. |
| Progress notes in month | `progress_notes.note_date` (the table has `session_date` / `created_at`) | A progress note alone never marks "Intervention conducted" |

---

## 2. DOH Statutory Forms (Reports, Sept 2024)

| Form | Layout | Logic | Key problems |
|---|---|---|---|
| **4.1 A** Outpatient cases managed | ✅ New / Readmission / Recommitment × Court (Vol/Compulsory/Plea) / Non-court (Vol/LGU) × M/F, before-period, grand total | ⚠️ | **Recommitment is never detected:** the code looks for "recommit" in *nature of confinement* or notes, but the UI stores it in **admission type**, which this query never reads. **Readmission** depends on `prior_rehab_admissions > 0`, so a client marked "Readmission (Relapse)" with 0 prior admissions is counted as **New**. **"Cases before the month"** uses *today's* status (`enrollment_status='active'`), so last month's report changes after anyone is discharged. The query also doesn't filter `case_type`. |
| **4.1 B** Aftercare | ✅ | ❌ | A new aftercare enrollment is detected by the original **admission date** falling in the month. A client moves to aftercare months after admission, so the count is effectively always 0. There is no aftercare start date anywhere in the data model. |
| **4.2** Service provision (OP) | ✅ | ❌ | Counts `status='present'` only, so **late** attendees get no service credit. **Home Visit, ASI Interview and Program Orientation** are matched on attendance `session_type`, which can only be CBT_GROUP/PSYCHO_EDUCATION/SHGM/INDIVIDUAL/CONJOINT. These are really recorded as interventions/milestones, so the rows are **always 0**. **Conjoint** sessions go to "Family/Psycho-education"; the form puts them under "Individual/Conjoint". **Every referral in the month adds a "Medical assessment" and every ASSIST adds a "Brief intervention"**, which are made-up counts (MTRC's form shows 0 for both). The section subtotals the form requires are not computed. |
| **4.2** Aftercare | ✅ | ⚠️ | SIBOL virtual, PDC, case conference, family support are never filled |
| **4.3** Parts I–V (age × civil status, employment, residence × education, substance × duration, readmissions) | ✅ | ❌ | The form says *"Data to be reflected are **new admission and enrollment** PWUDs of the rating period"*. MTRC's Sept 2024 tables total **4** (= the 4 new enrollees). The system counts **every patient ever admitted** up to month-end, including discharged ones. |
| 4.3 Part II Employment | | ❌ | The registration dropdown offers **Government** and **Private**. The mapper only knows "self/employ/stud/other", so both are counted as **Unemployed**. "Self-Employed" isn't offered at registration at all. |
| 4.3 Part III Education | | ❌ | Registration offers "Elementary **level**", "High school **level**", "College **level**". The mapper looks for "under", so all *level* values are counted as **graduates**. Urban/Rural is hard-coded: only Legazpi, Daraga and Tabaco are urban, so Ligao City, Sorsogon City and Masbate City are rural. |
| 4.3 Part IV Substance × duration | | ❌ | The form's buckets are <1y, 1–2y11m, 3–4y11m, 5–6y11m, … 11y+. Intake stores **TRAIS buckets** (`under_2_years`, `2_to_4`, `4_to_6`, `6_or_more`), which cannot be converted: `under_2_years` → *Unknown*, `4_to_6` → 3–4y, `6_or_more` → 5–6y. Counting is also **per substance row, not per patient**, so a 3-drug user is counted 3 times and the **POLY-USERS** column is never used. |
| 4.3 Part VI Comorbidities | ✅ | ❌ | Intake saves *all ~22 conditions* as keys (value `""`/`none`/`managed_in_facility`/`referred_externally`). The report uses `Object.keys()`, so **every patient with an intake is counted for every listed condition**, whatever the value. Matching on the first 5 letters makes "hypertension" also count as **Hyperthyroidism**. Any psychiatric match adds +1 to **all 6** psychiatric rows. Everything goes in "Managed within facility"; the *referred* value is ignored, and there's no "referred back to attending physician" option to capture. |
| **10.1** Completion rate (quarterly) | ✅ quarters, target/actual/non-completers/rate | ⚠️ | Target = admitted exactly 7 months before the quarter. That ignores the system's own **patient-specific durations** (12-month court mandates, extensions), even though `expected_completion_date` exists. Completers aren't limited to the target cohort or to outpatients. **Extendees** (in the form's remarks) aren't tracked. The **Aftercare completion pages** (OP-ACP 9-month and Residential-ACP 18-month, with skills/education/employment) are not implemented. |
| **10.2** Discharges | ⚠️ | ⚠️ | List A should **exclude completers** (MTRC's OP list says "NONE" while 6 graduated; the form notes completers are not included in discharges); the system lists everyone. The consolidated reasons need **RARA, Early Release, Turned Over per Court Order, Escape, Non-Compliance, Death, Others, Referred, Buy-bust, Graduate**; the system has 6 rows. **Referred** ("Referred to Residential…") and **Buy-bust/Incarcerated** fall into *Non-compliance*. |
| **11** Illegal substance use while enrolled | ⚠️ windows 60/120/180/>180 ✅ | ❌ | DOH counts **PWUDs** (per client, month-by-month M/T/E/C/O/A flags, Yes/No). Its **denominator is "PWUDs newly enrolled within 180 days before the rating period"** (MTRC: 45). The system counts **tests**, and its rate is positive tests ÷ tests. A completely different measure. There is also no per-PWUD month-1/month-2 matrix. |

---

## 3. TRAIS encoding template

### 3.1 Field coverage

| TRAIS section | Covered | Missing / different |
|---|---|---|
| Personal (name, ext. name, DOB, gender, permanent address PSGC, civil status, religion, nationality) | ✅ mostly | **Place of Birth** (no column), **Foreign Address**. Gender has no **LGBT** option (TRAIS has it; the DB enum's `other` could hold it). |
| Family background (father, mother maiden name, spouse, occupations, siblings, ordinal position, family income, living arrangement) | ✅ mostly | **Spouse's Address**, **Middle Child Position** |
| Education and employment | ⚠️ | **No. of Years in School**, **Year of Last Attendance**. "Profession" maps to occupation. |
| Drug use info | ⚠️ | **Means to Support Drug Habit**, **Area where drugs are used**, **Province/City of drug source** and estimated daily expense exist as **DB columns but have no input in the intake screen**, so they are never captured. TRAIS asks *Year* of last drug use; the system stores a full date ✅. |
| Drug/substance table (type, mode, frequency, amount, quantity, measurement) | ✅ | |
| Hospitalization (count, hospital, year, nature) | ✅ | |
| Admission info (date, type, type of service, nature of confinement, physician, escapes, **reason for escape**, type of patient) | ⚠️ | **Reason for escape** missing |

### 3.2 Dropdown lists vs TRAIS lookups

Values must match TRAIS exactly so HIM can transcribe or upload without re-coding.

| List | TRAIS | System | Status |
|---|---|---|---|
| Educational attainment | 12 (incl. ALS, Jr./Senior High, No Schooling) | 8, worded differently | ❌ |
| Employment status | 10 (Government, Private, Businessman L/S, Professional, Student, OSY, PWD, Pensioner, No Occupation) | 5 (Employed, Unemployed, Student, Government, Private) | ❌ |
| Civil status | Annulled, Divorced, Live-in, Married, Separated, Single, Widow/er | lacks Annulled | ⚠️ |
| Living arrangement | 7 | 4 (lacks With Friends, Live-in Partner, Spouse & Children) | ⚠️ |
| Religion | 20 | 7 | ⚠️ |
| Admission type | New Admission, Readmit-Relapse, **Readmit-Escape** | New, Readmission (Relapse), **Recommitment** | ⚠️ |
| Nature of confinement | 11 (incl. Surrenderer, Safekeeping, Rescued Street Children, Readmission) | 6 | ⚠️ |
| Type of service | Residential / Non-residential / Residential w/ OP | OP (ENTREPOSE) / Aftercare | ⚠️ (TRAIS value would be "Non-residential") |
| Measurement | ampule, gram/s, mg, ml, stick/s, tablet, vial | Sachet, Stick, Gram, Tablet, Ampule | ⚠️ |
| Frequency, length of use, route, drug types | match | | ✅ |

---

## 4. Fix list (in priority order)

**A. Numbers submitted to DOH: wrong today**
1. Form 4.3 Parts I–V: limit to **patients newly enrolled in the month**.
2. Form 4.3 Part VI: count a condition only when its value is `managed_in_facility` / `referred_externally`. Map each intake key explicitly (no 5-letter prefix match). Fix the psychiatric loop. Use the disposition for the three columns.
3. Employment and education mappers: map the actual dropdown values. Better still, switch the dropdowns to the TRAIS lists and map those.
4. Form 4.3 Part IV: capture **years of use**, or derive it from age at first use and last use date. Count per patient, with poly-users.
5. Form 11: count per PWUD, with denominator = newly enrolled within 180 days before the period.
6. Form 4.2: count `present` + `late`. Take Home Visit/ASI/PO from interventions and milestones. Move Conjoint to Individual/Conjoint. Remove the made-up Medical-assessment and Brief-intervention counts.
7. Form 4.1: read `admission_type` for Readmission/Recommitment. Work out "cases before month" from status history (the system already has `patient_status_history`).
8. Form 10.2: exclude completers from List A and add the missing reason rows. Form 10.1: use `expected_completion_date` for the target.

**B. OP CM Tracker: differs from the sheet staff check against**
9. Attendance rate = **CBT scheduled vs CBT attended**. Add the Jan–Dec per-month table.
10. Print milestone and intervention dates **only if they fall in the month**, otherwise 0.
11. Count PE and SHGM *meetings* (attended), not credited topics. Decide with MTRC whether CBT "attended" means credited or present.
12. Fix `mapCategory` so court-ordered voluntary → Court-mandated and LGU referral → LGU-Referred. Reuse the DOH classifier so both reports agree.
13. Fix or remove the four silently failing queries (§1.4).
14. Add the TOTAL M/F row, the "No. of Cases Managed" row, consult dates, the 12-month marker, and "Month D" date format to the export.

**C. TRAIS completeness**
15. Add inputs for means to support, area of use and source province/city (the columns already exist).
16. Add place of birth, years in school, last school year, spouse address and reason for escape. Align the dropdowns to TRAIS values.

---

## 5. Questions for the team

1. **PWUD code prefix:** what decides LEG / TAB / LIG / SOR / MAS? It isn't the client's municipality (a Rapu-rapu client has OP-**LEG**-26-005). Is it the referring court (RTC station), or the satellite office/CM area?
2. **"OP FOR DIGS"** (OP-ACP 5, RES ACP 4, total 9) on the census page: what does DIGS stand for, and is it in scope?
3. **CBT "attended"** on the tracker: should a late-beyond-grace or repeated-topic session count as attended? It doesn't earn curriculum credit, but the sheet seems to count attendance.
4. **Aftercare sections** of Forms 4.1 B, 4.2 and 10.1: build them, or mark them "manual / out of scope" as the proposal's limitations say?
