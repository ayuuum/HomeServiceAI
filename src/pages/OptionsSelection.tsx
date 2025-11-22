import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Clock, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OptionCheckbox } from "@/components/OptionCheckbox";
import { StickyFooter } from "@/components/StickyFooter";
import { QuantitySelector } from "@/components/QuantitySelector";
import { Service, ServiceOption, SelectedOptionWithQuantity } from "@/types/booking";
import { supabase } from "@/integrations/supabase/client";
import { mapDbOptionToOption } from "@/lib/serviceMapper";
import { calculateDiscount } from "@/lib/discountCalculator";

const OptionsSelection = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const service = location.state?.service as Service;

  const [selectedOptions, setSelectedOptions] = useState<SelectedOptionWithQuantity[]>([]);
  const [serviceQuantity, setServiceQuantity] = useState(1);
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);

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

    // Set up realtime subscription
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

  if (!service) return null;

  // Calculate prices with discount
  const baseTotal = service.basePrice * serviceQuantity;
  const optionsTotal = selectedOptions.reduce((sum, opt) => sum + (opt.price * opt.quantity), 0);
  
  const { discount, discountRate } = calculateDiscount(
    service.basePrice,
    serviceQuantity,
    service.quantityDiscounts || []
  );
  
  const totalPrice = baseTotal + optionsTotal - discount;

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

  const handleNext = () => {
    navigate("/calendar", { 
      state: { 
        service, 
        selectedOptions,
        serviceQuantity,
        totalPrice,
        discount,
        discountRate,
      } 
    });
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
            <div>
              <h1 className="font-semibold">オプション選択</h1>
              <p className="text-sm text-muted-foreground">2 / 5</p>
            </div>
          </div>
        </div>
      </header>

      {/* Service Summary */}
      <section className="container max-w-2xl mx-auto px-4 py-6">
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

      {/* Options List */}
      <section className="container max-w-2xl mx-auto px-4 pb-8">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">追加オプション</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          必要なオプションがあればチェックしてください（複数選択可）
        </p>
        
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">読み込み中...</div>
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
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                このサービスにオプションはありません
              </p>
              <Button 
                className="mt-4 btn-primary"
                onClick={handleNext}
              >
                次へ進む
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Sticky Footer */}
      {options.length > 0 && (
        <StickyFooter 
          totalPrice={totalPrice}
          discount={discount}
          discountRate={discountRate}
          onNext={handleNext}
          buttonText="日時を選択"
        />
      )}
    </div>
  );
};

export default OptionsSelection;
