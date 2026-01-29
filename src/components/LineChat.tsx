import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useLineMessages } from '@/hooks/useLineMessages';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LineChatProps {
  customerId: string;
  lineUserId: string;
  customerName?: string;
}

export function LineChat({ customerId, lineUserId, customerName }: LineChatProps) {
  const { organizationId } = useAuth();
  const { messages, isLoading, sendMessage, sendImage, isSending, isSendingImage, realtimeEnabled } = useLineMessages({
    customerId,
    lineUserId,
  });
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('画像ファイルのみアップロード可能です');
      return;
    }

    // Validate file size (max 10MB for LINE)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('ファイルサイズは10MB以下にしてください');
      return;
    }

    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCancelImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendImage = async () => {
    if (!selectedImage || !organizationId || isSendingImage || isUploading) return;

    try {
      setIsUploading(true);

      // Upload image to Supabase Storage
      const fileName = `${organizationId}/${customerId}/${Date.now()}-${selectedImage.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, selectedImage, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('画像のアップロードに失敗しました');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(uploadData.path);

      const imageUrl = urlData.publicUrl;

      // Send via LINE
      await sendImage(lineUserId, imageUrl);

      // Clear selection
      handleCancelImage();
      toast.success('画像を送信しました');
    } catch (error) {
      console.error('Send image error:', error);
      toast.error('画像の送信に失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="sync" size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isProcessing = isSending || isSendingImage || isUploading;

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
                      {message.messageType === 'image' ? (
                        <div className="relative group">
                          <img
                            src={message.content}
                            alt="送信画像"
                            className="max-w-full rounded-lg max-h-[300px] object-cover cursor-pointer"
                            onClick={() => window.open(message.content, '_blank')}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement?.querySelector('.fallback')?.classList.remove('hidden');
                            }}
                          />
                          <p className="fallback hidden text-sm break-words">{message.content}</p>
                        </div>
                      ) : message.messageType === 'video' ? (
                        <div className="relative">
                          <video
                            src={message.content}
                            controls
                            className="max-w-full rounded-lg max-h-[300px]"
                          />
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {message.content}
                        </p>
                      )}
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

      {/* Image preview area */}
      {imagePreview && (
        <div className="border-t p-3 bg-muted/50">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="送信する画像"
              className="max-h-32 rounded-lg object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={handleCancelImage}
              disabled={isProcessing}
            >
              <Icon name="close" size={14} />
            </Button>
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              onClick={handleSendImage}
              disabled={isProcessing}
              className="bg-[#06C755] hover:bg-[#06C755]/90 text-white"
            >
              {isProcessing ? (
                <>
                  <Icon name="sync" size={16} className="mr-2 animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Icon name="send" size={16} className="mr-2" />
                  画像を送信
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelImage}
              disabled={isProcessing}
            >
              キャンセル
            </Button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t p-4 bg-background">
        <div className="flex gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          
          {/* Image upload button */}
          <Button
            variant="outline"
            size="icon"
            className="h-[44px] w-[44px] shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || !!imagePreview}
            title="画像を送信"
          >
            <Icon name="image" size={20} />
          </Button>

          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            className="resize-none min-h-[44px] max-h-[120px]"
            rows={1}
            disabled={isProcessing}
          />
          <Button
            onClick={handleSend}
            disabled={!inputMessage.trim() || isProcessing}
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
          Enter で送信、Shift + Enter で改行 | 📷 画像も送信可能
        </p>
      </div>
    </div>
  );
}
