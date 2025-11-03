INSERT INTO "public"."cohorts" (code, year)
VALUES
  ('K18', 2022),
  ('K19', 2023),
  ('K20', 2024),
  ('K21', 2025)
ON CONFLICT (code) DO UPDATE SET year = EXCLUDED.year;
