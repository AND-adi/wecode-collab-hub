-- Drop the trigger first
DROP TRIGGER IF EXISTS update_coding_sessions_updated_at ON coding_sessions;

-- Drop and recreate the function with proper security
DROP FUNCTION IF EXISTS update_updated_at_column();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_coding_sessions_updated_at
    BEFORE UPDATE ON coding_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();