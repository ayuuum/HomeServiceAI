import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Service, ServiceOption } from "@/types/booking";
import { mapDbServiceToService, mapDbOptionToOption } from "@/lib/serviceMapper";
import { calculateDiscount } from "@/lib/discountCalculator";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { QuantitySelector } from "@/components/QuantitySelector";
import { OptionCheckbox } from "@/components/OptionCheckbox";
import { BookingConfirmationModal } from "@/components/BookingConfirmationModal";
import { Sparkles, Calendar as CalendarIcon, Clock, MapPin, Camera, User, CheckCircle2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Link, useParams, useSearchParams } from "react-router-dom";

interface SelectedService {
  serviceId: string;
  quantity: number;
  service: Service;
}

interface SelectedOption {
  optionId: string;
  quantity: number;
  option: ServiceOption;
}

const BookingPage = () => {
  const { storeId } = useParams();
  const [searchParams] = useSearchParams();
  const lineUserId = searchParams.get("lineUserId");
  // State management
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [allOptions, setAllOptions] = useState<ServiceOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [hasParking, setHasParking] = useState<string>("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    date: Date;
    time: string;
    serviceName: string;
    totalPrice: number;
  } | null>(null);

  // Fetch all services
  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching services:', error);
        toast.error("サービスの読み込みに失敗しました");
      } else {
        setAllServices((data || []).map(mapDbServiceToService));
      }
      setLoading(false);
    };

    fetchServices();

    // Realtime subscription for services
    const servicesChannel = supabase
      .channel('services-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'services'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setAllServices(prev => [...prev, mapDbServiceToService(payload.new)]);
        } else if (payload.eventType === 'UPDATE') {
          setAllServices(prev => prev.map(s =>
            s.id === payload.new.id ? mapDbServiceToService(payload.new) : s
          ));
        } else if (payload.eventType === 'DELETE') {
          setAllServices(prev => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(servicesChannel);
    };
  }, []);

  // Fetch options for selected services
  useEffect(() => {
    if (selectedServices.length === 0) {
      setAllOptions([]);
      return;
    }

    const fetchOptions = async () => {
      const serviceIds = selectedServices.map(s => s.serviceId);
      const { data, error } = await supabase
        .from('service_options')
        .select('*')
        .in('service_id', serviceIds);

      if (error) {
        console.error('Error fetching options:', error);
      } else {
        setAllOptions((data || []).map(mapDbOptionToOption));
      }
    };

    fetchOptions();

    // Realtime subscription for options
    const optionsChannel = supabase
      .channel('options-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'service_options'
      }, (payload) => {
        const serviceIds = selectedServices.map(s => s.serviceId);
        if (payload.eventType === 'INSERT' && serviceIds.includes(payload.new.service_id)) {
          setAllOptions(prev => [...prev, mapDbOptionToOption(payload.new)]);
        } else if (payload.eventType === 'UPDATE') {
          setAllOptions(prev => prev.map(o => o.id === payload.new.id ? mapDbOptionToOption(payload.new) : o));
        } else if (payload.eventType === 'DELETE') {
          setAllOptions(prev => prev.filter(o => o.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(optionsChannel);
    };
  }, [selectedServices]);

  // Calculate total price
  useEffect(() => {
    let total = 0;
    let discount = 0;

    // Services total with quantity discounts
    selectedServices.forEach(({ service, quantity }) => {
      const baseTotal = service.basePrice * quantity;
      const { discount: serviceDiscount } = calculateDiscount(
        service.basePrice,
        quantity,
        service.quantityDiscounts || []
      );
      total += baseTotal - serviceDiscount;
      discount += serviceDiscount;
    });

    // Options total
    selectedOptions.forEach(({ option, quantity }) => {
      total += option.price * quantity;
    });

    setTotalPrice(total);
    setTotalDiscount(discount);
  }, [selectedServices, selectedOptions]);

  // Cleanup photo URLs
  useEffect(() => {
    return () => {
      photos.forEach(file => {
        if (file instanceof File) {
          URL.revokeObjectURL(URL.createObjectURL(file));
        }
      });
    };
  }, [photos]);

  const handleServiceQuantityChange = (serviceId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      // Remove service
      setSelectedServices(prev => prev.filter(s => s.serviceId !== serviceId));
      // Remove related options
      setSelectedOptions(prev => prev.filter(o => o.option.serviceId !== serviceId));
    } else {
      const service = allServices.find(s => s.id === serviceId);
      if (!service) return;

      setSelectedServices(prev => {
        const existing = prev.find(s => s.serviceId === serviceId);
        if (existing) {
          return prev.map(s => s.serviceId === serviceId ? { ...s, quantity: newQuantity } : s);
        } else {
          return [...prev, { serviceId, quantity: newQuantity, service }];
        }
      });
    }
  };

  const handleOptionChange = (optionId: string, checked: boolean) => {
    if (checked) {
      const option = allOptions.find(o => o.id === optionId);
      if (option) {
        setSelectedOptions(prev => [...prev, { optionId, quantity: 1, option }]);
      }
    } else {
      setSelectedOptions(prev => prev.filter(o => o.optionId !== optionId));
    }
  };

  const handleOptionQuantityChange = (optionId: string, newQuantity: number) => {
    setSelectedOptions(prev => prev.map(o =>
      o.optionId === optionId ? { ...o, quantity: newQuantity } : o
    ));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (selectedServices.length === 0) {
      toast.error("サービスを選択してください");
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast.error("日時を選択してください");
      return;
    }

    if (!hasParking) {
      toast.error("駐車場の有無を選択してください");
      return;
    }

    if (!customerName.trim()) {
      toast.error("お名前を入力してください");
      return;
    }

    if (customerEmail && !customerEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("有効なメールアドレスを入力してください");
      return;
    }

    try {
      // 1. Get store ID
      let targetStoreId = storeId;

      if (!targetStoreId) {
        // Default to first non-HQ store if no storeId in URL
        const { data: storeData } = await supabase
          .from('stores')
          .select('id')
          .eq('is_hq', false)
          .limit(1)
          .single();
        targetStoreId = storeData?.id;
      }

      if (!targetStoreId) {
        throw new Error("Store not found");
      }

      // 2. Find or create customer
      let customerId: string | null = null;

      if (customerEmail || customerPhone) {
        // Try to find existing customer
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('store_id', targetStoreId)
          .or(`email.eq.${customerEmail},phone.eq.${customerPhone}`)
          .maybeSingle();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        }
      }

      // If no existing customer found (or no contact info provided), create new one
      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            store_id: targetStoreId,
            name: customerName.trim(),
            email: customerEmail.trim() || null,
            phone: customerPhone.trim() || null,
            line_user_id: lineUserId || null,
          })
          .select('id')
          .single();

        if (!customerError && newCustomer) {
          customerId = newCustomer.id;
        }
      }

      // 3. Create booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          store_id: targetStoreId,
          customer_id: customerId,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim() || null,
          customer_phone: customerPhone.trim() || null,
          selected_date: format(selectedDate, 'yyyy-MM-dd'),
          selected_time: selectedTime,
          total_price: totalPrice,
          status: 'pending',
          diagnosis_has_parking: hasParking === "yes",
          diagnosis_notes: notes
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 4. Create booking_services records
      const servicesData = selectedServices.map(({ serviceId, quantity, service }) => ({
        booking_id: bookingData.id,
        service_id: serviceId,
        service_title: service.title,
        service_quantity: quantity,
        service_base_price: service.basePrice
      }));

      const { error: servicesError } = await supabase
        .from('booking_services')
        .insert(servicesData);

      if (servicesError) throw servicesError;

      // 5. Create booking_options records
      if (selectedOptions.length > 0) {
        const optionsData = selectedOptions.map(({ optionId, quantity, option }) => ({
          booking_id: bookingData.id,
          option_id: optionId,
          option_title: option.title,
          option_price: option.price,
          option_quantity: quantity
        }));

        const { error: optionsError } = await supabase
          .from('booking_options')
          .insert(optionsData);

        if (optionsError) throw optionsError;
      }

      // Show confirmation modal
      setConfirmationData({
        date: selectedDate,
        time: selectedTime,
        serviceName: selectedServices.map(s => s.service.title).join(", "),
        totalPrice: totalPrice,
      });
      setShowConfirmation(true);

      // Reset form
      setSelectedServices([]);
      setSelectedOptions([]);
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      setHasParking("");
      setPhotos([]);
      setNotes("");
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");

    } catch (error) {
      console.error("Booking error:", error);
      toast.error("予約の送信に失敗しました");
    }
  };

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
  ];

  const getOptionsForService = (serviceId: string) => {
    return allOptions.filter(o => o.serviceId === serviceId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <BookingConfirmationModal
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        bookingData={confirmationData}
      />

      <div className="min-h-screen bg-background pb-32">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="container max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/images/logo.png" alt="ハウクリPro" className="h-8 w-auto" />
              </div>
              <Link
                to="/admin"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                管理画面
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/5 to-transparent py-12">
          <div className="container max-w-6xl mx-auto px-4">
            <h2 className="text-4xl md:text-6xl font-bold mb-3 text-center text-primary">
              ハウクリProで<br className="md:hidden" />簡単予約
            </h2>
            <p className="text-center text-muted-foreground max-w-2xl mx-auto">
              サービスを選んで、日時を選ぶだけ。<br />
              見積もり不要、すぐに予約完了できます。
            </p>
          </div>
        </section>

        <div className="container max-w-4xl mx-auto px-4 py-8 space-y-12">
          {/* Section 1: Service Selection */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <h3 className="text-2xl font-bold">サービスを選ぶ</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              複数のサービスを同時に選択できます。数量を調整してカートに追加してください。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {allServices.map((service) => {
                const selectedService = selectedServices.find(s => s.serviceId === service.id);
                const quantity = selectedService?.quantity || 0;

                return (
                  <Card key={service.id} className={`overflow-hidden transition-all duration-300 ${quantity > 0 ? "ring-2 ring-primary border-transparent shadow-medium" : "border-border shadow-subtle hover:shadow-medium"}`}>
                    <div className="aspect-video relative overflow-hidden bg-muted">
                      <img
                        src={service.imageUrl}
                        alt={service.title}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    </div>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-foreground mb-2 leading-tight">{service.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {service.description}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm text-muted-foreground mb-0.5">基本料金</p>
                          <p className="text-xl font-bold text-foreground tabular-nums">
                            ¥{service.basePrice.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                            {service.duration}分
                          </span>
                          {quantity > 0 && (
                            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none">
                              選択中
                            </Badge>
                          )}
                        </div>
                        <QuantitySelector
                          quantity={quantity}
                          onQuantityChange={(newQty) => handleServiceQuantityChange(service.id, newQty)}
                          min={0}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Section 2: Selected Services Summary */}
          {selectedServices.length > 0 && (
            <section>
              <Separator className="mb-6" />
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <h3 className="text-xl font-semibold">選択中のサービス</h3>
              </div>
              <Card>
                <CardContent className="p-6 space-y-3">
                  {selectedServices.map(({ serviceId, quantity, service }) => {
                    const subtotal = service.basePrice * quantity;
                    const { discount } = calculateDiscount(
                      service.basePrice,
                      quantity,
                      service.quantityDiscounts || []
                    );

                    return (
                      <div key={serviceId} className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{service.title}</span>
                          <span className="text-muted-foreground"> × {quantity}台</span>
                          {discount > 0 && (
                            <Badge variant="secondary" className="ml-2 bg-success/10 text-success border-success/30">
                              -{Math.round((discount / subtotal) * 100)}%
                            </Badge>
                          )}
                        </div>
                        <span className="font-semibold">
                          ¥{(subtotal - discount).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Section 3: Options Selection */}
          {selectedServices.length > 0 && allOptions.length > 0 && (
            <section>
              <Separator className="mb-6" />
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold">オプションを追加</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                選択したサービスに追加できるオプションです
              </p>

              {selectedServices.map(({ serviceId, service }) => {
                const serviceOptions = getOptionsForService(serviceId);
                if (serviceOptions.length === 0) return null;

                return (
                  <div key={serviceId} className="mb-6">
                    <h4 className="font-semibold mb-3">{service.title} のオプション</h4>
                    <div className="space-y-3">
                      {serviceOptions.map((option) => {
                        const selected = selectedOptions.find(o => o.optionId === option.id);
                        return (
                          <OptionCheckbox
                            key={option.id}
                            option={option}
                            checked={!!selected}
                            quantity={selected?.quantity || 1}
                            onChange={(checked) => handleOptionChange(option.id, checked)}
                            onQuantityChange={(qty) => handleOptionQuantityChange(option.id, qty)}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* Section 4: Date & Time Selection */}
          {selectedServices.length > 0 && (
            <section>
              <Separator className="mb-6" />
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold">日時を選択</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="text-base font-semibold mb-3 block">希望日</Label>
                  <Card className="p-4 flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      locale={ja}
                      className="rounded-md"
                    />
                  </Card>
                </div>

                {selectedDate && (
                  <div>
                    <Label className="text-base font-semibold mb-3 block">
                      希望時間帯
                    </Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {timeSlots.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? "default" : "outline"}
                          onClick={() => setSelectedTime(time)}
                          className="w-full"
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Section 5: Diagnosis */}
          {selectedServices.length > 0 && selectedDate && selectedTime && (
            <section>
              <Separator className="mb-6" />
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold">現場情報</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    駐車場の有無 <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup value={hasParking} onValueChange={setHasParking}>
                    <div className="flex items-center space-x-2 p-4 rounded-lg border border-border">
                      <RadioGroupItem value="yes" id="parking-yes" />
                      <Label htmlFor="parking-yes" className="cursor-pointer flex-1">
                        駐車場あり
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 rounded-lg border border-border">
                      <RadioGroupItem value="no" id="parking-no" />
                      <Label htmlFor="parking-no" className="cursor-pointer flex-1">
                        駐車場なし
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-2 block">
                    現場写真のアップロード（任意）
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    事前に写真をお送りいただくと、より正確なお見積もりが可能です（最大5枚）
                  </p>
                  <div className="space-y-3">
                    {photos.length < 5 && (
                      <Button variant="outline" className="w-full" asChild>
                        <label>
                          <Camera className="h-4 w-4 mr-2" />
                          写真を追加
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                        </label>
                      </Button>
                    )}
                    {photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {photos.map((photo, index) => (
                          <div key={index} className="relative aspect-square">
                            <img
                              src={URL.createObjectURL(photo)}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={() => handleRemovePhoto(index)}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-2 block">
                    備考・特記事項（任意）
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="気になる点や特別な要望があればご記入ください"
                    className="min-h-24"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Section 6: Customer Information */}
          {selectedServices.length > 0 && selectedDate && selectedTime && hasParking && (
            <section>
              <Separator className="mb-6" />
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold">ご連絡先情報</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                予約確認のご連絡に使用します
              </p>

              <div className="space-y-4">
                <div className="p-6 rounded-lg border border-border bg-card">
                  <Label htmlFor="customerName" className="text-base font-semibold mb-2 block">
                    お名前 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="customerName"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="山田 太郎"
                    required
                  />
                </div>

                <div className="p-6 rounded-lg border border-border bg-card">
                  <Label htmlFor="customerEmail" className="text-base font-semibold mb-2 block">
                    メールアドレス
                  </Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="example@email.com"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    予約確認メールを受け取る場合は入力してください
                  </p>
                </div>

                <div className="p-6 rounded-lg border border-border bg-card">
                  <Label htmlFor="customerPhone" className="text-base font-semibold mb-2 block">
                    電話番号
                  </Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="090-1234-5678"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    緊急連絡用に電話番号を入力してください
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Section 7: Final Confirmation */}
          {selectedServices.length > 0 && selectedDate && selectedTime && hasParking && customerName && (
            <section>
              <Separator className="mb-6" />
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold">予約内容の確認</h3>
              </div>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">選択サービス</h4>
                    {selectedServices.map(({ serviceId, quantity, service }) => (
                      <div key={serviceId} className="text-sm flex justify-between py-1">
                        <span>{service.title} × {quantity}</span>
                        <span>¥{(service.basePrice * quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {selectedOptions.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">オプション</h4>
                      {selectedOptions.map(({ optionId, quantity, option }) => (
                        <div key={optionId} className="text-sm flex justify-between py-1">
                          <span>{option.title} × {quantity}</span>
                          <span>¥{(option.price * quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {totalDiscount > 0 && (
                    <div className="text-sm flex justify-between py-1 text-success font-medium">
                      <span>台数割引</span>
                      <span>-¥{totalDiscount.toLocaleString()}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">合計金額</span>
                    <span className="text-2xl font-bold text-primary">
                      ¥{totalPrice.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground ml-1">税込</span>
                    </span>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">希望日時</span>
                      <span className="font-medium">
                        {format(selectedDate, 'yyyy年M月d日', { locale: ja })} {selectedTime}〜
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">お名前</span>
                      <span className="font-medium">{customerName}</span>
                    </div>
                    {customerEmail && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">メール</span>
                        <span className="font-medium">{customerEmail}</span>
                      </div>
                    )}
                    {customerPhone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">電話</span>
                        <span className="font-medium">{customerPhone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </div>

        {/* Sticky Footer */}
        {selectedServices.length > 0 && selectedDate && selectedTime && hasParking && customerName && (
          <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
            <div className="container max-w-4xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  {totalDiscount > 0 && (
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="bg-success/10 text-success border-success/30">
                        {Math.round((totalDiscount / (totalPrice + totalDiscount)) * 100)}%オフ
                      </Badge>
                      <span className="text-sm text-success font-medium">
                        -¥{totalDiscount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">合計金額</p>
                  <p className="text-2xl font-bold text-foreground">
                    ¥{totalPrice.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground ml-1">税込</span>
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  className="btn-primary gap-2"
                >
                  予約する
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BookingPage;
