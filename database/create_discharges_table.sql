CREATE TABLE discharges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  program_type ENUM('residential','outpatient','aftercare','medical_detox') NOT NULL,
  discharge_type VARCHAR(50) NOT NULL,
  discharge_date DATE NOT NULL,
  remarks TEXT NULL,
  discharged_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);