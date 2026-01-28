import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminHeader } from '@/components/AdminHeader';
import { ConversationList } from '@/components/ConversationList';
import { LineChat } from '@/components/LineChat';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface SelectedConversation {
    customerId: string;
    customerName: string;
    lineUserId: string;
}

export default function InboxPage() {
    const [selectedConversation, setSelectedConversation] = useState<SelectedConversation | null>(null);
    const [isMobileListVisible, setIsMobileListVisible] = useState(true);

    // Mark messages as read when conversation is selected
    useEffect(() => {
        if (selectedConversation) {
            // Mark inbound messages as read
            supabase
                .from('line_messages')
                .update({ read_at: new Date().toISOString() })
                .eq('customer_id', selectedConversation.customerId)
                .eq('direction', 'inbound')
                .is('read_at', null)
                .then(() => {
                    // Refetch will happen via realtime
                });
        }
    }, [selectedConversation]);

    const handleSelectConversation = (conversation: SelectedConversation) => {
        setSelectedConversation(conversation);
        // On mobile, hide list when conversation is selected
        setIsMobileListVisible(false);
    };

    const handleBackToList = () => {
        setIsMobileListVisible(true);
        setSelectedConversation(null);
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <AdminHeader />

            {/* Page Header */}
            <div className="border-b bg-card">
                <div className="container max-w-6xl mx-auto px-4 py-4">
                    <h1 className="text-lg md:text-xl font-bold">受信トレイ</h1>
                    <p className="text-muted-foreground mt-1">LINEメッセージの確認・返信ができます</p>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Conversation List - Left Panel */}
                <div className={cn(
                    "w-full md:w-80 lg:w-96 border-r bg-card flex-shrink-0 flex flex-col",
                    !isMobileListVisible && "hidden md:flex"
                )}>
                    {/* List Header */}
                    <div className="p-4 border-b flex items-center gap-2">
                        <Icon name="inbox" size={20} className="text-[#06C755]" />
                        <span className="font-semibold">会話一覧</span>
                    </div>

                    {/* Conversation List */}
                    <div className="flex-1 overflow-hidden">
                        <ConversationList
                            selectedCustomerId={selectedConversation?.customerId || null}
                            onSelectConversation={handleSelectConversation}
                        />
                    </div>
                </div>

                {/* Chat Area - Right Panel */}
                <div className={cn(
                    "flex-1 flex flex-col bg-background",
                    isMobileListVisible && "hidden md:flex"
                )}>
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b bg-card flex items-center gap-3">
                                {/* Back button for mobile */}
                                <button
                                    onClick={handleBackToList}
                                    className="md:hidden p-2 -ml-2 hover:bg-muted rounded-lg"
                                >
                                    <Icon name="arrow_back" size={20} />
                                </button>

                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#06C755] flex items-center justify-center text-white font-medium">
                                        {selectedConversation.customerName.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="font-semibold">{selectedConversation.customerName}</h2>
                                        <p className="text-xs text-muted-foreground">LINE</p>
                                    </div>
                                </div>
                            </div>

                            {/* Chat Content */}
                            <div className="flex-1 overflow-hidden">
                                <LineChat
                                    customerId={selectedConversation.customerId}
                                    lineUserId={selectedConversation.lineUserId}
                                    customerName={selectedConversation.customerName}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                            <Icon name="chat_bubble_outline" size={64} className="mb-4 opacity-30" />
                            <p className="text-lg font-medium">会話を選択してください</p>
                            <p className="text-sm mt-1">左のリストから会話を選択すると、ここにメッセージが表示されます</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
