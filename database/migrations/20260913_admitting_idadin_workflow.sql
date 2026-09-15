-- Admitting Personnel: five-step IDADIN registration workflow
-- Target: MySQL 8.0.46 (the version shown in Dump20260809.sql)
-- Select the mtrc_entrepose schema in MySQL Workbench before running this file.

USE mtrc_entrepose;

-- MySQL 8.0 does not support ADD COLUMN IF NOT EXISTS. This small helper
-- keeps the migration safe to run once on either the supplied dump or a
-- database where part of the registration work has already been applied.
DROP PROCEDURE IF EXISTS add_column_if_missing;
DELIMITER $$
CREATE PROCEDURE add_column_if_missing(
  IN table_name_value VARCHAR(64),
  IN column_name_value VARCHAR(64),
  IN column_definition_value TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = table_name_value
      AND column_name = column_name_value
  ) THEN
    SET @add_column_sql = CONCAT(
      'ALTER TABLE `', REPLACE(table_name_value, '`', '``'),
      '` ADD COLUMN `', REPLACE(column_name_value, '`', '``'),
      '` ', column_definition_value
    );
    PREPARE add_column_statement FROM @add_column_sql;
    EXECUTE add_column_statement;
    DEALLOCATE PREPARE add_column_statement;
  END IF;
END$$
DELIMITER ;

-- Step 1: Demographics (IDADIN Part A)
CALL add_column_if_missing('patients', 'suffix', 'VARCHAR(10) NULL AFTER `last_name`');
CALL add_column_if_missing('patients', 'preferred_name', 'VARCHAR(100) NULL AFTER `full_name`');
CALL add_column_if_missing('patients', 'nationality', 'VARCHAR(100) NULL AFTER `civil_status`');
CALL add_column_if_missing('patients', 'occupation', 'VARCHAR(150) NULL AFTER `nationality`');
CALL add_column_if_missing('patients', 'educational_attainment', 'VARCHAR(100) NULL AFTER `occupation`');
CALL add_column_if_missing('patients', 'religion', 'VARCHAR(100) NULL AFTER `educational_attainment`');
CALL add_column_if_missing('patients', 'living_arrangement', 'VARCHAR(50) NULL AFTER `religion`');
CALL add_column_if_missing('patients', 'estimated_family_monthly_income', 'DECIMAL(12,2) NULL AFTER `living_arrangement`');
CALL add_column_if_missing('patients', 'province', 'VARCHAR(150) NULL AFTER `municipality`');
CALL add_column_if_missing('patients', 'postal_code', 'VARCHAR(20) NULL AFTER `province`');
CALL add_column_if_missing('patients', 'emergency_contact_email', 'VARCHAR(255) NULL AFTER `emergency_contact_number`');
CALL add_column_if_missing('patients', 'emergency_contact_address', 'TEXT NULL AFTER `emergency_contact_email`');
CALL add_column_if_missing('patients', 'emergency_contact_method', 'VARCHAR(30) NULL AFTER `emergency_contact_address`');
CALL add_column_if_missing('patients', 'guardian_name', 'VARCHAR(150) NULL AFTER `emergency_contact_method`');
CALL add_column_if_missing('patients', 'guardian_relationship', 'VARCHAR(100) NULL AFTER `guardian_name`');
CALL add_column_if_missing('patients', 'guardian_contact_number', 'VARCHAR(30) NULL AFTER `guardian_relationship`');
CALL add_column_if_missing('patients', 'guardian_address', 'TEXT NULL AFTER `guardian_contact_number`');

-- Step 2: Admission & Confinement History (IDADIN Part C)
CREATE TABLE IF NOT EXISTS patient_referrals (
  id INT NOT NULL AUTO_INCREMENT,
  patient_id INT NOT NULL,
  referral_source VARCHAR(50) NULL,
  referring_organization VARCHAR(150) NULL,
  referring_professional VARCHAR(150) NULL,
  referral_date DATE NULL,
  reason_for_referral TEXT NULL,
  presenting_concern TEXT NULL,
  supporting_documents TEXT NULL,
  document_status ENUM('pending','none_received','paper_copy','uploaded') NOT NULL DEFAULT 'pending',
  recommended_program_id INT NULL,
  referral_priority ENUM('routine','urgent','emergency') NOT NULL DEFAULT 'routine',
  admission_type ENUM('voluntary','court_mandated','lgu_referred') NULL,
  nature_of_confinement ENUM('arrested','suspended_sentence','compulsory_ra_9165') NULL,
  prior_rehab_admissions SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  number_of_escapes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  prior_drug_hospitalizations SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('draft','ready_for_intake','returned_for_correction','intake_in_progress','intake_completed') NOT NULL DEFAULT 'draft',
  intake_assignee_id INT NULL,
  created_by INT NULL,
  submitted_by INT NULL,
  submitted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_patient_referrals_patient (patient_id),
  KEY idx_patient_referrals_status (status),
  CONSTRAINT fk_patient_referrals_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_patient_referrals_program FOREIGN KEY (recommended_program_id) REFERENCES programs(id) ON DELETE SET NULL,
  CONSTRAINT fk_patient_referrals_assignee FOREIGN KEY (intake_assignee_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_patient_referrals_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_patient_referrals_submitter FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CALL add_column_if_missing('patient_referrals', 'admission_type', 'ENUM(''voluntary'',''court_mandated'',''lgu_referred'') NULL AFTER `referral_priority`');
CALL add_column_if_missing('patient_referrals', 'nature_of_confinement', 'ENUM(''arrested'',''suspended_sentence'',''compulsory_ra_9165'') NULL AFTER `admission_type`');
CALL add_column_if_missing('patient_referrals', 'prior_rehab_admissions', 'SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER `nature_of_confinement`');
CALL add_column_if_missing('patient_referrals', 'number_of_escapes', 'SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER `prior_rehab_admissions`');
CALL add_column_if_missing('patient_referrals', 'prior_drug_hospitalizations', 'SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER `number_of_escapes`');

CREATE TABLE IF NOT EXISTS patient_referral_documents (
  id INT NOT NULL AUTO_INCREMENT,
  referral_id INT NOT NULL,
  document_type ENUM('court_order_lgu_letter','dde_result','other') NOT NULL DEFAULT 'other',
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  file_data LONGBLOB NOT NULL,
  uploaded_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_referral_documents_referral (referral_id),
  CONSTRAINT fk_referral_documents_referral FOREIGN KEY (referral_id) REFERENCES patient_referrals(id) ON DELETE CASCADE,
  CONSTRAINT fk_referral_documents_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CALL add_column_if_missing('patient_referral_documents', 'document_type', 'ENUM(''court_order_lgu_letter'',''dde_result'',''other'') NOT NULL DEFAULT ''other'' AFTER `referral_id`');

-- Steps 3-5: Drug Use History, Clinical Triage, and Consents
CREATE TABLE IF NOT EXISTS patient_intakes (
  id INT NOT NULL AUTO_INCREMENT,
  patient_id INT NOT NULL,
  age_at_first_drug_use TINYINT UNSIGNED NULL,
  last_drug_use_date DATE NULL,
  length_of_use ENUM('under_2_years','2_to_4_years','4_to_6_years','6_years_or_more') NULL,
  frequency_of_use ENUM('daily','2_to_5_weekly','weekly','monthly','occasionally') NULL,
  primary_reason_for_using TEXT NULL,
  drug_source VARCHAR(150) NULL,
  drugs_used JSON NULL,
  blood_pressure VARCHAR(20) NULL,
  pulse_rate SMALLINT UNSIGNED NULL,
  temperature_celsius DECIMAL(4,1) NULL,
  weight_kg DECIMAL(6,2) NULL,
  socioeconomic_classification ENUM('full_pay','c1','c2','indigent') NULL,
  service_agreement_signed BOOLEAN NOT NULL DEFAULT FALSE,
  pledge_of_commitment_signed BOOLEAN NOT NULL DEFAULT FALSE,
  data_privacy_consent_signed BOOLEAN NOT NULL DEFAULT FALSE,
  workflow_step TINYINT UNSIGNED NOT NULL DEFAULT 3,
  created_by INT NULL,
  updated_by INT NULL,
  finalized_by INT NULL,
  finalized_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_patient_intakes_patient (patient_id),
  KEY idx_patient_intakes_workflow (workflow_step),
  CONSTRAINT fk_patient_intakes_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_patient_intakes_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_patient_intakes_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_patient_intakes_finalizer FOREIGN KEY (finalized_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Existing certificate/archive code already expects these columns. They are
-- included here so Finalize & Enroll works against the supplied August dump.
CALL add_column_if_missing('certificates', 'is_archived', 'BOOLEAN NOT NULL DEFAULT FALSE AFTER `remarks`');
CALL add_column_if_missing('certificates', 'archived_at', 'DATETIME NULL AFTER `is_archived`');
CALL add_column_if_missing('certificates', 'archived_by', 'INT NULL AFTER `archived_at`');

DROP PROCEDURE IF EXISTS add_column_if_missing;

-- Optional verification queries. Each should return a row after the migration.
SHOW COLUMNS FROM patients LIKE 'religion';
SHOW COLUMNS FROM patient_referrals LIKE 'admission_type';
SHOW COLUMNS FROM patient_referral_documents LIKE 'document_type';
SHOW COLUMNS FROM patient_intakes LIKE 'workflow_step';
