-- LINE メッセージ履歴テーブルを作成
CREATE TABLE public.line_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  recipient_line_user_id TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  message_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- RLS を有効化
ALTER TABLE public.line_messages ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全てのメッセージを閲覧可能
CREATE POLICY "Authenticated users can view all line messages"
ON public.line_messages
FOR SELECT
TO authenticated
USING (true);

-- 認証済みユーザーはメッセージを作成可能
CREATE POLICY "Authenticated users can create line messages"
ON public.line_messages
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- インデックスを作成
CREATE INDEX idx_line_messages_store_id ON public.line_messages(store_id);
CREATE INDEX idx_line_messages_customer_id ON public.line_messages(customer_id);
CREATE INDEX idx_line_messages_created_at ON public.line_messages(created_at DESC);