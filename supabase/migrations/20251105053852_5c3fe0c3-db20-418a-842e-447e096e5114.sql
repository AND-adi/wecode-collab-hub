-- Create world_chat_messages table for global chat
CREATE TABLE public.world_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  message text NOT NULL,
  user_id uuid NOT NULL,
  user_email text NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.world_chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can read world chat messages
CREATE POLICY "Anyone can view world chat messages"
ON public.world_chat_messages
FOR SELECT
USING (true);

-- Authenticated users can insert their own messages
CREATE POLICY "Authenticated users can send world chat messages"
ON public.world_chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for world chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.world_chat_messages;