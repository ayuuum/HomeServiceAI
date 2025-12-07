import { useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useBooking } from "@/hooks/useBooking";
import { BookingServiceSelection } from "@/components/booking/BookingServiceSelection";
import { BookingDateTimeSelection } from "@/components/booking/BookingDateTimeSelection";
import { BookingCustomerForm } from "@/components/booking/BookingCustomerForm";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { BookingConfirmationModal } from "@/components/BookingConfirmationModal";

const BookingPage = () => {
  const { storeId } = useParams();
  const [searchParams] = useSearchParams();
  const initialLineUserId = searchParams.get("lineUserId");

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
    lineUserId,
    handleServiceQuantityChange,
    handleOptionChange,
    handleOptionQuantityChange,
    handleFileSelect,
    handleRemovePhoto,
    submitBooking,
    getOptionsForService,
  } = useBooking(storeId, initialLineUserId);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState<{
    date: Date;
    time: string;
    serviceName: string;
    totalPrice: number;
  } | null>(null);

  const handleSubmit = async () => {
    const result = await submitBooking();
    if (result) {
      setBookingData(result);
      setShowConfirmation(true);
    }
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
        bookingData={bookingData}
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
          <BookingServiceSelection
            allServices={allServices}
            selectedServices={selectedServices}
            allOptions={allOptions}
            selectedOptions={selectedOptions}
            lineUserId={lineUserId}
            onServiceQuantityChange={handleServiceQuantityChange}
            onOptionChange={handleOptionChange}
            onOptionQuantityChange={handleOptionQuantityChange}
            getOptionsForService={getOptionsForService}
          />

          {selectedServices.length > 0 && (
            <BookingDateTimeSelection
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              selectedTime={selectedTime}
              onTimeSelect={setSelectedTime}
              hasParking={hasParking}
              onParkingChange={setHasParking}
            />
          )}

          {selectedServices.length > 0 && selectedDate && selectedTime && (
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
            />
          )}
        </div>

        {selectedServices.length > 0 && (
          <BookingSummary
            totalPrice={totalPrice}
            totalDiscount={totalDiscount}
            onSubmit={handleSubmit}
            disabled={!selectedDate || !selectedTime || !hasParking || !customerName}
          />
        )}
      </div>
    </>
  );
};

export default BookingPage;
