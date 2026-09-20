-- UC-003 BR-003: los mensajes de vinculación no deben impedir borrar al usuario.
-- `create_all` no altera tablas existentes (NFR-013): aplicar una sola vez en Supabase y avisar al equipo.
ALTER TABLE wallet_messages DROP CONSTRAINT IF EXISTS wallet_messages_user_id_fkey;
ALTER TABLE wallet_messages
  ADD CONSTRAINT wallet_messages_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
