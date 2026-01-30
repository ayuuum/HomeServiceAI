import { Notification } from "@/types/notification";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const isUnread = !notification.read_at;

  const getIcon = () => {
    switch (notification.type) {
      case "new_booking":
        return "calendar_add_on";
      case "booking_cancelled":
        return "event_busy";
      case "line_message":
        return "chat";
      default:
        return "notifications";
    }
  };

  const getIconColor = () => {
    switch (notification.type) {
      case "new_booking":
        return "text-green-600";
      case "booking_cancelled":
        return "text-red-500";
      case "line_message":
        return "text-[#06C755]";
      default:
        return "text-muted-foreground";
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ja,
  });

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50",
        isUnread && "bg-primary/5"
      )}
    >
      {/* Unread indicator */}
      <div className="flex-shrink-0 mt-1">
        {isUnread ? (
          <div className="w-2 h-2 rounded-full bg-primary" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>

      {/* Icon */}
      <div className={cn("flex-shrink-0 mt-0.5", getIconColor())}>
        <Icon name={getIcon()} size={18} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm leading-tight",
          isUnread ? "font-medium text-foreground" : "text-muted-foreground"
        )}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground/70 mt-1">
          {timeAgo}
        </p>
      </div>
    </button>
  );
}
