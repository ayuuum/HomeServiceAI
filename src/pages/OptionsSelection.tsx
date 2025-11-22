import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptionCheckbox } from "@/components/OptionCheckbox";
import { StickyFooter } from "@/components/StickyFooter";
import { mockServiceOptions } from "@/data/mockData";
import { Service, ServiceOption } from "@/types/booking";

const OptionsSelection = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const service = location.state?.service as Service;

  const [selectedOptions, setSelectedOptions] = useState<ServiceOption[]>([]);
  const options = serviceId ? mockServiceOptions[serviceId] || [] : [];

  useEffect(() => {
    if (!service) {
      navigate("/");
    }
  }, [service, navigate]);

  if (!service) return null;

  const totalPrice = service.basePrice + 
    selectedOptions.reduce((sum, opt) => sum + opt.price, 0);

  const handleOptionChange = (option: ServiceOption, checked: boolean) => {
    if (checked) {
      setSelectedOptions([...selectedOptions, option]);
    } else {
      setSelectedOptions(selectedOptions.filter(opt => opt.id !== option.id));
    }
  };

  const handleNext = () => {
    navigate("/calendar", { 
      state: { 
        service, 
        selectedOptions,
        totalPrice 
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
      <section className="bg-muted/30 py-6">
        <div className="container max-w-2xl mx-auto px-4">
          <div className="flex items-start gap-4">
            <img 
              src={service.imageUrl} 
              alt={service.title}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-1">{service.title}</h2>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{service.duration}分</span>
                </div>
                <span className="font-semibold text-foreground">
                  基本料金: ¥{service.basePrice.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Options List */}
      <section className="container max-w-2xl mx-auto px-4 py-8">
        <h3 className="text-xl font-semibold mb-4">オプションを選択</h3>
        <p className="text-sm text-muted-foreground mb-6">
          必要なオプションがあればチェックしてください（複数選択可）
        </p>
        
        <div className="space-y-3">
          {options.length > 0 ? (
            options.map((option) => (
              <OptionCheckbox
                key={option.id}
                option={option}
                checked={selectedOptions.some(opt => opt.id === option.id)}
                onChange={(checked) => handleOptionChange(option, checked)}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                このサービスにオプションはありません
              </p>
              <Button 
                className="mt-4"
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
          onNext={handleNext}
          buttonText="日時を選択"
        />
      )}
    </div>
  );
};

export default OptionsSelection;
