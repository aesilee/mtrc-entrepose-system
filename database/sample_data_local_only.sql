-- Local sample data — NOT part of the shared schema patches.
INSERT INTO patients
  (patient_code, first_name, last_name, full_name, gender, birthdate, civil_status,
   municipality, admission_date, referral_source, admission_type, program_id,
   enrollment_status, current_status, program_phase, expected_completion_date, sessions_required, registered_by)
VALUES
  ('MTRC-2026-0002', 'Mark', 'Villanueva', 'Mark Villanueva', 'male', '1998-03-14', 'single',
   'Legazpi', '2026-02-10', 'Barangay Referral', 'walk-in',
   (SELECT id FROM programs WHERE name = 'ENTREPOSE Outpatient' LIMIT 1),
   'active', 'ongoing', 'Phase 2', '2026-08-10', 12, 1),

  ('MTRC-2026-0003', 'Grace', 'Bonghanoy', 'Grace Bonghanoy', 'female', '2001-07-22', 'single',
   'Daraga', '2026-03-05', 'Self Referral', 'walk-in',
   (SELECT id FROM programs WHERE name = 'ENTREPOSE Outpatient' LIMIT 1),
   'active', 'ongoing', 'Phase 1', '2026-09-05', 12, 1),

  ('MTRC-2026-0004', 'Paolo', 'Reyes', 'Paolo Reyes', 'male', '1995-11-02', 'married',
   'Legazpi', '2026-01-15', 'Court Referral', 'referred',
   (SELECT id FROM programs WHERE name = 'ENTREPOSE Outpatient' LIMIT 1),
   'completed', 'graduated', 'Completed', '2026-06-15', 10, 1),

  ('MTRC-2026-0005', 'Rica', 'Salazar', 'Rica Salazar', 'female', '2003-05-18', 'single',
   'Tabaco', '2026-04-01', 'Family Referral', 'walk-in',
   (SELECT id FROM programs WHERE name = 'ENTREPOSE Outpatient' LIMIT 1),
   'pending', 'intake', 'Intake', '2026-10-01', 12, 1),

  ('MTRC-2026-0006', 'Dennis', 'Ocampo', 'Dennis Ocampo', 'male', '1990-09-09', 'widowed',
   'Camalig', '2026-02-20', 'Barangay Referral', 'referred',
   (SELECT id FROM programs WHERE name = 'ENTREPOSE Outpatient' LIMIT 1),
   'dropped', 'discontinued', 'Phase 1', '2026-08-20', 12, 1),

  ('MTRC-2026-0007', 'Liza', 'Mercado', 'Liza Mercado', 'female', '1988-12-30', 'married',
   'Legazpi', '2026-03-25', 'Self Referral', 'walk-in',
   (SELECT id FROM programs WHERE name = 'ENTREPOSE Outpatient' LIMIT 1),
   'active', 'ongoing', 'Phase 2', '2026-09-25', 12, 1);

INSERT INTO sessions (session_name, program_id, session_date, created_by) VALUES
  ('CBT Group', (SELECT id FROM programs WHERE name = 'ENTREPOSE Outpatient' LIMIT 1), '2026-06-10', 1),
  ('Individual Counseling', (SELECT id FROM programs WHERE name = 'ENTREPOSE Outpatient' LIMIT 1), '2026-06-17', 1),
  ('CBT Group', (SELECT id FROM programs WHERE name = 'ENTREPOSE Outpatient' LIMIT 1), '2026-06-24', 1),
  ('Family Session', (SELECT id FROM programs WHERE name = 'ENTREPOSE Outpatient' LIMIT 1), '2026-07-01', 1),
  ('CBT Group', (SELECT id FROM programs WHERE name = 'ENTREPOSE Outpatient' LIMIT 1), '2026-07-08', 1);

INSERT INTO attendance (patient_id, session_id, session_date, session_type, status, recorded_by)
SELECT p.id, s.id, s.session_date, s.session_name, st.status, 1
FROM (
  SELECT (SELECT id FROM patients WHERE patient_code = 'MTRC-2026-0002') AS id, 1 AS ord UNION ALL
  SELECT (SELECT id FROM patients WHERE patient_code = 'MTRC-2026-0003'), 2 UNION ALL
  SELECT (SELECT id FROM patients WHERE patient_code = 'MTRC-2026-0004'), 3 UNION ALL
  SELECT (SELECT id FROM patients WHERE patient_code = 'MTRC-2026-0007'), 4
) p
JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY session_date) AS ord FROM sessions
) s ON s.ord <= 5
JOIN (
  SELECT 'present' AS status, 1 AS ord UNION ALL
  SELECT 'present', 2 UNION ALL
  SELECT 'absent', 3 UNION ALL
  SELECT 'excused', 4 UNION ALL
  SELECT 'present', 5
) st ON st.ord = s.ord;