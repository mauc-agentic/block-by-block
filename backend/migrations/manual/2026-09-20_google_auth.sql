-- UC-001 A3 / UC-002 A3: soporte de registro/login con Google.
-- Ejecutar una vez en el SQL Editor de Supabase (o via psql) contra la BD real.
-- No aplicable via Base.metadata.create_all: solo crea tablas nuevas, no altera columnas
-- existentes (ver GAP-013 en docs/IMPLEMENTATION-STATUS.md).

ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'local';

ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
ALTER TABLE users ADD CONSTRAINT users_external_id_key UNIQUE (external_id);
CREATE INDEX IF NOT EXISTS ix_users_external_id ON users (external_id);
