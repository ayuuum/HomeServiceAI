import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Conversation {
    customerId: string;
    customerName: string;
    avatarUrl: string | null;
    lineUserId: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
}

interface ConversationListProps {
    selectedCustomerId: string | null;
    onSelectConversation: (conversation: Conversation) => void;
}

export function ConversationList({ selectedCustomerId, onSelectConversation }: ConversationListProps) {
    const [realtimeEnabled, setRealtimeEnabled] = useState(false);

    // Fetch conversations with last message
    const { data: conversations = [], isLoading, refetch } = useQuery({
        queryKey: ['line-conversations'],
        queryFn: async () => {
            // Get all customers with LINE user ID
            // Using type assertion because avatar_url exists in DB but not in generated types yet
            const { data: customers, error: customersError } = await supabase
                .from('customers')
                .select('id, name, avatar_url, line_user_id')
                .not('line_user_id', 'is', null) as unknown as {
                    data: Array<{
                        id: string;
                        name: string | null;
                        avatar_url: string | null;
                        line_user_id: string;
                    }> | null;
                    error: Error | null;
                };

            if (customersError) throw customersError;

            // For each customer, get their last message and unread count
            const conversationsWithMessages = await Promise.all(
                (customers || []).map(async (customer) => {
                    // Get last message
                    const { data: lastMessages } = await supabase
                        .from('line_messages')
                        .select('content, sent_at, direction, read_at')
                        .eq('customer_id', customer.id)
                        .order('sent_at', { ascending: false })
                        .limit(1);

                    // Get unread count (inbound messages without read_at)
                    const { count: unreadCount } = await supabase
                        .from('line_messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('customer_id', customer.id)
                        .eq('direction', 'inbound')
                        .is('read_at', null);

                    const lastMessage = lastMessages?.[0];

                    return {
                        customerId: customer.id,
                        customerName: customer.name || 'LINE User',
                        avatarUrl: customer.avatar_url,
                        lineUserId: customer.line_user_id!,
                        lastMessage: lastMessage?.content || '',
                        lastMessageAt: lastMessage?.sent_at || '',
                        unreadCount: unreadCount || 0,
                    };
                })
            );

            // Sort by last message time (most recent first)
            return conversationsWithMessages
                .filter(c => c.lastMessage) // Only show conversations with messages
                .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        },
    });

    // Subscribe to realtime updates for new messages
    useEffect(() => {
        const channel = supabase
            .channel('inbox-conversations')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'line_messages',
                },
                () => {
                    refetch();
                }
            )
            .subscribe((status) => {
                setRealtimeEnabled(status === 'SUBSCRIBED');
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [refetch]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                読み込み中...
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                <p className="text-sm">会話がありません</p>
                <p className="text-xs mt-1">LINEからメッセージが届くとここに表示されます</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-full">
            <div className="divide-y">
                {conversations.map((conversation) => (
                    <button
                        key={conversation.customerId}
                        className={cn(
                            "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                            selectedCustomerId === conversation.customerId && "bg-muted"
                        )}
                        onClick={() => onSelectConversation(conversation)}
                    >
                        <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                                {conversation.avatarUrl && (
                                    <img
                                        src={conversation.avatarUrl}
                                        alt={conversation.customerName}
                                        className="h-full w-full object-cover rounded-full"
                                    />
                                )}
                                <AvatarFallback className="bg-[#06C755] text-white text-sm">
                                    {conversation.customerName.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium text-sm truncate">
                                        {conversation.customerName}
                                    </span>
                                    <span className="text-xs text-muted-foreground flex-shrink-0">
                                        {conversation.lastMessageAt && formatDistanceToNow(
                                            new Date(conversation.lastMessageAt),
                                            { addSuffix: true, locale: ja }
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-2 mt-1">
                                    <p className="text-sm text-muted-foreground truncate">
                                        {conversation.lastMessage}
                                    </p>
                                    {conversation.unreadCount > 0 && (
                                        <span className="flex-shrink-0 bg-[#06C755] text-white text-xs font-medium px-2 py-0.5 rounded-full">
                                            {conversation.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </ScrollArea>
    );
}
