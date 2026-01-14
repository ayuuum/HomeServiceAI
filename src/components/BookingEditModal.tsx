import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Icon } from '@/components/ui/icon';

interface BookingEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  onSuccess: () => void;
}

export default function BookingEditModal({ open, onOpenChange, booking, onSuccess }: BookingEditModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  useEffect(() => {
    if (booking && open) {
      setSelectedDate(booking.selected_date);
      setSelectedTime(booking.selected_time);
      setCustomerName(booking.customer_name);
      setCustomerPhone(booking.customer_phone || '');
      setCustomerEmail(booking.customer_email || '');
    }
  }, [booking, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          selected_date: selectedDate,
          selected_time: selectedTime,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      toast({
        title: "予約を更新しました",
        description: "予約情報が正常に更新されました",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('予約更新エラー:', error);
      toast({
        variant: "destructive",
        title: "更新失敗",
        description: error instanceof Error ? error.message : "予約の更新に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>予約編集</DialogTitle>
          <DialogDescription>
            予約情報を編集できます
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="selectedDate">日付</Label>
              <Input
                id="selectedDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="selectedTime">時間</Label>
              <Input
                id="selectedTime"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerName">顧客名</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone">電話番号</Label>
            <Input
              id="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerEmail">メールアドレス</Label>
            <Input
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Icon name="sync" size={16} className="mr-2 animate-spin" />
                  更新中...
                </>
              ) : (
                '更新'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}