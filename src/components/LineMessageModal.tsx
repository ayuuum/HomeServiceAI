import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import type { Customer } from "@/types/booking";

interface LineMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  storeId: string | null;
}

export function LineMessageModal({ open, onOpenChange, customer, storeId }: LineMessageModalProps) {
  const [messageContent, setMessageContent] = useState("");
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      if (!customer?.lineUserId || !storeId) {
        throw new Error("必須情報が不足しています");
      }

      const { data, error } = await supabase.functions.invoke('send-line-message', {
        body: {
          storeId,
          customerId: customer.id,
          recipientLineUserId: customer.lineUserId,
          messageContent: content,
          messageType: 'text',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["line-messages"] });
      toast.success("LINEメッセージを送信しました");
      setMessageContent("");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Failed to send LINE message:", error);
      toast.error("送信に失敗しました: " + (error instanceof Error ? error.message : "不明なエラー"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) {
      toast.error("メッセージを入力してください");
      return;
    }
    sendMessageMutation.mutate({ content: messageContent.trim() });
  };

  const handleClose = () => {
    setMessageContent("");
    onOpenChange(false);
  };

  if (!customer?.lineUserId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="chat" size={20} className="text-primary" />
            LINEメッセージ送信
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{customer.name}</span> さんにLINEメッセージを送信します
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message">メッセージ</Label>
              <Textarea
                id="message"
                placeholder="送信するメッセージを入力してください..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={6}
                className="resize-none"
                disabled={sendMessageMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                最大5000文字まで入力できます
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={sendMessageMutation.isPending}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={sendMessageMutation.isPending || !messageContent.trim()}
            >
              {sendMessageMutation.isPending ? (
                <>
                  <Icon name="sync" size={16} className="mr-2 animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Icon name="chat" size={16} className="mr-2" />
                  送信
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}