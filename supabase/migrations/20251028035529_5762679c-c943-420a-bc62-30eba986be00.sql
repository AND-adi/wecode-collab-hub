-- Update matching_queue RLS policy to restrict visibility to own entries
DROP POLICY IF EXISTS "Users can view all queue entries" ON public.matching_queue;

CREATE POLICY "Users can view their own queue entry" 
ON public.matching_queue 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);