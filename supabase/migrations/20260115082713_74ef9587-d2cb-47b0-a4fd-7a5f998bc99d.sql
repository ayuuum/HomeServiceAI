-- Drop the overly permissive service role policy
DROP POLICY IF EXISTS "Service role can insert messages" ON public.line_messages;