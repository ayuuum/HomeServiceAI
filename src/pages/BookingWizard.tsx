import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Service, SelectedOptionWithQuantity } from "@/types/booking";
import { OptionsStep } from "@/components/booking-steps/OptionsStep";
import { CalendarStep } from "@/components/booking-steps/CalendarStep";
import { DiagnosisStep } from "@/components/booking-steps/DiagnosisStep";
import { ConfirmationStep } from "@/components/booking-steps/ConfirmationStep";

const BookingWizard = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const service = location.state?.service as Service;

  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<'next' | 'back'>('next');

  // Booking state
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptionWithQuantity[]>([]);
  const [serviceQuantity, setServiceQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountRate, setDiscountRate] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [diagnosis, setDiagnosis] = useState<{
    hasParking: boolean;
    photos: File[];
    notes: string;
  }>();

  useEffect(() => {
    if (!service) {
      navigate("/", { replace: true });
    }
  }, [service, navigate]);

  if (!service) return null;

  const stepTitles = [
    "オプション選択",
    "日時選択",
    "事前確認",
    "予約内容の確認"
  ];

  const handleBack = () => {
    if (currentStep === 1) {
      navigate("/");
    } else {
      setDirection('back');
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleOptionsNext = (
    options: SelectedOptionWithQuantity[],
    quantity: number,
    price: number,
    discountAmount: number,
    rate: number
  ) => {
    setSelectedOptions(options);
    setServiceQuantity(quantity);
    setTotalPrice(price);
    setDiscount(discountAmount);
    setDiscountRate(rate);
    setDirection('next');
    setCurrentStep(2);
  };

  const handleCalendarNext = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setDirection('next');
    setCurrentStep(3);
  };

  const handleDiagnosisNext = (diagnosisData: {
    hasParking: boolean;
    photos: File[];
    notes: string;
  }) => {
    setDiagnosis(diagnosisData);
    setDirection('next');
    setCurrentStep(4);
  };

  const handleConfirmationSubmit = () => {
    // Handled in ConfirmationStep
  };

  const progressPercentage = (currentStep / 4) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container max-w-2xl mx-auto px-4">
          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          <div className="py-4 flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleBack}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-semibold">{stepTitles[currentStep - 1]}</h1>
              <p className="text-sm text-muted-foreground">{currentStep} / 4</p>
            </div>
          </div>
        </div>
      </header>

      {/* Steps Container */}
      <div className="relative overflow-hidden">
        <div className="flex transition-transform duration-300 ease-in-out" style={{
          transform: `translateX(-${(currentStep - 1) * 100}%)`
        }}>
          {/* Step 1: Options */}
          <div className="w-full flex-shrink-0">
            <OptionsStep
              service={service}
              serviceId={serviceId!}
              onNext={handleOptionsNext}
            />
          </div>

          {/* Step 2: Calendar */}
          <div className="w-full flex-shrink-0">
            <CalendarStep
              totalPrice={totalPrice}
              discount={discount}
              discountRate={discountRate}
              onNext={handleCalendarNext}
            />
          </div>

          {/* Step 3: Diagnosis */}
          <div className="w-full flex-shrink-0">
            <DiagnosisStep
              totalPrice={totalPrice}
              discount={discount}
              discountRate={discountRate}
              onNext={handleDiagnosisNext}
            />
          </div>

          {/* Step 4: Confirmation */}
          <div className="w-full flex-shrink-0">
            <ConfirmationStep
              service={service}
              selectedOptions={selectedOptions}
              serviceQuantity={serviceQuantity}
              totalPrice={totalPrice}
              discount={discount}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              diagnosis={diagnosis}
              onSubmit={handleConfirmationSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingWizard;
