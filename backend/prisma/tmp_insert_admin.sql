INSERT INTO "public"."accounts" (user_code, password, role)
VALUES ('admin', '$2a$10$bIO2vgYi7Fp3IwXn4ADGzO2RecZGGAwZuv2YvSOw/y7wYd52UNivq', 'admin')
ON CONFLICT (user_code) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role;
