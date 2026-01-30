import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";
import { Notification } from "@/types/notification";

export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications();

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read_at) {
      markAsRead(notification.id);
    }

    // Navigate to relevant page with resource ID for deep linking
    switch (notification.resource_type) {
      case "booking":
        if (notification.resource_id) {
          navigate(`/admin/calendar?bookingId=${notification.resource_id}`);
        } else {
          navigate("/admin/calendar");
        }
        break;
      case "line_message":
      case "customer":
        if (notification.resource_id) {
          navigate(`/admin/inbox?customerId=${notification.resource_id}`);
        } else {
          navigate("/admin/inbox");
        }
        break;
      default:
        navigate("/admin");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Icon name="notifications" size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">通知</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              すべて既読
            </Button>
          )}
        </div>

        {/* Notification List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="progress_activity" size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Icon name="notifications_off" size={32} className="mb-2" />
            <p className="text-sm">通知はありません</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
