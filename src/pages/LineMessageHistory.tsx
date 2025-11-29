import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { AdminHeader } from "@/components/AdminHeader";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, MessageCircle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface LineMessage {
  id: string;
  storeId: string;
  customerId?: string;
  recipientLineUserId: string;
  messageType: string;
  messageContent: string;
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
  customerName?: string;
}

export default function LineMessageHistory() {
  const { selectedStoreId } = useStore();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["line-messages", selectedStoreId],
    queryFn: async () => {
      let query = supabase
        .from("line_messages")
        .select(`
          *,
          customers (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (selectedStoreId) {
        query = query.eq("store_id", selectedStoreId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((msg: any) => ({
        id: msg.id,
        storeId: msg.store_id,
        customerId: msg.customer_id,
        recipientLineUserId: msg.recipient_line_user_id,
        messageType: msg.message_type,
        messageContent: msg.message_content,
        status: msg.status,
        errorMessage: msg.error_message,
        sentAt: msg.sent_at,
        createdAt: msg.created_at,
        customerName: msg.customers?.name,
      })) as LineMessage[];
    },
  });

  const filteredMessages = messages.filter((msg) => {
    const search = searchTerm.toLowerCase();
    return (
      msg.customerName?.toLowerCase().includes(search) ||
      msg.messageContent.toLowerCase().includes(search) ||
      msg.recipientLineUserId.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: LineMessage['status']) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            送信済み
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            失敗
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            送信中
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <MessageCircle className="h-8 w-8 text-primary" />
            LINEメッセージ履歴
          </h1>
          <p className="text-muted-foreground">送信したLINEメッセージの履歴を確認できます</p>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border">
          <div className="p-6 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="顧客名やメッセージで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                読み込み中...
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {searchTerm ? "検索結果がありません" : "メッセージ履歴がありません"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>送信日時</TableHead>
                    <TableHead>顧客名</TableHead>
                    <TableHead>メッセージ</TableHead>
                    <TableHead>ステータス</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(message.createdAt), "yyyy/MM/dd HH:mm", { locale: ja })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {message.customerName || "-"}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate" title={message.messageContent}>
                          {message.messageContent}
                        </div>
                        {message.status === 'failed' && message.errorMessage && (
                          <div className="text-xs text-destructive mt-1">
                            エラー: {message.errorMessage}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(message.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}