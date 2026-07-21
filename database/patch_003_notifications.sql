-- Patch 003: Notifications feature (merged from leader's AshDev branch)
-- Adds the notifications table and a failed_login_attempts column
-- that authController.js's login lockout logic expects.

ALTER TABLE users
  ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0 AFTER must_reset_password;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NULL,
  message VARCHAR(255) NOT NULL,
  related_type VARCHAR(50) NULL,
  related_id INT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);