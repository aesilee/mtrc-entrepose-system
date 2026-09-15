-- Database Migration for IDADIN Form 6-06 Enhancements
USE mtrc_entrepose;

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

-- patients table additions
CALL add_column_if_missing('patients', 'pwud_code', 'VARCHAR(50) NULL AFTER `patient_code`');
CALL add_column_if_missing('patients', 'region', 'VARCHAR(100) NULL AFTER `address`');
CALL add_column_if_missing('patients', 'barangay', 'VARCHAR(150) NULL AFTER `municipality`');
CALL add_column_if_missing('patients', 'street_address', 'VARCHAR(255) NULL AFTER `barangay`');

-- patient_referrals table additions
CALL add_column_if_missing('patient_referrals', 'type_of_service', 'VARCHAR(100) NULL AFTER `admission_type`');
CALL add_column_if_missing('patient_referrals', 'type_of_patient', 'VARCHAR(100) NULL AFTER `type_of_service`');
CALL add_column_if_missing('patient_referrals', 'attending_physician', 'VARCHAR(150) NULL AFTER `type_of_patient`');

-- patient_hospitalizations table
CREATE TABLE IF NOT EXISTS patient_hospitalizations (
  id INT NOT NULL AUTO_INCREMENT,
  patient_id INT NOT NULL,
  hospital_name VARCHAR(255) NOT NULL,
  date_admitted DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_patient_hospitalizations_patient (patient_id),
  CONSTRAINT fk_patient_hospitalizations_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- patient_substances table
CREATE TABLE IF NOT EXISTS patient_substances (
  id INT NOT NULL AUTO_INCREMENT,
  patient_id INT NOT NULL,
  drug_used VARCHAR(255) NOT NULL,
  route_of_administration ENUM('Orally', 'Smoking', 'Inhalation/Sniffing', 'Injection/Intravenous') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_patient_substances_patient (patient_id),
  CONSTRAINT fk_patient_substances_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- patient_case_management table
CREATE TABLE IF NOT EXISTS patient_case_management (
  id INT NOT NULL AUTO_INCREMENT,
  patient_id INT NOT NULL,
  milestone_1_date DATE NULL,
  milestone_2_date DATE NULL,
  milestone_3_date DATE NULL,
  milestone_4_date DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_patient_case_management_patient (patient_id),
  CONSTRAINT fk_patient_case_management_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Update patient_intakes socioeconomic_classification enum
ALTER TABLE patient_intakes MODIFY COLUMN socioeconomic_classification ENUM('full_pay', 'c1', 'c2', 'c3') NULL;

-- Also add mse_remarks to patient_intakes and respiratory_rate
CALL add_column_if_missing('patient_intakes', 'respiratory_rate', 'SMALLINT UNSIGNED NULL AFTER `pulse_rate`');
CALL add_column_if_missing('patient_intakes', 'mse_remarks', 'TEXT NULL AFTER `socioeconomic_classification`');

DROP PROCEDURE IF EXISTS add_column_if_missing;
