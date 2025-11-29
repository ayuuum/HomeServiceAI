-- chat_logsテーブルのリアルタイム更新を有効化
ALTER TABLE public.chat_logs REPLICA IDENTITY FULL;

-- chat_logsテーブルをrealtime publicationに追加
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_logs;