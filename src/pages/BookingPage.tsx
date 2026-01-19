import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { useBooking } from "@/hooks/useBooking";
import { useAvailability } from "@/hooks/useAvailability";
import { BookingServiceSelection } from "@/components/booking/BookingServiceSelection";
import { BookingDateTimeSelection } from "@/components/booking/BookingDateTimeSelection";
import { BookingCustomerForm } from "@/components/booking/BookingCustomerForm";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { BookingConfirmationModal } from "@/components/BookingConfirmationModal";
import { BookingStepIndicator } from "@/components/booking/BookingStepIndicator";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Sparkles, Calendar, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  brand_color?: string;
  welcome_message?: string;
  header_layout?: string;
}

const BookingPage = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [bookingUser, setBookingUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Wizard step state (1-4)
  const [currentStep, setCurrentStep] = useState(1);

  // Fetch organization by slug
  useEffect(() => {
    const fetchOrganization = async () => {
      setOrgLoading(true);
      setOrgError(null);

      const slug = orgSlug || 'default';

      const { data, error } = await supabase
        .rpc('get_organization_public', { org_slug: slug });

      if (error || !data || data.length === 0) {
        console.error('Organization not found:', error);
        setOrgError('指定された組織が見つかりません');
        setOrganization(null);
      } else {
        const orgData = Array.isArray(data) ? data[0] : data;
        setOrganization(orgData as Organization);
      }
      setOrgLoading(false);
    };

    fetchOrganization();
  }, [orgSlug]);

  const {
    allServices,
    selectedServices,
    allOptions,
    selectedOptions,
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    hasParking,
    setHasParking,
    photos,
    notes,
    setNotes,
    customerLastName,
    setCustomerLastName,
    customerFirstName,
    setCustomerFirstName,
    customerEmail,
    setCustomerEmail,
    customerPhone,
    setCustomerPhone,
    customerPostalCode,
    setCustomerPostalCode,
    customerAddress,
    setCustomerAddress,
    customerAddressBuilding,
    setCustomerAddressBuilding,
    totalPrice,
    totalDiscount,
    loading,
    handleServiceQuantityChange,
    handleOptionChange,
    handleOptionQuantityChange,
    handleFileSelect,
    handleRemovePhoto,
    submitBooking,
    getOptionsForService,
  } = useBooking(organization?.id);

  const {
    dayTimeSlots,
    loadingDay,
    fetchDayAvailability,
    checkRealTimeAvailability,
    getAvailabilityForDate,
    handleMonthChange,
    TIME_SLOTS,
  } = useAvailability(organization?.id);

  useEffect(() => {
    if (selectedDate) {
      fetchDayAvailability(selectedDate);
    }
  }, [selectedDate, fetchDayAvailability]);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState<{
    date: Date;
    time: string;
    serviceName: string;
    totalPrice: number;
    customerName?: string;
    customerPhone?: string;
    customerPostalCode?: string;
    customerAddress?: string;
    customerAddressBuilding?: string;
  } | null>(null);

  // Validation for each step
  const canProceedToStep2 = selectedServices.length > 0;
  const canProceedToStep3 = selectedDate && selectedTime && hasParking !== null;
  const canProceedToStep4 = customerLastName && customerPhone && customerAddress;
  const canSubmit = canProceedToStep2 && canProceedToStep3 && canProceedToStep4;

  const handleStepClick = (step: number) => {
    // Allow going back to any previous step
    if (step < currentStep) {
      setCurrentStep(step);
      return;
    }
    // Allow going forward only if validation passes
    if (step === 2 && canProceedToStep2) setCurrentStep(2);
    else if (step === 3 && canProceedToStep2 && canProceedToStep3) setCurrentStep(3);
    else if (step === 4 && canSubmit) setCurrentStep(4);
  };

  const handleNext = () => {
    if (currentStep === 1 && canProceedToStep2) {
      setCurrentStep(2);
    } else if (currentStep === 2 && canProceedToStep3) {
      setCurrentStep(3);
    } else if (currentStep === 3 && canProceedToStep4) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (selectedDate && selectedTime) {
      const isStillAvailable = await checkRealTimeAvailability(selectedDate, selectedTime);
      if (!isStillAvailable) {
        toast.error("申し訳ありません。この時間帯は他の方が予約されました。別の時間帯を選択してください。");
        await fetchDayAvailability(selectedDate);
        setCurrentStep(2); // Go back to date/time selection
        return;
      }
    }

    const result = await submitBooking();
    if (result) {
      setBookingData(result);
      setShowConfirmation(true);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    const currentUrl = window.location.href;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: currentUrl,
      },
    });
    if (error) {
      toast.error("ログインに失敗しました");
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setBookingUser(null);
    setCustomerLastName("");
    setCustomerFirstName("");
    setCustomerEmail("");
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setBookingUser(session?.user ?? null);
        setIsLoggingIn(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setBookingUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (orgLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (orgError || !organization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            ページが見つかりません
          </h1>
          <p className="text-muted-foreground mb-6">
            {orgError || '指定された組織が見つかりません。URLをご確認ください。'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            トップページへ戻る
          </Link>
        </div>
      </div>
    );
  }

  // Get button state for current step
  const getNextButtonState = () => {
    switch (currentStep) {
      case 1:
        return { disabled: !canProceedToStep2, label: "日時選択へ" };
      case 2:
        return { disabled: !canProceedToStep3, label: "お客様情報へ" };
      case 3:
        return { disabled: !canProceedToStep4, label: "確認へ" };
      default:
        return { disabled: true, label: "次へ" };
    }
  };

  const nextButtonState = getNextButtonState();

  return (
    <>
      <BookingConfirmationModal
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        bookingData={bookingData}
      />

      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header 
          className="bg-card border-b border-border sticky top-0 z-40"
          style={organization.brand_color ? { borderColor: `${organization.brand_color}20` } : undefined}
        >
          <div className="container max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {organization.header_layout === 'name_only' ? (
                  <span 
                    className="text-lg sm:text-xl font-bold"
                    style={{ color: organization.brand_color || 'hsl(var(--primary))' }}
                  >
                    {organization.name}
                  </span>
                ) : (
                  <>
                    {organization.logo_url ? (
                      <img 
                        src={organization.logo_url} 
                        alt={organization.name} 
                        className="h-7 sm:h-8 w-auto max-w-[150px] object-contain" 
                      />
                    ) : (
                      <img src="/images/logo.png" alt="ハウクリPro" className="h-7 sm:h-8 w-auto" />
                    )}
                    {organization.header_layout !== 'logo_only' && organization.name !== 'Default Organization' && (
                      <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
                        | {organization.name}
                      </span>
                    )}
                  </>
                )}
              </div>
              <Link
                to="/admin"
                className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                管理画面
              </Link>
            </div>
          </div>
        </header>

        {/* Step Indicator */}
        <div className="sticky top-[57px] sm:top-[65px] z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <BookingStepIndicator currentStep={currentStep} onStepClick={handleStepClick} />
        </div>

        {/* Main Content - Grows to fill space */}
        <div className="flex-1 container max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* Step 1: Service Selection */}
          {currentStep === 1 && (
            <BookingServiceSelection
              allServices={allServices}
              selectedServices={selectedServices}
              allOptions={allOptions}
              selectedOptions={selectedOptions}
              onServiceQuantityChange={handleServiceQuantityChange}
              onOptionChange={handleOptionChange}
              onOptionQuantityChange={handleOptionQuantityChange}
              getOptionsForService={getOptionsForService}
            />
          )}

          {/* Step 2: Date/Time Selection */}
          {currentStep === 2 && (
            <BookingDateTimeSelection
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              selectedTime={selectedTime}
              onTimeSelect={setSelectedTime}
              hasParking={hasParking}
              onParkingChange={setHasParking}
              timeSlots={TIME_SLOTS}
              dayTimeSlots={dayTimeSlots}
              getAvailabilityForDate={getAvailabilityForDate}
              onMonthChange={handleMonthChange}
              loadingDay={loadingDay}
            />
          )}

          {/* Step 3: Customer Information */}
          {currentStep === 3 && (
            <BookingCustomerForm
              customerLastName={customerLastName}
              onLastNameChange={setCustomerLastName}
              customerFirstName={customerFirstName}
              onFirstNameChange={setCustomerFirstName}
              customerEmail={customerEmail}
              onEmailChange={setCustomerEmail}
              customerPhone={customerPhone}
              onPhoneChange={setCustomerPhone}
              postalCode={customerPostalCode}
              onPostalCodeChange={setCustomerPostalCode}
              address={customerAddress}
              onAddressChange={setCustomerAddress}
              addressBuilding={customerAddressBuilding}
              onAddressBuildingChange={setCustomerAddressBuilding}
              notes={notes}
              onNotesChange={setNotes}
              photos={photos}
              onFileSelect={handleFileSelect}
              onRemovePhoto={handleRemovePhoto}
              isLoggedIn={!!bookingUser}
              onGoogleLogin={handleGoogleLogin}
              onLogout={handleLogout}
              isLoggingIn={isLoggingIn}
            />
          )}

          {/* Step 4: Confirmation/Summary */}
          {currentStep === 4 && (
            <div className="space-y-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">予約内容の確認</h2>
              
              {/* Service Summary */}
              <div className="bg-card rounded-xl border border-border p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground">選択サービス</h3>
                </div>
                <div className="space-y-3 pl-2">
                  {selectedServices.map((service) => (
                    <div key={service.serviceId} className="flex justify-between text-base sm:text-lg">
                      <span className="text-muted-foreground">
                        {service.service.title} × {service.quantity}
                      </span>
                      <span className="font-semibold">
                        ¥{(service.service.basePrice * service.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {selectedOptions.map((option) => (
                    <div key={option.optionId} className="flex justify-between text-base sm:text-lg">
                      <span className="text-muted-foreground">
                        └ {option.option.title} × {option.quantity}
                      </span>
                      <span className="font-semibold">
                        ¥{(option.option.price * option.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date/Time Summary */}
              <div className="bg-card rounded-xl border border-border p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground">予約日時</h3>
                </div>
                <div className="space-y-2 pl-2">
                  <p className="text-base sm:text-lg text-foreground">
                    {selectedDate?.toLocaleDateString('ja-JP', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      weekday: 'short'
                    })} {selectedTime}
                  </p>
                  <p className="text-base sm:text-lg text-muted-foreground">
                    駐車場: {hasParking ? 'あり' : 'なし'}
                  </p>
                </div>
              </div>

              {/* Customer Summary */}
              <div className="bg-card rounded-xl border border-border p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <UserCircle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground">お客様情報</h3>
                </div>
                <div className="text-base sm:text-lg text-muted-foreground space-y-2 pl-2">
                  <p><span className="text-foreground font-medium">お名前:</span> {customerLastName} {customerFirstName}</p>
                  <p><span className="text-foreground font-medium">電話番号:</span> {customerPhone}</p>
                  {customerEmail && <p><span className="text-foreground font-medium">メール:</span> {customerEmail}</p>}
                  <p><span className="text-foreground font-medium">住所:</span> 〒{customerPostalCode} {customerAddress}</p>
                  {customerAddressBuilding && <p><span className="text-foreground font-medium">建物名等:</span> {customerAddressBuilding}</p>}
                  {notes && <p><span className="text-foreground font-medium">備考:</span> {notes}</p>}
                </div>
              </div>

              {/* Price Summary */}
              <div className="bg-primary/10 rounded-xl border-2 border-primary/30 p-6 sm:p-8">
                <div className="flex justify-between items-center">
                  <span className="text-xl sm:text-2xl font-bold text-foreground">合計金額（税込）</span>
                  <div className="text-right">
                    {totalDiscount > 0 && (
                      <p className="text-base sm:text-lg text-primary font-medium">-¥{totalDiscount.toLocaleString()} 割引</p>
                    )}
                    <p className="text-3xl sm:text-4xl font-bold text-primary">
                      ¥{totalPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons - Fixed at bottom */}
        <div className="sticky bottom-0 bg-background border-t border-border p-4 safe-area-pb">
          <div className="container max-w-4xl mx-auto flex items-center gap-3">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex items-center gap-1 h-14 px-5 text-base touch-manipulation"
              >
                <ChevronLeft className="w-5 h-5" />
                戻る
              </Button>
            )}

            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                disabled={nextButtonState.disabled}
                className="flex-1 h-14 text-lg font-semibold touch-manipulation"
              >
                {nextButtonState.label}
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex-1 h-14 text-lg font-semibold touch-manipulation"
              >
                予約を確定する
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BookingPage;
