import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { useBooking } from "@/hooks/useBooking";
import { useAvailability } from "@/hooks/useAvailability";
import { BookingServiceSelection } from "@/components/booking/BookingServiceSelection";
import { BookingDateTimeSelection } from "@/components/booking/BookingDateTimeSelection";
import { BookingCustomerForm } from "@/components/booking/BookingCustomerForm";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { BookingConfirmationModal } from "@/components/BookingConfirmationModal";
import { BookingStepIndicator } from "@/components/booking/BookingStepIndicator";
import { BookingAssistant } from "@/components/booking/BookingAssistant";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

const BookingPage = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [bookingUser, setBookingUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Fetch organization by slug
  useEffect(() => {
    const fetchOrganization = async () => {
      setOrgLoading(true);
      setOrgError(null);

      // If no slug provided, use default organization
      const slug = orgSlug || 'default';

      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        console.error('Organization not found:', error);
        setOrgError('指定された組織が見つかりません');
        setOrganization(null);
      } else {
        setOrganization(data);
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
    customerName,
    setCustomerName,
    customerEmail,
    setCustomerEmail,
    customerPhone,
    setCustomerPhone,
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
    applyRecommendation,
  } = useBooking(organization?.id);

  // Availability hook
  const {
    dayTimeSlots,
    loadingDay,
    fetchDayAvailability,
    checkRealTimeAvailability,
    getAvailabilityForDate,
    handleMonthChange,
    TIME_SLOTS,
  } = useAvailability(organization?.id);

  // Fetch day availability when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchDayAvailability(selectedDate);
    }
  }, [selectedDate, fetchDayAvailability]);

  const handleApplyRecommendation = (serviceIds: string[], optionIds: string[]) => {
    applyRecommendation(serviceIds, optionIds);
    toast.success("AIの推薦を適用しました");
  };

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState<{
    date: Date;
    time: string;
    serviceName: string;
    totalPrice: number;
  } | null>(null);

  // Section refs for scroll navigation
  const serviceRef = useRef<HTMLDivElement>(null);
  const dateTimeRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);

  // Calculate current step based on form state
  const currentStep = useMemo(() => {
    if (!selectedServices.length) return 1;
    if (!selectedDate || !selectedTime || !hasParking) return 2;
    if (!customerName) return 3;
    return 4;
  }, [selectedServices.length, selectedDate, selectedTime, hasParking, customerName]);

  const handleStepClick = (step: number) => {
    const refs = [serviceRef, dateTimeRef, customerRef];
    const targetRef = refs[step - 1];
    if (targetRef?.current) {
      targetRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSubmit = async () => {
    // 送信直前に再度空き状況を確認
    if (selectedDate && selectedTime) {
      const isStillAvailable = await checkRealTimeAvailability(selectedDate, selectedTime);
      if (!isStillAvailable) {
        toast.error("申し訳ありません。この時間帯は他の方が予約されました。別の時間帯を選択してください。");
        // 空き状況を再取得
        await fetchDayAvailability(selectedDate);
        return;
      }
    }

    const result = await submitBooking();
    if (result) {
      setBookingData(result);
      setShowConfirmation(true);
    }
  };

  // Google login handler for booking users
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

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setBookingUser(null);
    setCustomerName("");
    setCustomerEmail("");
  };

  // Monitor auth state for booking users
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

  // Show loading state
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

  // Show error if organization not found
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

  return (
    <>
      <BookingConfirmationModal
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        bookingData={bookingData}
      />

      <div className="min-h-screen bg-background pb-36 md:pb-32">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="container max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/images/logo.png" alt="ハウクリPro" className="h-7 sm:h-8 w-auto" />
                {organization.name !== 'Default Organization' && (
                  <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
                    | {organization.name}
                  </span>
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

        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/5 to-transparent py-8 sm:py-12">
          <div className="container max-w-6xl mx-auto px-4">
            <h2 className="text-2xl sm:text-4xl md:text-6xl font-bold mb-2 sm:mb-3 text-center text-primary">
              {organization.name !== 'Default Organization' ? organization.name : 'ハウクリPro'}で<br className="sm:hidden" />簡単予約
            </h2>
            <p className="text-sm sm:text-base text-center text-muted-foreground max-w-2xl mx-auto">
              サービスを選んで、日時を選ぶだけ。<br className="hidden sm:block" />
              見積もり不要、すぐに予約完了できます。
            </p>
          </div>
        </section>

        {/* Step Indicator */}
        <div className="sticky top-[57px] sm:top-[65px] z-30 bg-background/95 backdrop-blur-sm border-b border-border mb-6 sm:mb-8">
          <BookingStepIndicator currentStep={currentStep} onStepClick={handleStepClick} />
        </div>

        <div className="container max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-8 sm:space-y-12">
          <div ref={serviceRef}>
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
          </div>

          <div ref={dateTimeRef}>
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
          </div>

          <div ref={customerRef}>
            <BookingCustomerForm
              customerName={customerName}
              onNameChange={setCustomerName}
              customerEmail={customerEmail}
              onEmailChange={setCustomerEmail}
              customerPhone={customerPhone}
              onPhoneChange={setCustomerPhone}
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
          </div>
        </div>

        <BookingSummary
          totalPrice={totalPrice}
          totalDiscount={totalDiscount}
          onSubmit={handleSubmit}
          disabled={!selectedServices.length || !selectedDate || !selectedTime || !hasParking || !customerName}
        />

        {/* AI Booking Assistant */}
        <BookingAssistant
          services={allServices}
          options={allOptions}
          onApplyRecommendation={handleApplyRecommendation}
        />
      </div>
    </>
  );
};

export default BookingPage;
