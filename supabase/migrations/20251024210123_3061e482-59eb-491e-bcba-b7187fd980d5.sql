-- Create enum for user skill levels
CREATE TYPE skill_level AS ENUM ('Beginner', 'Intermediate', 'Advanced');

-- Create enum for session status
CREATE TYPE session_status AS ENUM ('waiting', 'active', 'completed');

-- Create matching queue table
CREATE TABLE matching_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_level skill_level NOT NULL,
  preferred_languages TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create coding sessions table
CREATE TABLE coding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status session_status DEFAULT 'active',
  code_content TEXT DEFAULT '// Start coding here...',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create session participants table
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES coding_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Create chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES coding_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE matching_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for matching_queue
CREATE POLICY "Users can insert their own queue entry"
  ON matching_queue FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all queue entries"
  ON matching_queue FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete their own queue entry"
  ON matching_queue FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for coding_sessions
CREATE POLICY "Users can view sessions they're in"
  ON coding_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_participants
      WHERE session_participants.session_id = coding_sessions.id
      AND session_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sessions they're in"
  ON coding_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_participants
      WHERE session_participants.session_id = coding_sessions.id
      AND session_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert sessions"
  ON coding_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for session_participants
CREATE POLICY "Users can view participants in their sessions"
  ON session_participants FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT session_id FROM session_participants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert themselves as participants"
  ON session_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their sessions"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT session_id FROM session_participants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their sessions"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    session_id IN (
      SELECT session_id FROM session_participants
      WHERE user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE matching_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE coding_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coding_sessions_updated_at
    BEFORE UPDATE ON coding_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();