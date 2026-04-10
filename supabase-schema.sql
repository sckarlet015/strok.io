-- Ejecutar en el SQL Editor de Supabase Dashboard
CREATE TABLE sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id text NOT NULL,
  user_id text NOT NULL,
  snapshots jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index para busquedas por room_id
CREATE INDEX idx_sessions_room_id ON sessions(room_id);

-- RLS (Row Level Security) - opcional para MVP
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert sessions"
  ON sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read sessions"
  ON sessions FOR SELECT
  USING (true);
