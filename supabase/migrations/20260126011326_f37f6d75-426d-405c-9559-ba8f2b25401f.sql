-- Add AI settings columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS line_ai_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS line_ai_system_prompt text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS line_ai_escalation_keywords jsonb DEFAULT '["スタッフ", "人間", "担当者", "クレーム", "苦情"]'::jsonb,
ADD COLUMN IF NOT EXISTS line_liff_id text DEFAULT NULL;