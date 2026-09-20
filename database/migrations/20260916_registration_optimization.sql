-- ============================================================
-- Migration: Patient Registration & Intake Optimization
-- Date: 2026-09-16
-- Instructions: Paste and run in MySQL Workbench (Query > Execute)
-- All statements are safe to run on a live database.
-- ============================================================

-- 1. Add case_type column to patients
--    Defaults to 'substance_use' so all existing records are unaffected.
ALTER TABLE patients
  ADD COLUMN case_type ENUM('substance_use', 'general_outpatient')
    NOT NULL DEFAULT 'substance_use'
    AFTER patient_code;

-- 2. Add OPD number column to patients (nullable -- only set for general_outpatient)
ALTER TABLE patients
  ADD COLUMN opd_number VARCHAR(50) NULL
    AFTER pwud_code;

-- 3. Add attending_physician column to patients (nullable -- only set for general_outpatient)
ALTER TABLE patients
  ADD COLUMN attending_physician VARCHAR(100) NULL
    AFTER assigned_case_manager_id;

-- 4. Add comorbidities JSON column to patient_intakes
--    Stores structured medical/psychiatric comorbidity data as a JSON object.
ALTER TABLE patient_intakes
  ADD COLUMN comorbidities JSON NULL
    AFTER mse_remarks;

-- 5. Add general_medical_consent_signed to patient_intakes
--    Used only for general_outpatient case type during finalization.
ALTER TABLE patient_intakes
  ADD COLUMN general_medical_consent_signed TINYINT(1) NOT NULL DEFAULT 0
    AFTER data_privacy_consent_signed;

-- ============================================================
-- Verification: Run these SELECT statements to confirm success
-- ============================================================
-- SHOW COLUMNS FROM patients LIKE 'case_type';
-- SHOW COLUMNS FROM patients LIKE 'opd_number';
-- SHOW COLUMNS FROM patients LIKE 'attending_physician';
-- SHOW COLUMNS FROM patient_intakes LIKE 'comorbidities';
-- SHOW COLUMNS FROM patient_intakes LIKE 'general_medical_consent_signed';
