import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Icon } from '@/components/ui/icon';
import { QuantitySelector } from './QuantitySelector';
import { OptionCheckbox } from './OptionCheckbox';
import { useAuth } from '@/contexts/AuthContext';

interface InitialCustomerData {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
}

interface AdminBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialCustomer?: InitialCustomerData;
}

export default function AdminBookingModal({ open, onOpenChange, onSuccess, initialCustomer }: AdminBookingModalProps) {
  const { organizationId } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [serviceQuantity, setServiceQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  useEffect(() => {
    if (open) {
      loadServices();
      loadCustomers();

      // Pre-fill customer data if provided
      if (initialCustomer) {
        setCustomerId(initialCustomer.id || '');
        setCustomerName(initialCustomer.name || '');
        setCustomerPhone(initialCustomer.phone || '');
        setCustomerEmail(initialCustomer.email || '');
      }
    }
  }, [open, initialCustomer]);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*, service_options(*)')
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('サービス読み込みエラー:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('顧客読み込みエラー:', error);
    }
  };

  const selectedService = services.find((s) => s.id === selectedServiceId);

  const calculateTotal = () => {
    if (!selectedService) return 0;

    const servicePrice = selectedService.base_price * serviceQuantity;
    const optionsPrice = selectedOptions.reduce((sum, opt) => {
      return sum + (opt.price * opt.quantity);
    }, 0);

    return servicePrice + optionsPrice;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let finalCustomerId = customerId;

      if (!finalCustomerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: customerName,
            phone: customerPhone,
            email: customerEmail,
          })
          .select()
          .single();

        if (customerError) throw customerError;
        finalCustomerId = newCustomer.id;
      }

      // Create Booking using secure RPC
      const { data: newBookingId, error: bookingError } = await supabase
        .rpc('create_booking_secure', {
          p_organization_id: organizationId,
          p_customer_id: finalCustomerId,
          p_customer_name: customerName,
          p_customer_email: customerEmail || null,
          p_customer_phone: customerPhone || null,
          p_selected_date: selectedDate,
          p_selected_time: selectedTime,
          p_total_price: calculateTotal(),
          p_diagnosis_has_parking: false, // Default for admin creation
          p_diagnosis_notes: ""
        });

      if (bookingError) throw bookingError;

      // Fetch the created booking for subsequent operations
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', newBookingId as unknown as string)
        .single();

      if (fetchError) throw fetchError;

      const { error: serviceError } = await supabase
        .from('booking_services')
        .insert({
          booking_id: booking.id,
          service_id: selectedServiceId,
          service_title: selectedService.title,
          service_base_price: selectedService.base_price,
          service_quantity: serviceQuantity,
        });

      if (serviceError) throw serviceError;

      if (selectedOptions.length > 0) {
        const { error: optionsError } = await supabase
          .from('booking_options')
          .insert(
            selectedOptions.map((opt) => ({
              booking_id: booking.id,
              option_id: opt.id,
              option_title: opt.title,
              option_price: opt.price,
              option_quantity: opt.quantity,
            }))
          );

        if (optionsError) throw optionsError;
      }

      toast({
        title: "予約を作成しました",
        description: "新しい予約が正常に作成されました",
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('予約作成エラー:', error);
      toast({
        variant: "destructive",
        title: "作成失敗",
        description: error instanceof Error ? error.message : "予約の作成に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedServiceId('');
    setServiceQuantity(1);
    setSelectedOptions([]);
    setCustomerId('');
    setSelectedDate('');
    setSelectedTime('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
  };

  const handleCustomerChange = (value: string) => {
    setCustomerId(value);
    if (value) {
      const customer = customers.find((c) => c.id === value);
      if (customer) {
        setCustomerName(customer.name || '');
        setCustomerPhone(customer.phone || '');
        setCustomerEmail(customer.email || '');
      }
    } else {
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新規予約作成</DialogTitle>
          <DialogDescription>
            顧客とサービスを選択して予約を作成します
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service">サービス</Label>
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId} required>
              <SelectTrigger>
                <SelectValue placeholder="サービスを選択" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.title} - ¥{service.base_price.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedService && (
            <>
              <QuantitySelector
                value={serviceQuantity}
                onChange={setServiceQuantity}
              />

              {selectedService.service_options?.length > 0 && (
                <div className="space-y-2">
                  <Label>オプション</Label>
                  <div className="space-y-2">
                    {selectedService.service_options.map((option: any) => (
                      <OptionCheckbox
                        key={option.id}
                        option={option}
                        checked={selectedOptions.some((o) => o.id === option.id)}
                        quantity={selectedOptions.find((o) => o.id === option.id)?.quantity || 1}
                        onChange={(checked) => {
                          if (checked) {
                            setSelectedOptions([...selectedOptions, { ...option, quantity: 1 }]);
                          } else {
                            setSelectedOptions(selectedOptions.filter((o) => o.id !== option.id));
                          }
                        }}
                        onQuantityChange={(quantity) => {
                          setSelectedOptions(
                            selectedOptions.map((o) =>
                              o.id === option.id ? { ...o, quantity } : o
                            )
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="customer">顧客</Label>
            <Select value={customerId} onValueChange={handleCustomerChange}>
              <SelectTrigger>
                <SelectValue placeholder="既存顧客を選択（または新規作成）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">新規顧客</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
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

          <div className="grid grid-cols-2 gap-4">
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
          </div>

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

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">合計金額:</span>
              <span className="text-2xl font-bold">¥{calculateTotal().toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading || !selectedServiceId}>
              {isLoading ? (
                <>
                  <Icon name="sync" size={16} className="mr-2 animate-spin" />
                  作成中...
                </>
              ) : (
                '予約を作成'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}