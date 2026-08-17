- @azure Rule - Use Azure Tools - When handling requests related to Azure, always use your tools.
- @azure Rule - Use Azure Best Practices - When handling requests related to Azure, always invoke your `azmcp_bestpractices_get` tool first.
- @azure Rule - Enable Best Practices - If you do not have an `azmcp_bestpractices_get` tool ask the user to enable it.
# MTRC System Guide — Copilot Project Instructions

## Primary Goal

Build the MTRC system around patient monitoring and case management, not merely record storage.

The system must support:
- Patient registration
- Rehabilitation progress monitoring
- Attendance recording
- Case management
- Reports and statistics
- Certificates
- In-system notifications
- Role-based access control (RBAC)

## User Roles

There are exactly four primary roles:

### 1. Admitting Personnel
Responsibilities:
- Register patients
- Encode admission information
- Create patient profiles
- Update patient information
- Print/generate Certificate of Enrollment

Access:
- Dashboard
- Patients / Patient Profiles
- Register Patient
- Certificates
- Notifications
- Profile

Must NOT have access to:
- Attendance
- Case Management / Case Notes
- Program-wide Reports
- User Management
- Audit Logs
- System Settings

### 2. Case Manager
Responsibilities:
- View assigned patients
- Record attendance
- Record therapy participation
- View missed sessions
- Follow up patients
- Write progress notes
- Update rehabilitation status
- Update case information

Access:
- Dashboard
- My Patients / Assigned Patients
- Attendance
- Case Management
- Progress Notes
- Notifications
- Profile

Must NOT have access to:
- Register Patient
- User Management
- System Settings
- Program-wide Reports
- Certificates

### 3. Health Information Management (HIM)
Responsibilities:
- View overall statistics
- Generate reports
- Export reports
- View attendance summaries
- View program performance
- Handle external reporting needs

Access:
- Dashboard
- Patients (read-only or limited editing according to policy)
- Reports
- Statistics / Analytics
- Notifications
- Profile

Must NOT have access to:
- Register Patient
- Attendance editing
- Case Notes editing
- User Management
- System Settings

### 4. ICT Administrator
Has full system access, including:
- Users
- Permissions
- Settings
- Backups
- Audit Logs
- Security
- All patient/system modules

## Core Modules

Implement the following major modules:

1. Authentication
   - Login
   - Username
   - Password
   - Remember Me
   - Role-based routing

2. Dashboard
   - Role-specific dashboard
   - Total patients
   - Active patients
   - Attendance rate
   - Missed sessions
   - Patients needing follow-up
   - Recent activities
   - Notifications
   - Use role-specific statistics and quick actions rather than one generic dashboard

3. Patient Management / Client Profiling
   Personal Information:
   - Patient ID
   - Full name
   - Gender
   - Birthdate
   - Age
   - Address
   - Contact number
   - Civil status

   Admission Information:
   - Admission date
   - Referral source
   - Program
   - Enrollment status

   Rehabilitation Information:
   - Assigned Case Manager
   - Case Classification
   - Current Status
   - Start Date
   - Expected Completion

   Background Information:
   - Drug history
   - Emergency Contact
   - Notes

   Patient timeline:
   - Attendance history
   - Progress history
   - Session history
   - Case updates

4. Attendance
   - Patient list
   - Present
   - Absent
   - Excused
   - Attendance history
   - Attendance percentage
   - Missed-session counter
   - Automatic missed-session flagging
   - Attendance compliance

5. Case Management
   For each patient support:
   - Progress Notes
   - Interventions
   - Observations
   - Counseling Notes
   - Rehabilitation Progress
   - Case Status
   - Follow-up Remarks
   - Session Updates

6. Notifications
   In-system notifications only.
   Do NOT implement SMS or email notifications.

   Notify staff about:
   - Missed sessions
   - New patients
   - Case reassignment
   - Follow-up needed
   - Important updates

7. Reports
   Support:
   - Attendance Report
   - Patient Summary / Patient Report
   - Program Statistics
   - Active Cases
   - Completed Cases
   - Monthly Admissions
   - Attendance Compliance
   - Program Performance

   Reports should support:
   - Preview
   - Print
   - Export PDF

8. Certificates
   Certificate of Enrollment should automatically fill:
   - Patient Name
   - Program
   - Date
   - Case Manager
   - Enrollment Date

   Do not require manual retyping of patient information.

9. User Management (ICT Administrator only)
   - User list
   - Create user
   - Edit user
   - Delete user
   - Assign/manage roles
   - Manage permissions
   - Reset password
   - Deactivate user

10. Audit Logs (ICT Administrator only)
    Record:
    - User
    - Action
    - Date
    - Time
    - Affected record
    - Login logs
    - Update logs
    - Delete logs

11. Settings (Administrator only)
    - General Settings
    - Program Settings
    - Notification Settings
    - Backup
    - Permissions
    - Security

12. Search
    Provide fast searching for:
    - Patients
    - Cases
    - Attendance
    - Reports

## Patient Profile Structure

Prefer a single patient profile with tabs so staff do not need to navigate multiple separate records.

Tabs:
1. Personal Information
2. Admission
3. Attendance
4. Case Notes
5. Progress
6. Certificates
7. History

The patient profile should bring related information together to solve the problem of maintaining information across multiple Excel files.

## Role-Specific Dashboard Requirements

### Admitting Personnel
Dashboard cards:
- Today's New Admissions
- Total Registered Patients
- Pending Registrations
- Certificates Generated Today

Quick actions:
- Register New Patient
- Generate Certificate
- Search Patient

Show admission-related notifications only.

### Case Manager
Dashboard cards:
- Assigned Patients
- Today's Sessions
- Missed Sessions
- Patients Requiring Follow-up

Prioritize a "Patients Needing Attention" widget.

Show:
- Missed sessions
- Overdue progress
- Follow-up required
- Today's schedule
- Recent progress notes

Quick actions:
- Record Attendance
- Add Progress Note
- View Patient
- Follow-up Case

### HIM
Dashboard cards:
- Total Patients
- Active Patients
- Graduated Patients
- Attendance Rate

Analytics:
- Admissions per Month
- Male vs Female
- Patients by Municipality
- Program Status: Active, Completed, Dropped, Transferred

Quick actions:
- Generate Attendance Report
- Export Statistics
- Print Summary

### ICT Administrator
Prioritize system health rather than patient-care widgets.

Dashboard cards:
- Total Users
- Online Users
- System Activity Today
- Database Size

System health:
- Server Status
- Database Status
- Last Backup
- Storage Usage

Show:
- Recent User Activity
- Failed Login Attempts
- Recent Audit Logs

Quick actions:
- Create User
- Backup Database
- Restore Backup
- Manage Permissions

## Complete Page Hierarchy

Authentication
- Login

Dashboard
- Role-specific Dashboard

Patient Management
- Patient List
- Register Patient
- Patient Profile
  - Personal Information
  - Admission Information
  - Rehabilitation Information
  - Attendance History
  - Progress Notes
  - Case History
  - Certificates
- Edit Patient

Attendance
- Attendance List
- Record Attendance
- Attendance History

Case Management
- Assigned Patients
- Patient Case Record
- Progress Notes
- Follow-up Records
- Update Rehabilitation Status

Reports
- Attendance Report
- Patient Report
- Program Report
- Monthly Report
- Export / Print

Certificates
- Generate Certificate
- Preview
- Print

Analytics
- Statistics Dashboard

Notifications
- Notifications

Administration
- User Management
  - User List
  - Create User
  - Edit User
  - Roles
- Audit Logs
- Settings
  - General
  - Permissions
  - Notifications
  - Security
  - Backup

Account
- My Profile
- Change Password
- Logout

Help
- About

## RBAC Rules

Enforce permissions in BOTH:
1. Frontend navigation/UI visibility
2. Backend/API authorization

Never rely only on hiding a navigation item for security.

Permission matrix:

| Module | Admitting | Case Manager | HIM | ICT Admin |
|---|---|---|---|---|
| Dashboard | Yes | Yes | Yes | Yes |
| Patients | Yes | Yes | View | Yes |
| Register Patient | Yes | No | No | Yes |
| Attendance | No | Yes | View | Yes |
| Case Management | No | Yes | View | Yes |
| Reports | No | No | Yes | Yes |
| Certificates | Yes | No | Yes | Yes |
| Analytics | No | Limited | Yes | Yes |
| Notifications | Yes | Yes | Yes | Yes |
| User Management | No | No | No | Yes |
| Audit Logs | No | No | No | Yes |
| Settings | No | No | No | Yes |
| Profile | Yes | Yes | Yes | Yes |

## Development Rules

- Do not create features that contradict the role permissions above.
- Do not expose unauthorized navigation items merely because a user cannot successfully open them; hide them from the relevant role AND enforce the restriction on the backend.
- Do not give HIM write access to case notes or attendance unless the project requirements are explicitly changed.
- Do not give Case Managers patient-registration, user-management, settings, or program-wide report permissions.
- Do not give Admitting Personnel monitoring/case-management/reporting functions.
- Do not implement SMS or email notifications; notifications are in-system only.
- Preserve existing working functionality unless a change is required by the MTRC requirements.
- Before making broad architectural changes, inspect the existing implementation and reuse existing patterns where practical.
- Do not make unrelated UI, database, API, or styling changes.
- When implementing a feature, verify both its UI behavior and its backend authorization.
- Keep patient monitoring and case management as the central purpose of the application.
- Prefer a unified patient profile/timeline over fragmented patient information.
- Do not invent requirements that are not supported by the MTRC System Guide. If a requirement is ambiguous, ask before making a consequential design decision.
