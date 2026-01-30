import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

interface SlotActionPopoverProps {
  day: Date;
  time: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddBooking: () => void;
  onBlockSlot: () => void;
  onBlockAllDay: () => void;
  children: React.ReactNode;
}

export function SlotActionPopover({
  day,
  time,
  isOpen,
  onOpenChange,
  onAddBooking,
  onBlockSlot,
  onBlockAllDay,
  children,
}: SlotActionPopoverProps) {
  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-56 p-2"
        align="center"
        side="bottom"
        sideOffset={4}
      >
        <div className="text-xs text-muted-foreground mb-2 px-2">
          {format(day, "M月d日(E)", { locale: ja })} {time}
        </div>
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-9"
            onClick={() => {
              onAddBooking();
              onOpenChange(false);
            }}
          >
            <Icon name="calendar_add_on" size={18} />
            <span>新規予約を追加</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-9 text-destructive hover:text-destructive"
            onClick={() => {
              onBlockSlot();
              onOpenChange(false);
            }}
          >
            <Icon name="block" size={18} />
            <span>この時間をブロック</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-9 text-destructive hover:text-destructive"
            onClick={() => {
              onBlockAllDay();
              onOpenChange(false);
            }}
          >
            <Icon name="event_busy" size={18} />
            <span>この日を終日ブロック</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
