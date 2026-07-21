-- Patch 002: Core modules (Client Profiling, Attendance, Case Management,
-- Certificates, Reports) reconstructed from the backend controllers.
-- Review this with your leader/team before merging into the shared repo.

-- 1. Small fix to audit_log
ALTER TABLE audit_log
  ADD COLUMN table_name VARCHAR(50) NULL AFTER action,
  ADD COLUMN record_id INT NULL AFTER table_name;

-- 2. Programs
CREATE TABLE IF NOT EXISTS programs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Patients
CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_code VARCHAR(30) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  gender ENUM('male', 'female', 'other') NOT NULL,
  birthdate DATE NOT NULL,
  civil_status ENUM('single', 'married', 'widowed', 'separated') NOT NULL DEFAULT 'single',
  contact_number VARCHAR(20) NULL,
  email VARCHAR(150) NULL,
  address VARCHAR(255) NULL,
  municipality VARCHAR(100) NULL,
  photo_url VARCHAR(255) NULL,
  emergency_contact_name VARCHAR(150) NULL,
  emergency_contact_relationship VARCHAR(100) NULL,
  emergency_contact_number VARCHAR(20) NULL,
  admission_date DATE NULL,
  referral_source VARCHAR(150) NULL,
  admission_type VARCHAR(100) NULL,
  program_id INT NULL,
  assigned_case_manager_id INT NULL,
  admission_notes TEXT NULL,
  initial_assessment TEXT NULL,
  case_classification VARCHAR(100) NULL,
  initial_status VARCHAR(50) NULL,
  current_status VARCHAR(50) NULL,
  enrollment_status ENUM('pending', 'active', 'completed', 'dropped', 'transferred') NOT NULL DEFAULT 'pending',
  program_phase VARCHAR(100) NULL,
  rehab_start_date DATE NULL,
  expected_completion_date DATE NULL,
  sessions_required INT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  registered_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_case_manager_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_name VARCHAR(150) NOT NULL,
  program_id INT NULL,
  case_manager_id INT NULL,
  session_date DATE NOT NULL,
  session_time TIME NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
  FOREIGN KEY (case_manager_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  session_id INT NULL,
  session_date DATE NOT NULL,
  session_type VARCHAR(100) NULL,
  status ENUM('present', 'absent', 'excused', 'late') NOT NULL,
  notes VARCHAR(255) NULL,
  recorded_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 6. Progress notes
CREATE TABLE IF NOT EXISTS progress_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  case_manager_id INT NULL,
  session_date DATE NOT NULL,
  session_type VARCHAR(100) NULL,
  observation TEXT NOT NULL,
  intervention_provided TEXT NULL,
  patient_response TEXT NULL,
  recommendations TEXT NULL,
  next_follow_up_date DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (case_manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. Follow-ups
CREATE TABLE IF NOT EXISTS follow_ups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  assigned_to INT NULL,
  reason VARCHAR(255) NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('pending', 'completed') NOT NULL DEFAULT 'pending',
  completed_remarks VARCHAR(255) NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- 8. Certificates
CREATE TABLE IF NOT EXISTS certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  certificate_type VARCHAR(50) NOT NULL DEFAULT 'completion',
  patient_name VARCHAR(255) NOT NULL,
  patient_code VARCHAR(30) NOT NULL,
  program_name VARCHAR(150) NULL,
  admission_date DATE NULL,
  completion_date DATE NULL,
  prepared_by_name VARCHAR(150) NULL,
  remarks VARCHAR(255) NULL,
  issued_by INT NULL,
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 9. Generated reports
CREATE TABLE IF NOT EXISTS generated_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  date_range_label VARCHAR(100) NULL,
  date_from DATE NULL,
  date_to DATE NULL,
  case_manager_id INT NULL,
  program_status VARCHAR(50) NULL,
  patient_id INT NULL,
  stats_json JSON NULL,
  chart_json JSON NULL,
  rows_json JSON NULL,
  generated_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_manager_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);