import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LineMessage {
  id: string;
  organizationId: string;
  customerId: string | null;
  lineUserId: string;
  direction: 'inbound' | 'outbound';
  messageType: string;
  content: string;
  lineMessageId: string | null;
  sentAt: string;
  createdAt: string;
}

interface UseLineMessagesOptions {
  customerId?: string;
  lineUserId?: string;
}

export function useLineMessages({ customerId, lineUserId }: UseLineMessagesOptions) {
  const queryClient = useQueryClient();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  // Fetch messages
  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['line-messages', customerId, lineUserId],
    queryFn: async () => {
      let query = supabase
        .from('line_messages')
        .select('*')
        .order('sent_at', { ascending: true });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      } else if (lineUserId) {
        query = query.eq('line_user_id', lineUserId);
      } else {
        return [];
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((msg): LineMessage => ({
        id: msg.id,
        organizationId: msg.organization_id,
        customerId: msg.customer_id,
        lineUserId: msg.line_user_id,
        direction: msg.direction as 'inbound' | 'outbound',
        messageType: msg.message_type,
        content: msg.content,
        lineMessageId: msg.line_message_id,
        sentAt: msg.sent_at,
        createdAt: msg.created_at,
      }));
    },
    enabled: !!(customerId || lineUserId),
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!customerId && !lineUserId) return;

    const channel = supabase
      .channel(`line-messages-${customerId || lineUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'line_messages',
          filter: customerId 
            ? `customer_id=eq.${customerId}` 
            : `line_user_id=eq.${lineUserId}`,
        },
        (payload) => {
          console.log('New message received:', payload);
          queryClient.invalidateQueries({ queryKey: ['line-messages', customerId, lineUserId] });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        setRealtimeEnabled(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, lineUserId, queryClient]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ lineUserId, message }: { lineUserId: string; message: string }) => {
      const { data, error } = await supabase.functions.invoke('send-line-message', {
        body: {
          lineUserId,
          customerId,
          message,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-messages', customerId, lineUserId] });
    },
    onError: (error) => {
      console.error('Send message error:', error);
      toast.error('メッセージの送信に失敗しました');
    },
  });

  const sendMessage = useCallback(
    async (targetLineUserId: string, message: string) => {
      return sendMessageMutation.mutateAsync({ lineUserId: targetLineUserId, message });
    },
    [sendMessageMutation]
  );

  return {
    messages,
    isLoading,
    error,
    realtimeEnabled,
    sendMessage,
    isSending: sendMessageMutation.isPending,
  };
}
