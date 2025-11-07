-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can insert sessions" ON coding_sessions;

-- Create a new policy that requires authentication
-- This ensures only authenticated users can create sessions
CREATE POLICY "Authenticated users can create sessions"
ON coding_sessions
FOR INSERT
TO authenticated
WITH CHECK (true);