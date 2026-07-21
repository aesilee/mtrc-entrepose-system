-- Patch: adds columns/table that the backend code already expects
-- but that were missing from the committed Phase 1 schema.sql.
-- Safe to run — only ADDs columns/tables, does not drop or modify existing data.

ALTER TABLE users
  ADD COLUMN first_name VARCHAR(100) NULL AFTER employee_id,
  ADD COLUMN last_name VARCHAR(100) NULL AFTER first_name,
  ADD COLUMN gender ENUM('male', 'female', 'other') NULL AFTER role,
  ADD COLUMN birthdate DATE NULL AFTER gender,
  ADD COLUMN address VARCHAR(255) NULL AFTER birthdate,
  ADD COLUMN email VARCHAR(150) NULL AFTER address,
  ADD COLUMN contact_number VARCHAR(20) NULL AFTER email,
  ADD COLUMN photo_url VARCHAR(255) NULL AFTER contact_number,
  ADD COLUMN password_changed_at DATETIME NULL AFTER must_reset_password,
  ADD COLUMN last_login_device VARCHAR(255) NULL AFTER last_login;

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(50) PRIMARY KEY,
  setting_value VARCHAR(255) NULL,
  updated_by INT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);