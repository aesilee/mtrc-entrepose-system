-- MTRC ENTREPOSE Information System
-- Initial schema: Phase 1 (Login & User Management)
-- Run this after creating the database:
--   CREATE DATABASE mtrc_entrepose;
--   USE mtrc_entrepose;
--   SOURCE schema.sql;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(20) UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admitting', 'case_manager', 'him_staff', 'ict_admin') NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  must_reset_password BOOLEAN NOT NULL DEFAULT TRUE,
  last_login DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Simple audit log, used by Settings > Audit Log later on
CREATE TABLE IF NOT EXISTS audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_username VARCHAR(50) NOT NULL,
  action VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tables below are placeholders for the modules you will cascade into next
-- (client profiling, attendance, case notes). Left empty on purpose so the
-- team can design them together once Login/User Management is working.
