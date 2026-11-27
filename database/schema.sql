-- MTRC ENTREPOSE PMIS: full database schema (structure only, no patient data).
-- Exported from the working database after all runtime migrations had run (2026-11-27).
-- Setup: CREATE DATABASE mtrc_entrepose; then run this file, then seed_reference.sql.


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `archives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `archives` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int NOT NULL,
  `entity_label` varchar(255) DEFAULT NULL,
  `reason` text,
  `archived_by` int DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `restored_at` timestamp NULL DEFAULT NULL,
  `restored_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `archived_by` (`archived_by`),
  KEY `restored_by` (`restored_by`),
  KEY `idx_archives_entity` (`entity_type`,`entity_id`),
  KEY `idx_archives_active` (`entity_type`,`restored_at`),
  CONSTRAINT `archives_ibfk_1` FOREIGN KEY (`archived_by`) REFERENCES `users` (`id`),
  CONSTRAINT `archives_ibfk_2` FOREIGN KEY (`restored_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `session_id` int DEFAULT NULL,
  `session_date` date NOT NULL,
  `session_type` enum('CBT_GROUP','PSYCHO_EDUCATION','SHGM','INDIVIDUAL_COUNSELING','CONJOINT_FAMILY') NOT NULL,
  `topic_id` int DEFAULT NULL,
  `topic_name` varchar(255) DEFAULT NULL,
  `facilitator_name` varchar(150) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'present',
  `relapse_risk` varchar(40) NOT NULL DEFAULT 'SAFE',
  `staff_risk_assessment` varchar(40) DEFAULT NULL,
  `drug_test_result` varchar(40) DEFAULT NULL,
  `family_attended` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Family member participation in PE session',
  `family_member_name` varchar(150) DEFAULT NULL COMMENT 'Name of attending family member',
  `is_chairperson` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'SHGM NA 12-Step Chairperson designation',
  `recorded_by` int DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completion_status` varchar(30) NOT NULL DEFAULT 'CREDITED',
  `curriculum_requirement` varchar(180) DEFAULT NULL,
  `arrival_time` varchar(20) DEFAULT NULL,
  `decision_reason` varchar(255) DEFAULT NULL,
  `authorized_by` int DEFAULT NULL,
  `authorized_by_name` varchar(150) DEFAULT NULL,
  `is_makeup` tinyint(1) NOT NULL DEFAULT '0',
  `makeup_for_attendance_id` int DEFAULT NULL,
  `is_duplicate_topic` tinyint(1) NOT NULL DEFAULT '0',
  `reviewed_at` datetime DEFAULT NULL,
  `is_carryover` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `patient_id` (`patient_id`),
  KEY `recorded_by` (`recorded_by`),
  KEY `session_id` (`session_id`),
  KEY `idx_session_date` (`session_date`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`),
  CONSTRAINT `attendance_ibfk_3` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `actor_username` varchar(50) NOT NULL,
  `action` varchar(500) DEFAULT NULL,
  `table_name` varchar(50) DEFAULT NULL,
  `record_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_actor` (`actor_username`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `backups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `backups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `status` enum('success','failed') DEFAULT 'success',
  `size_mb` decimal(10,2) DEFAULT NULL,
  `triggered_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `triggered_by` (`triggered_by`),
  CONSTRAINT `backups_ibfk_1` FOREIGN KEY (`triggered_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `certificate_issuances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `certificate_issuances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `certificate_type` enum('ENROLLMENT','COMPLETION') NOT NULL,
  `certificate_control_no` varchar(50) NOT NULL,
  `issued_date` date NOT NULL,
  `issued_by` int NOT NULL,
  `signatory_name` varchar(100) DEFAULT NULL,
  `remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `certificate_control_no` (`certificate_control_no`),
  KEY `patient_id` (`patient_id`),
  KEY `issued_by` (`issued_by`),
  CONSTRAINT `certificate_issuances_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `certificate_issuances_ibfk_2` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `certificates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `certificates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `certificate_type` varchar(50) DEFAULT 'enrollment',
  `issued_by` int NOT NULL,
  `issued_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `patient_name` varchar(150) DEFAULT NULL,
  `patient_code` varchar(20) DEFAULT NULL,
  `program_name` varchar(150) DEFAULT NULL,
  `admission_date` date DEFAULT NULL,
  `completion_date` date DEFAULT NULL,
  `prepared_by_name` varchar(150) DEFAULT NULL,
  `remarks` text,
  `is_archived` tinyint(1) DEFAULT '0',
  `archived_at` timestamp NULL DEFAULT NULL,
  `archived_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `patient_id` (`patient_id`),
  KEY `issued_by` (`issued_by`),
  KEY `archived_by` (`archived_by`),
  CONSTRAINT `certificates_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `certificates_ibfk_2` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`),
  CONSTRAINT `certificates_ibfk_3` FOREIGN KEY (`archived_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `court_progress_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `court_progress_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `report_type` enum('INITIAL','MIDTERM','FINAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_control_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `court_branch` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `criminal_case_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `presiding_judge` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `report_date` date NOT NULL,
  `prepared_by` int NOT NULL,
  `attendance_summary_json` json DEFAULT NULL,
  `drug_test_summary_json` json DEFAULT NULL,
  `clinical_progress_narrative` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `case_manager_recommendation` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `report_control_no` (`report_control_no`),
  KEY `idx_cpr_patient` (`patient_id`),
  KEY `prepared_by` (`prepared_by`),
  CONSTRAINT `court_progress_reports_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `court_progress_reports_ibfk_2` FOREIGN KEY (`prepared_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `discharges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `discharges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `program_type` enum('residential','outpatient','aftercare','medical_detox') NOT NULL,
  `discharge_type` varchar(50) NOT NULL,
  `discharge_date` date NOT NULL,
  `remarks` text,
  `discharged_by` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `outcome` varchar(20) DEFAULT NULL,
  `reason_code` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_discharge_patient` (`patient_id`),
  KEY `idx_discharge_date` (`discharge_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `drug_test_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `drug_test_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `test_date` date NOT NULL,
  `test_time` time DEFAULT NULL,
  `test_type` varchar(50) DEFAULT 'Random Screening',
  `session_id` int DEFAULT NULL,
  `related_visit` varchar(180) DEFAULT NULL,
  `substance_tested` varchar(255) DEFAULT NULL,
  `positive_substances` varchar(150) DEFAULT NULL,
  `result` varchar(40) NOT NULL,
  `action_taken` varchar(255) DEFAULT NULL,
  `remarks` text,
  `recorded_by` int DEFAULT NULL,
  `tested_by_name` varchar(150) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_corrected` tinyint(1) NOT NULL DEFAULT '0',
  `correction_reason` text,
  `corrected_by` int DEFAULT NULL,
  `corrected_by_name` varchar(150) DEFAULT NULL,
  `corrected_at` datetime DEFAULT NULL,
  `previous_result` varchar(40) DEFAULT NULL,
  `previous_substance_tested` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `patient_id` (`patient_id`),
  CONSTRAINT `drug_test_logs_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `follow_ups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `follow_ups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `assigned_to` int NOT NULL,
  `reason` text,
  `remarks` text,
  `status` enum('pending','completed') DEFAULT 'pending',
  `due_date` date DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `completed_remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `patient_id` (`patient_id`),
  KEY `assigned_to` (`assigned_to`),
  CONSTRAINT `follow_ups_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `follow_ups_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `generated_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `generated_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `report_type` varchar(20) NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text,
  `date_range_label` varchar(100) DEFAULT NULL,
  `date_from` date DEFAULT NULL,
  `date_to` date DEFAULT NULL,
  `case_manager_id` int DEFAULT NULL,
  `program_status` varchar(20) DEFAULT NULL,
  `patient_id` int DEFAULT NULL,
  `stats_json` json DEFAULT NULL,
  `chart_json` json DEFAULT NULL,
  `rows_json` json DEFAULT NULL,
  `generated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_archived` tinyint(1) DEFAULT '0',
  `archived_at` timestamp NULL DEFAULT NULL,
  `archived_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `case_manager_id` (`case_manager_id`),
  KEY `patient_id` (`patient_id`),
  KEY `generated_by` (`generated_by`),
  KEY `archived_by` (`archived_by`),
  CONSTRAINT `generated_reports_ibfk_1` FOREIGN KEY (`case_manager_id`) REFERENCES `users` (`id`),
  CONSTRAINT `generated_reports_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `generated_reports_ibfk_3` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `generated_reports_ibfk_4` FOREIGN KEY (`archived_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recipient_id` int NOT NULL,
  `type` varchar(50) NOT NULL,
  `category` varchar(20) NOT NULL DEFAULT 'system',
  `message` text NOT NULL,
  `related_type` varchar(50) DEFAULT NULL,
  `related_id` int DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_recipient` (`recipient_id`,`is_read`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_case_management`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_case_management` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `date_of_initial_assessment` date DEFAULT NULL,
  `date_of_case_conference` date DEFAULT NULL,
  `milestone_1_date` date DEFAULT NULL,
  `milestone_2_date` date DEFAULT NULL,
  `milestone_3_date` date DEFAULT NULL,
  `milestone_4_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `program_orientation_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_patient_case_management_patient` (`patient_id`),
  CONSTRAINT `fk_patient_case_management_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_case_manager_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_case_manager_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `case_manager_id` int DEFAULT NULL,
  `case_manager_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'Initial Assignment',
  `assigned_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pcmh_pt_dates` (`patient_id`,`start_date`,`end_date`),
  KEY `idx_pcmh_cm` (`case_manager_id`),
  CONSTRAINT `patient_case_manager_history_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_cbte_evaluations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_cbte_evaluations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `evaluation_type` enum('CBTE_1','CBTE_2','CBTE_3') COLLATE utf8mb4_unicode_ci NOT NULL,
  `evaluation_date` date NOT NULL,
  `evaluator_id` int NOT NULL,
  `evaluator_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `form_basis` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SUPPLIED_ENTREPOSE_WORKSHEET',
  `approved_by_clinical_lead` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adaptation_notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `self_reported_status` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `staff_risk_assessment` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `worksheet_responses_json` json DEFAULT NULL,
  `recovery_domains_json` json DEFAULT NULL COMMENT '11 Recovery domain scores (1-5 Likert) for CBT-E 1',
  `coping_skills_json` json DEFAULT NULL COMMENT 'Relapse prevention skills checklist for CBT-E 2',
  `life_goals_text` text COLLATE utf8mb4_unicode_ci COMMENT 'Continuing recovery & aftercare goals for CBT-E 3',
  `overall_score` decimal(5,2) DEFAULT NULL,
  `clinical_judgment` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ON_TRACK',
  `evaluator_remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_carryover` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_cbte_patient` (`patient_id`),
  KEY `idx_cbte_type` (`evaluation_type`),
  KEY `evaluator_id` (`evaluator_id`),
  CONSTRAINT `patient_cbte_evaluations_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `patient_cbte_evaluations_ibfk_2` FOREIGN KEY (`evaluator_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_consult_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_consult_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `consult_date` date NOT NULL,
  `consult_type` varchar(30) NOT NULL DEFAULT 'M',
  `notes` text,
  `recorded_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_patient_consult_patient` (`patient_id`),
  KEY `fk_patient_consult_user` (`recorded_by`),
  KEY `idx_patient_consult_month` (`consult_date`,`patient_id`),
  CONSTRAINT `fk_patient_consult_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_patient_consult_user` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_discharges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_discharges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `discharge_date` date NOT NULL,
  `status` varchar(50) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `treatment_duration_months` int DEFAULT '0',
  `intervention_upon_discharge` text,
  `court_notified` tinyint(1) DEFAULT '0',
  `transition_to_aftercare` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `outcome` varchar(20) DEFAULT NULL,
  `reason_code` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `patient_id` (`patient_id`),
  CONSTRAINT `patient_discharges_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_duration_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_duration_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `change_type` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INITIAL_ENROLLMENT',
  `previous_duration_months` int DEFAULT NULL,
  `new_duration_months` int NOT NULL,
  `previous_extension_months` int NOT NULL DEFAULT '0',
  `new_extension_months` int NOT NULL DEFAULT '0',
  `extension_added_months` int NOT NULL DEFAULT '0',
  `previous_basis` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_basis` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'STANDARD_PROGRAM',
  `basis_detail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `agreed_start_date` date DEFAULT NULL,
  `previous_expected_completion_date` date DEFAULT NULL,
  `new_expected_completion_date` date DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `effective_date` date DEFAULT NULL,
  `approved_by_id` int DEFAULT NULL,
  `approved_by_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recorded_by_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `extension_months` int NOT NULL DEFAULT '0',
  `total_duration_months` int NOT NULL DEFAULT '7',
  `recorded_by` int DEFAULT NULL,
  `recorded_by_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pdh_patient` (`patient_id`),
  KEY `idx_pdh_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_hospitalizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_hospitalizations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `hospital_name` varchar(255) NOT NULL,
  `date_admitted` date DEFAULT NULL,
  `nature_of_event` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_patient_hospitalizations_patient` (`patient_id`),
  CONSTRAINT `fk_patient_hospitalizations_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_intakes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_intakes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `age_at_first_drug_use` tinyint unsigned DEFAULT NULL,
  `last_drug_use_date` date DEFAULT NULL,
  `length_of_use` enum('under_2_years','2_to_4_years','4_to_6_years','6_years_or_more') DEFAULT NULL,
  `frequency_of_use` enum('daily','2_to_5_weekly','weekly','monthly','occasionally') DEFAULT NULL,
  `primary_reason_for_using` text,
  `drug_source` varchar(150) DEFAULT NULL,
  `drugs_used` json DEFAULT NULL,
  `blood_pressure` varchar(20) DEFAULT NULL,
  `pulse_rate` smallint unsigned DEFAULT NULL,
  `respiratory_rate` smallint unsigned DEFAULT NULL,
  `temperature_celsius` decimal(4,1) DEFAULT NULL,
  `weight_kg` decimal(6,2) DEFAULT NULL,
  `socioeconomic_classification` enum('full_pay','c1','c2','c3') DEFAULT NULL,
  `mse_remarks` text,
  `comorbidities` json DEFAULT NULL,
  `service_agreement_signed` tinyint(1) NOT NULL DEFAULT '0',
  `pledge_of_commitment_signed` tinyint(1) NOT NULL DEFAULT '0',
  `data_privacy_consent_signed` tinyint(1) NOT NULL DEFAULT '0',
  `general_medical_consent_signed` tinyint(1) NOT NULL DEFAULT '0',
  `workflow_step` tinyint unsigned NOT NULL DEFAULT '3',
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `finalized_by` int DEFAULT NULL,
  `finalized_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `treatment_disposition` varchar(100) DEFAULT NULL,
  `means_to_support` varchar(100) DEFAULT NULL,
  `area_of_drug_use` varchar(100) DEFAULT NULL,
  `province_of_drug_source` varchar(100) DEFAULT NULL,
  `city_of_drug_source` varchar(100) DEFAULT NULL,
  `estimated_daily_drug_expense` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_patient_intakes_patient` (`patient_id`),
  KEY `idx_patient_intakes_workflow` (`workflow_step`),
  KEY `fk_patient_intakes_creator` (`created_by`),
  KEY `fk_patient_intakes_updater` (`updated_by`),
  KEY `fk_patient_intakes_finalizer` (`finalized_by`),
  CONSTRAINT `fk_patient_intakes_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_patient_intakes_finalizer` FOREIGN KEY (`finalized_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_patient_intakes_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_patient_intakes_updater` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_interventions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_interventions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `intervention_date` date NOT NULL,
  `intervention_type` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `consult_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `responsible_staff_id` int DEFAULT NULL,
  `responsible_staff_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_setting` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qualifies_for_monthly_tracker` tinyint(1) NOT NULL DEFAULT '1',
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `recorded_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_patient_date` (`patient_id`,`intervention_date`),
  KEY `idx_type` (`intervention_type`),
  CONSTRAINT `patient_interventions_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_milestone_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_milestone_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `milestone_key` varchar(50) NOT NULL,
  `milestone_date` date NOT NULL,
  `recorded_by` int DEFAULT NULL,
  `recorded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_patient_milestone` (`patient_id`,`milestone_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_milestones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_milestones` (
  `patient_id` int NOT NULL,
  `date_po` date DEFAULT NULL,
  `date_vlts_referral` date DEFAULT NULL,
  `date_referral_outside_mtrc` date DEFAULT NULL,
  `date_initial_assessment` date DEFAULT NULL,
  `date_initial_tx_planning` date DEFAULT NULL,
  `date_initial_progress_report` date DEFAULT NULL,
  `date_case_conference` date DEFAULT NULL,
  `date_status_reporting` date DEFAULT NULL,
  `date_home_visit` date DEFAULT NULL,
  `date_followup_assessment` date DEFAULT NULL,
  `date_acp_planning` date DEFAULT NULL,
  `date_pdc` date DEFAULT NULL,
  `date_final_progress_report` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`patient_id`),
  CONSTRAINT `patient_milestones_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_referral_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_referral_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `referral_id` int NOT NULL,
  `document_type` enum('court_order_lgu_letter','dde_result','chest_xray_medical_clearance','other') NOT NULL DEFAULT 'other',
  `original_name` varchar(255) NOT NULL,
  `mime_type` enum('application/pdf','image/jpeg','image/png') NOT NULL,
  `file_size` int unsigned NOT NULL,
  `file_data` longblob NOT NULL,
  `uploaded_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_referral_document_referral` (`referral_id`),
  KEY `idx_referral_document_uploader` (`uploaded_by`),
  CONSTRAINT `fk_referral_document_referral` FOREIGN KEY (`referral_id`) REFERENCES `patient_referrals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_referral_document_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_referrals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_referrals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `referral_source` varchar(100) DEFAULT NULL,
  `referring_organization` varchar(150) DEFAULT NULL,
  `referring_professional` varchar(150) DEFAULT NULL,
  `referral_date` date DEFAULT NULL,
  `reason_for_referral` text,
  `presenting_concern` text,
  `supporting_documents` text,
  `document_status` enum('pending','none_received','paper_copy','uploaded') NOT NULL DEFAULT 'pending',
  `recommended_program_id` int DEFAULT NULL,
  `referral_priority` enum('routine','urgent','emergency') NOT NULL DEFAULT 'routine',
  `admission_type` varchar(50) DEFAULT NULL,
  `type_of_service` varchar(100) DEFAULT NULL,
  `type_of_patient` varchar(100) DEFAULT NULL,
  `attending_physician` varchar(150) DEFAULT NULL,
  `nature_of_confinement` varchar(80) DEFAULT NULL,
  `prior_rehab_admissions` smallint unsigned NOT NULL DEFAULT '0',
  `number_of_escapes` smallint unsigned NOT NULL DEFAULT '0',
  `prior_drug_hospitalizations` smallint unsigned NOT NULL DEFAULT '0',
  `intake_assignee_id` int DEFAULT NULL,
  `status` enum('draft','ready_for_intake','returned_for_correction','intake_in_progress','intake_completed') NOT NULL DEFAULT 'draft',
  `created_by` int NOT NULL,
  `submitted_by` int DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `assist_risk_level` varchar(50) DEFAULT NULL,
  `dde_severity_diagnosis` varchar(50) DEFAULT NULL,
  `medical_clearance_status` varchar(50) DEFAULT NULL,
  `baseline_dt_date` date DEFAULT NULL,
  `baseline_dt_reference_number` varchar(100) DEFAULT NULL,
  `baseline_dt_meth` tinyint(1) DEFAULT NULL,
  `baseline_dt_thc` tinyint(1) DEFAULT NULL,
  `baseline_dt_other` tinyint(1) DEFAULT NULL,
  `baseline_dt_finding` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_patient_referral_patient` (`patient_id`),
  KEY `idx_referral_status` (`status`),
  KEY `idx_referral_priority` (`referral_priority`),
  KEY `idx_referral_program` (`recommended_program_id`),
  KEY `idx_referral_assignee` (`intake_assignee_id`),
  KEY `fk_referral_created_by` (`created_by`),
  KEY `fk_referral_submitted_by` (`submitted_by`),
  CONSTRAINT `fk_referral_assignee` FOREIGN KEY (`intake_assignee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_referral_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_referral_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_referral_program` FOREIGN KEY (`recommended_program_id`) REFERENCES `programs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_referral_submitted_by` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_status_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `enrollment_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `effective_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_psh_pt_dates` (`patient_id`,`effective_date`,`end_date`),
  CONSTRAINT `patient_status_history_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_substances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_substances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `drug_used` varchar(255) NOT NULL,
  `route_of_administration` varchar(100) NOT NULL,
  `frequency` varchar(50) DEFAULT NULL,
  `amount_spent` decimal(10,2) DEFAULT '0.00',
  `quantity` decimal(10,2) DEFAULT '0.00',
  `unit_of_measurement` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_primary_substance` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_patient_substances_patient` (`patient_id`),
  CONSTRAINT `fk_patient_substances_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_treatment_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_treatment_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `case_manager_id` int NOT NULL,
  `plan_date` date NOT NULL,
  `target_completion_date` date DEFAULT NULL,
  `problem_domains` json DEFAULT NULL,
  `primary_goals` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `intervention_modalities` json DEFAULT NULL,
  `relapse_prevention_plan` text COLLATE utf8mb4_unicode_ci,
  `client_agreed` tinyint(1) DEFAULT '1',
  `status` enum('active','revised','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `patient_id` (`patient_id`),
  KEY `case_manager_id` (`case_manager_id`),
  CONSTRAINT `patient_treatment_plans_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `patient_treatment_plans_ibfk_2` FOREIGN KEY (`case_manager_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_code` varchar(20) NOT NULL,
  `case_type` enum('substance_use','general_outpatient') NOT NULL DEFAULT 'substance_use',
  `pwud_code` varchar(30) DEFAULT NULL,
  `opd_number` varchar(50) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `suffix` varchar(20) DEFAULT NULL,
  `full_name` varchar(150) NOT NULL,
  `preferred_name` varchar(100) DEFAULT NULL,
  `gender` enum('male','female','other') NOT NULL,
  `birthdate` date NOT NULL,
  `address` text,
  `region` varchar(100) DEFAULT NULL,
  `municipality` varchar(150) DEFAULT NULL,
  `barangay` varchar(150) DEFAULT NULL,
  `street_address` varchar(255) DEFAULT NULL,
  `province` varchar(150) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `contact_number` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `photo_url` longtext,
  `civil_status` varchar(50) DEFAULT 'single',
  `employment_status` varchar(50) DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `occupation` varchar(150) DEFAULT NULL,
  `educational_attainment` varchar(100) DEFAULT NULL,
  `admission_date` date DEFAULT NULL,
  `referral_source` varchar(100) DEFAULT NULL,
  `admission_type` varchar(100) DEFAULT NULL,
  `admission_notes` text,
  `initial_assessment` text,
  `program_id` int DEFAULT NULL,
  `enrollment_status` enum('pending','active','completed','dropped','transferred') DEFAULT 'pending',
  `assigned_case_manager_id` int DEFAULT NULL,
  `attending_physician` varchar(100) DEFAULT NULL,
  `case_classification` varchar(100) DEFAULT NULL,
  `initial_status` varchar(100) DEFAULT NULL,
  `current_status` varchar(100) DEFAULT NULL,
  `program_phase` varchar(100) DEFAULT NULL,
  `sessions_required` int DEFAULT NULL,
  `rehab_start_date` date DEFAULT NULL,
  `expected_completion_date` date DEFAULT NULL,
  `drug_history` text,
  `emergency_contact_name` varchar(150) DEFAULT NULL,
  `emergency_contact_relationship` varchar(100) DEFAULT NULL,
  `emergency_contact_number` varchar(30) DEFAULT NULL,
  `emergency_contact_email` varchar(255) DEFAULT NULL,
  `emergency_contact_address` text,
  `emergency_contact_method` varchar(30) DEFAULT NULL,
  `guardian_name` varchar(150) DEFAULT NULL,
  `guardian_relationship` varchar(100) DEFAULT NULL,
  `guardian_contact_number` varchar(30) DEFAULT NULL,
  `guardian_address` text,
  `notes` text,
  `registered_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_archived` tinyint(1) DEFAULT '0',
  `archived_at` timestamp NULL DEFAULT NULL,
  `archived_by` int DEFAULT NULL,
  `religion` varchar(100) DEFAULT NULL,
  `living_arrangement` varchar(50) DEFAULT NULL,
  `estimated_family_monthly_income` decimal(12,2) DEFAULT NULL,
  `number_of_siblings` int DEFAULT NULL,
  `ordinal_position` varchar(50) DEFAULT NULL,
  `father_name` varchar(255) DEFAULT NULL,
  `father_occupation` varchar(150) DEFAULT NULL,
  `mother_name` varchar(255) DEFAULT NULL,
  `mother_occupation` varchar(150) DEFAULT NULL,
  `spouse_name` varchar(255) DEFAULT NULL,
  `spouse_occupation` varchar(150) DEFAULT NULL,
  `nature_of_confinement` varchar(50) DEFAULT NULL,
  `prior_rehab_admissions` int unsigned NOT NULL DEFAULT '0',
  `escape_count` int unsigned NOT NULL DEFAULT '0',
  `prior_drug_hospitalizations` int unsigned NOT NULL DEFAULT '0',
  `court_order_filename` varchar(255) DEFAULT NULL,
  `court_order_mime_type` varchar(100) DEFAULT NULL,
  `court_order_data` longtext,
  `dde_result_filename` varchar(255) DEFAULT NULL,
  `dde_result_mime_type` varchar(100) DEFAULT NULL,
  `dde_result_data` longtext,
  `age_at_first_drug_use` tinyint unsigned DEFAULT NULL,
  `last_drug_use_date` date DEFAULT NULL,
  `length_of_drug_use` varchar(20) DEFAULT NULL,
  `frequency_of_drug_use` varchar(30) DEFAULT NULL,
  `primary_drug_use_reason` text,
  `drug_source` varchar(150) DEFAULT NULL,
  `drugs_used_last_12_months` json DEFAULT NULL,
  `blood_pressure` varchar(20) DEFAULT NULL,
  `pulse_rate` smallint unsigned DEFAULT NULL,
  `temperature_celsius` decimal(4,1) DEFAULT NULL,
  `weight_kg` decimal(6,2) DEFAULT NULL,
  `socio_economic_classification` varchar(20) DEFAULT NULL,
  `service_agreement_signed` tinyint(1) NOT NULL DEFAULT '0',
  `pledge_of_commitment_signed` tinyint(1) NOT NULL DEFAULT '0',
  `data_privacy_consent_signed` tinyint(1) NOT NULL DEFAULT '0',
  `finalized_at` datetime DEFAULT NULL,
  `required_duration_months` int NOT NULL DEFAULT '7',
  `duration_basis` varchar(50) NOT NULL DEFAULT 'STANDARD_PROGRAM',
  `duration_basis_detail` varchar(255) DEFAULT NULL,
  `extension_months` int NOT NULL DEFAULT '0',
  `referral_category` varchar(30) DEFAULT NULL,
  `admission_category` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `patient_code` (`patient_code`),
  UNIQUE KEY `uq_pwud_code` (`pwud_code`),
  KEY `program_id` (`program_id`),
  KEY `assigned_case_manager_id` (`assigned_case_manager_id`),
  KEY `registered_by` (`registered_by`),
  KEY `archived_by` (`archived_by`),
  KEY `idx_admission_date` (`admission_date`),
  CONSTRAINT `patients_ibfk_1` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`),
  CONSTRAINT `patients_ibfk_2` FOREIGN KEY (`assigned_case_manager_id`) REFERENCES `users` (`id`),
  CONSTRAINT `patients_ibfk_3` FOREIGN KEY (`registered_by`) REFERENCES `users` (`id`),
  CONSTRAINT `patients_ibfk_4` FOREIGN KEY (`archived_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `programs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `programs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `progress_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `progress_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `session_date` date DEFAULT NULL,
  `session_type` varchar(100) DEFAULT NULL,
  `relapse_risk` varchar(40) NOT NULL DEFAULT 'SAFE',
  `staff_risk_assessment` varchar(40) DEFAULT NULL,
  `observation` text,
  `intervention_provided` text,
  `patient_response` text,
  `recommendations` text,
  `next_follow_up_date` date DEFAULT NULL,
  `case_manager_id` int NOT NULL,
  `note_type` enum('progress','intervention','observation','counseling') DEFAULT 'progress',
  `content` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `patient_id` (`patient_id`),
  KEY `case_manager_id` (`case_manager_id`),
  CONSTRAINT `progress_notes_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `progress_notes_ibfk_2` FOREIGN KEY (`case_manager_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `report_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_snapshots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `report_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OP_CM_TRACKER',
  `reporting_month` int NOT NULL,
  `reporting_year` int NOT NULL,
  `case_manager_id` int DEFAULT NULL,
  `case_manager_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `snapshot_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('OFFICIAL_ISSUED','SUPERSEDED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OFFICIAL_ISSUED',
  `version` int NOT NULL DEFAULT '1',
  `summary_json` json NOT NULL,
  `grid_json` json DEFAULT NULL,
  `issued_by` int NOT NULL,
  `issued_by_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT 'Staff Member',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `issued_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rs_period` (`report_type`,`reporting_year`,`reporting_month`,`case_manager_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `session_roster`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `session_roster` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `patient_id` int NOT NULL,
  `assigned_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_session_patient_roster` (`session_id`,`patient_id`),
  KEY `idx_roster_session` (`session_id`),
  KEY `idx_roster_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `session_topics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `session_topics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` enum('ORIENTATION','CBT','CBT_E','PE_PATIENT','PE_FAMILY','SHGM') COLLATE utf8mb4_unicode_ci NOT NULL,
  `topic_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `topic_number` int NOT NULL,
  `title_tagalog` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modality_type` enum('CBT_GROUP','PSYCHO_EDUCATION','SHGM','INDIVIDUAL_COUNSELING','CONJOINT_FAMILY') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `topic_code` (`topic_code`),
  KEY `idx_category` (`category`),
  KEY `idx_modality` (`modality_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_name` varchar(150) NOT NULL,
  `session_type` varchar(50) DEFAULT NULL,
  `topic_id` int DEFAULT NULL,
  `topic_name` varchar(255) DEFAULT NULL,
  `facilitator_name` varchar(150) DEFAULT NULL,
  `program_id` int DEFAULT NULL,
  `case_manager_id` int DEFAULT NULL,
  `session_date` date NOT NULL,
  `session_time` time DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `session_status` varchar(30) NOT NULL DEFAULT 'COMPLETED',
  `curriculum_requirement` varchar(180) DEFAULT NULL,
  `cancellation_reason` varchar(255) DEFAULT NULL,
  `rescheduled_to_session_id` int DEFAULT NULL,
  `rescheduled_date` date DEFAULT NULL,
  `rescheduled_reason` varchar(500) DEFAULT NULL,
  `original_session_id` int DEFAULT NULL,
  `original_session_date` date DEFAULT NULL,
  `authorized_by` int DEFAULT NULL,
  `authorized_by_name` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `program_id` (`program_id`),
  KEY `case_manager_id` (`case_manager_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`),
  CONSTRAINT `sessions_ibfk_2` FOREIGN KEY (`case_manager_id`) REFERENCES `users` (`id`),
  CONSTRAINT `sessions_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` mediumtext,
  `updated_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `system_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(20) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `contact_number` varchar(30) DEFAULT NULL,
  `full_name` varchar(150) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admitting','case_manager','him_staff','ict_admin') NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `must_reset_password` tinyint(1) NOT NULL DEFAULT '1',
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_active` timestamp NULL DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `birthdate` date DEFAULT NULL,
  `address` text,
  `password_changed_at` datetime DEFAULT NULL,
  `last_login_device` varchar(255) DEFAULT NULL,
  `photo_url` longtext,
  `failed_login_attempts` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `employee_id` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

