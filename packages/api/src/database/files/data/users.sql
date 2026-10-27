-- Local development user, seeded with every database setup (npm run db:setup:local), unless a
-- git-ignored users.local.sql with real accounts is present.
-- Email: dev@example.com / password: ChangeMe123!
-- Real accounts are created with the user CLI (npm run user -- create).
INSERT INTO public.users (email, name, password_hash)
VALUES ('dev@example.com', 'Dev', '$2b$12$nT8cBvhB.ttepFgKNt74AOalHg8HtwCaDuwn.0PsNVElsg0mzVxXi')
ON CONFLICT ON CONSTRAINT "UQ_users_email" DO NOTHING;
