import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { AdminHeader } from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { MessageCircle, Send, User, Bot } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface ChatLog {
  id: string;
  storeId: string;
  customerId: string;
  sender: 'user' | 'staff' | 'bot';
  messageType: string;
  message: string;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
  lineUserId?: string;
}

export default function LineChatHistory() {
  const { selectedStoreId } = useStore();
  const queryClient = useQueryClient();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch customers with LINE User ID
  const { data: customers = [] } = useQuery({
    queryKey: ["line-customers", selectedStoreId],
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("*")
        .not("line_user_id", "is", null)
        .order("created_at", { ascending: false });

      if (selectedStoreId) {
        query = query.eq("store_id", selectedStoreId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((c) => ({
        id: c.id,
        name: c.name || "Unknown",
        lineUserId: c.line_user_id || undefined,
      })) as Customer[];
    },
  });

  // Fetch chat logs for selected customer
  const { data: chatLogs = [] } = useQuery({
    queryKey: ["chat-logs", selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return [];

      const { data, error } = await supabase
        .from("chat_logs")
        .select("*")
        .eq("customer_id", selectedCustomerId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data || []).map((log) => ({
        id: log.id,
        storeId: log.store_id,
        customerId: log.customer_id,
        sender: log.sender,
        messageType: log.message_type,
        message: log.message,
        createdAt: log.created_at,
      })) as ChatLog[];
    },
    enabled: !!selectedCustomerId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
      if (!selectedCustomer?.lineUserId || !selectedStoreId) {
        throw new Error("必須情報が不足しています");
      }

      // Send via LINE (Backend will also save to chat_logs)
      const { data, error } = await supabase.functions.invoke("send-line-message", {
        body: {
          storeId: selectedStoreId,
          customerId: selectedCustomerId,
          recipientLineUserId: selectedCustomer.lineUserId,
          messageContent: message,
          messageType: "text",
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate queries to fetch the new message saved by the backend
      queryClient.invalidateQueries({ queryKey: ["chat-logs", selectedCustomerId] });
      setMessageInput("");
      toast.success("メッセージを送信しました");
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      toast.error("送信に失敗しました: " + (error instanceof Error ? error.message : "不明なエラー"));
    },
  });

  // Realtime subscription for new messages
  useEffect(() => {
    if (!selectedCustomerId) return;

    const channel = supabase
      .channel("chat-logs-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_logs",
          filter: `customer_id=eq.${selectedCustomerId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-logs", selectedCustomerId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCustomerId, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatLogs]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    sendMessageMutation.mutate({ message: messageInput.trim() });
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <MessageCircle className="h-8 w-8 text-primary" />
            LINEチャット
          </h1>
          <p className="text-muted-foreground">顧客とのLINEでのやり取りを確認・返信できます</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-250px)]">
          {/* Customer List */}
          <Card className="md:col-span-1">
            <CardContent className="p-0">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold">顧客一覧</h2>
              </div>
              <ScrollArea className="h-[calc(100vh-350px)]">
                {customers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    LINE連携している顧客がいません
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => setSelectedCustomerId(customer.id)}
                        className={`w-full p-4 text-left hover:bg-muted transition-colors ${selectedCustomerId === customer.id ? "bg-muted" : ""
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{customer.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {customer.lineUserId?.substring(0, 12)}...
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="md:col-span-2">
            <CardContent className="p-0 flex flex-col h-full">
              {selectedCustomer ? (
                <>
                  <div className="p-4 border-b border-border">
                    <h2 className="font-semibold">{selectedCustomer.name}</h2>
                  </div>

                  <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    {chatLogs.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        メッセージがありません
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {chatLogs.map((log) => {
                          const isStaff = log.sender === "staff";
                          return (
                            <div
                              key={log.id}
                              className={`flex ${isStaff ? "justify-end" : "justify-start"
                                }`}
                            >
                              <div
                                className={`max-w-[70%] ${isStaff
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                  } rounded-lg p-3`}
                              >
                                <div className="flex items-start gap-2">
                                  {!isStaff && (
                                    <User className="h-4 w-4 mt-1 flex-shrink-0" />
                                  )}
                                  <div className="flex-1">
                                    <p className="text-sm whitespace-pre-wrap break-words">
                                      {log.message}
                                    </p>
                                    <p
                                      className={`text-xs mt-1 ${isStaff
                                          ? "text-primary-foreground/70"
                                          : "text-muted-foreground"
                                        }`}
                                    >
                                      {format(new Date(log.createdAt), "HH:mm", { locale: ja })}
                                    </p>
                                  </div>
                                  {isStaff && (
                                    <Bot className="h-4 w-4 mt-1 flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>

                  <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
                    <div className="flex gap-2">
                      <Input
                        placeholder="メッセージを入力..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        disabled={sendMessageMutation.isPending}
                      />
                      <Button
                        type="submit"
                        disabled={sendMessageMutation.isPending || !messageInput.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  顧客を選択してください
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}