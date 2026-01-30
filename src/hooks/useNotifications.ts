import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Notification } from "@/types/notification";
import { useAuth } from "@/contexts/AuthContext";

export function useNotifications() {
  const { organization } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!organization?.id) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error);
    } else {
      setNotifications(data as Notification[]);
      setUnreadCount(data?.filter(n => !n.read_at).length || 0);
    }
    setLoading(false);
  }, [organization?.id]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel(`notifications-${organization.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload) => {
          console.log("New notification received:", payload.new);
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === payload.new.id ? (payload.new as Notification) : n
            )
          );
          // Recalculate unread count
          setNotifications((prev) => {
            setUnreadCount(prev.filter(n => !n.read_at).length);
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id, fetchNotifications]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error marking notification as read:", error);
    } else {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!organization?.id) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("organization_id", organization.id)
      .is("read_at", null);

    if (error) {
      console.error("Error marking all notifications as read:", error);
    } else {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    }
  }, [organization?.id]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
