import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

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
  const [staffId, setStaffId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [staffs, setStaffs] = useState<any[]>([]);

  useEffect(() => {
    if (booking && open) {
      setSelectedDate(booking.selected_date);
      setSelectedTime(booking.selected_time);
      setStaffId(booking.staff_id || '');
      setCustomerName(booking.customer_name);
      setCustomerPhone(booking.customer_phone || '');
      setCustomerEmail(booking.customer_email || '');
      loadStaffs();
    }
  }, [booking, open]);

  const loadStaffs = async () => {
    try {
      const { data, error } = await supabase
        .from('staffs')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStaffs(data || []);
    } catch (error) {
      console.error('スタッフ読み込みエラー:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          selected_date: selectedDate,
          selected_time: selectedTime,
          staff_id: staffId || null,
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
            <Label htmlFor="staff">担当スタッフ</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="スタッフを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">未割り当て</SelectItem>
                {staffs.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
