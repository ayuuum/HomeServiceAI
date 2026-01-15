import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useLineMessages } from '@/hooks/useLineMessages';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface LineChatProps {
  customerId: string;
  lineUserId: string;
  customerName?: string;
}

export function LineChat({ customerId, lineUserId, customerName }: LineChatProps) {
  const { messages, isLoading, sendMessage, isSending, realtimeEnabled } = useLineMessages({
    customerId,
    lineUserId,
  });
  const [inputMessage, setInputMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isSending) return;

    try {
      await sendMessage(lineUserId, inputMessage.trim());
      setInputMessage('');
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="sync" size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Realtime indicator */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
        <div className={cn(
          "w-2 h-2 rounded-full",
          realtimeEnabled ? "bg-green-500" : "bg-yellow-500"
        )} />
        <span className="text-xs text-muted-foreground">
          {realtimeEnabled ? "リアルタイム接続中" : "接続中..."}
        </span>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Icon name="chat_bubble_outline" size={48} className="mb-2 opacity-50" />
            <p className="text-sm">メッセージはありません</p>
            <p className="text-xs mt-1">最初のメッセージを送信してください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isOutbound = message.direction === 'outbound';
              const showDate = index === 0 || 
                format(new Date(message.sentAt), 'yyyy-MM-dd') !== 
                format(new Date(messages[index - 1].sentAt), 'yyyy-MM-dd');

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {format(new Date(message.sentAt), 'M月d日 (E)', { locale: ja })}
                      </span>
                    </div>
                  )}
                  <div className={cn(
                    "flex",
                    isOutbound ? "justify-end" : "justify-start"
                  )}>
                    <div className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2",
                      isOutbound 
                        ? "bg-[#06C755] text-white rounded-br-md" 
                        : "bg-muted text-foreground rounded-bl-md"
                    )}>
                      <p className="whitespace-pre-wrap break-words text-sm">
                        {message.content}
                      </p>
                      <p className={cn(
                        "text-[10px] mt-1",
                        isOutbound ? "text-white/70" : "text-muted-foreground"
                      )}>
                        {format(new Date(message.sentAt), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="border-t p-4 bg-background">
        <div className="flex gap-2">
          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            className="resize-none min-h-[44px] max-h-[120px]"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!inputMessage.trim() || isSending}
            className="bg-[#06C755] hover:bg-[#06C755]/90 text-white h-[44px] w-[44px] p-0"
          >
            {isSending ? (
              <Icon name="sync" size={20} className="animate-spin" />
            ) : (
              <Icon name="send" size={20} />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Enter で送信、Shift + Enter で改行
        </p>
      </div>
    </div>
  );
}
