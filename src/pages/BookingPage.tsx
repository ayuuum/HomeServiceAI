import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Clock, ShoppingBag, Calendar as CalendarIcon, CheckCircle2, Upload, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { OptionCheckbox } from "@/components/OptionCheckbox";
import { QuantitySelector } from "@/components/QuantitySelector";
import { Service, ServiceOption, SelectedOptionWithQuantity } from "@/types/booking";
import { supabase } from "@/integrations/supabase/client";
import { mapDbOptionToOption } from "@/lib/serviceMapper";
import { calculateDiscount } from "@/lib/discountCalculator";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";

const BookingPage = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const service = location.state?.service as Service;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Service & Options
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);

  // User selections
  const [serviceQuantity, setServiceQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptionWithQuantity[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [hasParking, setHasParking] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Calculated values
  const [totalPrice, setTotalPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountRate, setDiscountRate] = useState(0);

  // Fetch service options
  useEffect(() => {
    if (!service) {
      navigate("/");
      return;
    }

    const fetchOptions = async () => {
      const { data, error } = await supabase
        .from('service_options')
        .select('*')
        .eq('service_id', serviceId);
      
      if (error) {
        console.error('Error fetching options:', error);
      } else {
        setOptions((data || []).map(mapDbOptionToOption));
      }
      setLoading(false);
    };

    fetchOptions();

    const channel = supabase
      .channel('service-options-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_options',
          filter: `service_id=eq.${serviceId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOptions(prev => [...prev, mapDbOptionToOption(payload.new)]);
          } else if (payload.eventType === 'UPDATE') {
            setOptions(prev => prev.map(o => 
              o.id === payload.new.id ? mapDbOptionToOption(payload.new) : o
            ));
          } else if (payload.eventType === 'DELETE') {
            setOptions(prev => prev.filter(o => o.id !== payload.old.id));
            setSelectedOptions(prev => prev.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serviceId, service, navigate]);

  // Cleanup photo previews
  useEffect(() => {
    return () => {
      photoPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [photoPreviews]);

  // Calculate total price
  useEffect(() => {
    if (!service) return;

    const baseTotal = service.basePrice * serviceQuantity;
    const optionsTotal = selectedOptions.reduce((sum, opt) => sum + (opt.price * opt.quantity), 0);
    
    const { discount: calcDiscount, discountRate: calcRate } = calculateDiscount(
      service.basePrice,
      serviceQuantity,
      service.quantityDiscounts || []
    );
    
    setDiscount(calcDiscount);
    setDiscountRate(calcRate);
    setTotalPrice(baseTotal + optionsTotal - calcDiscount);
  }, [service, serviceQuantity, selectedOptions]);

  if (!service) return null;

  // Mock time slots
  const timeSlots = [
    { time: "09:00", available: true },
    { time: "10:00", available: true },
    { time: "11:00", available: false },
    { time: "13:00", available: true },
    { time: "14:00", available: true },
    { time: "15:00", available: true },
    { time: "16:00", available: false },
  ];

  const handleOptionChange = (option: ServiceOption, checked: boolean) => {
    if (checked) {
      setSelectedOptions([...selectedOptions, { ...option, quantity: 1 }]);
    } else {
      setSelectedOptions(selectedOptions.filter(opt => opt.id !== option.id));
    }
  };

  const handleOptionQuantityChange = (optionId: string, quantity: number) => {
    setSelectedOptions(prev => prev.map(opt =>
      opt.id === optionId ? { ...opt, quantity } : opt
    ));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedPhotos(prev => [...prev, ...files]);
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemovePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedDate || !selectedTime) {
      toast.error("日時を選択してください");
      return;
    }
    
    if (!hasParking) {
      toast.error("駐車場の有無を選択してください");
      return;
    }

    try {
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          service_id: service.id,
          customer_name: "ゲストユーザー",
          service_quantity: serviceQuantity,
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

      if (selectedOptions.length > 0) {
        const optionsData = selectedOptions.map(option => ({
          booking_id: bookingData.id,
          option_id: option.id,
          option_title: option.title,
          option_price: option.price,
          option_quantity: option.quantity
        }));

        const { error: optionsError } = await supabase
          .from('booking_options')
          .insert(optionsData);

        if (optionsError) throw optionsError;
      }

      toast.success("予約リクエストを送信しました！", {
        description: "事業者からの確認連絡をお待ちください",
      });

      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("予約の送信に失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold">予約内容の入力</h1>
          </div>
        </div>
      </header>

      <div className="container max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* 1. Service Summary */}
        <section>
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <img
                  src={service.imageUrl}
                  alt={service.title}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{service.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Clock className="h-4 w-4" />
                    <span>{service.duration}分</span>
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    ¥{service.basePrice.toLocaleString()} 税込
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <QuantitySelector
                  quantity={serviceQuantity}
                  onQuantityChange={setServiceQuantity}
                />
                {discount > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/30">
                      {Math.round(discountRate * 100)}%オフ
                    </Badge>
                    <span className="text-sm text-success font-medium">
                      -¥{discount.toLocaleString()}の割引が適用されます
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* 2. Options Selection */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">追加オプション</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            必要なオプションがあればチェックしてください（複数選択可）
          </p>
          
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
            ) : options.length > 0 ? (
              options.map((option) => {
                const selectedOption = selectedOptions.find(opt => opt.id === option.id);
                return (
                  <OptionCheckbox
                    key={option.id}
                    option={option}
                    checked={!!selectedOption}
                    quantity={selectedOption?.quantity || 1}
                    onChange={(checked) => handleOptionChange(option, checked)}
                    onQuantityChange={(quantity) => handleOptionQuantityChange(option.id, quantity)}
                  />
                );
              })
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                このサービスにオプションはありません
              </p>
            )}
          </div>
        </section>

        <Separator />

        {/* 3. Date & Time Selection */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">希望日時</h3>
          </div>

          <div className="mb-6">
            <h4 className="text-base font-medium mb-3">希望日を選択</h4>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ja}
                disabled={(date) => date < new Date()}
                className="rounded-lg border border-border bg-card p-3"
              />
            </div>
          </div>

          {selectedDate && (
            <div className="animate-fade-in">
              <h4 className="text-base font-medium mb-3">希望時間を選択</h4>
              
              <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>即予約可能</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>リクエスト</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {timeSlots.map(({ time, available }) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    onClick={() => available && setSelectedTime(time)}
                    disabled={!available}
                    className="h-16 relative"
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold">{time}</div>
                      <div className="text-xs">
                        {available ? (
                          <span className="text-success flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            即予約
                          </span>
                        ) : (
                          <span className="text-muted-foreground">満席</span>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </section>

        <Separator />

        {/* 4. Diagnosis Section */}
        <section>
          <h3 className="text-xl font-semibold mb-4">現場の状況を教えてください</h3>
          <p className="text-sm text-muted-foreground mb-6">
            スムーズな作業のため、いくつか質問にお答えください
          </p>

          <div className="space-y-4">
            {/* Parking */}
            <div className="p-6 rounded-lg border border-border bg-card">
              <Label className="text-base font-semibold mb-4 block">
                駐車場はありますか？
              </Label>
              <RadioGroup value={hasParking} onValueChange={setHasParking}>
                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="yes" id="yes" />
                  <Label htmlFor="yes" className="cursor-pointer flex-1">
                    はい、あります
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="no" id="no" />
                  <Label htmlFor="no" className="cursor-pointer flex-1">
                    いいえ、ありません
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Photo Upload */}
            <div className="p-6 rounded-lg border border-border bg-card">
              <Label className="text-base font-semibold mb-4 block">
                現場の写真（任意）
              </Label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {selectedPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <button
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div 
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  写真をアップロード
                </p>
                <p className="text-xs text-muted-foreground">
                  作業箇所の写真があると、より正確な対応が可能です
                </p>
                <Button variant="outline" className="mt-4" size="sm" type="button">
                  <Upload className="h-4 w-4 mr-2" />
                  ファイルを選択
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="p-6 rounded-lg border border-border bg-card">
              <Label htmlFor="notes" className="text-base font-semibold mb-4 block">
                その他、伝えておきたいこと（任意）
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="例：ペットがいます、作業時間の制約があります、など"
                className="min-h-[120px]"
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* 5. Confirmation Summary */}
        <section>
          <h3 className="text-xl font-semibold mb-4">予約内容の確認</h3>
          
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">基本料金 × {serviceQuantity}台</span>
                  <span>¥{(service.basePrice * serviceQuantity).toLocaleString()}</span>
                </div>
                {selectedOptions.map((option) => (
                  <div key={option.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {option.title}
                      {option.quantity > 1 && ` × ${option.quantity}個`}
                    </span>
                    <span>¥{(option.price * option.quantity).toLocaleString()}</span>
                  </div>
                ))}
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>台数割引</span>
                    <span>-¥{discount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="bg-muted/50 p-4 rounded-lg mt-4">
            <p className="text-sm text-muted-foreground">
              ※ この段階ではまだ予約は確定していません。
              <br />
              事業者からの確認連絡をお待ちください。
            </p>
          </div>
        </section>
      </div>

      {/* Sticky Footer */}
      <div className="sticky-footer">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              {discount > 0 && (
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/30">
                    {Math.round(discountRate * 100)}%オフ
                  </Badge>
                  <span className="text-sm text-success font-medium">
                    -¥{discount.toLocaleString()}
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
              <CheckCircle2 className="h-5 w-5" />
              予約リクエストを送る
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
