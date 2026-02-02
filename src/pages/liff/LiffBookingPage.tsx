import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiff } from "@/hooks/useLiff";
import { useBooking } from "@/hooks/useBooking";
import { useAvailability } from "@/hooks/useAvailability";
import { LiffHeader } from "@/components/liff/LiffHeader";
import { LiffLoadingScreen } from "@/components/liff/LiffLoadingScreen";
import { LiffCompleteScreen } from "@/components/liff/LiffCompleteScreen";
import { BookingServiceSelection } from "@/components/booking/BookingServiceSelection";
import { BookingDateTimeSelection } from "@/components/booking/BookingDateTimeSelection";
import { BookingCustomerForm } from "@/components/booking/BookingCustomerForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LiffBookingPage = () => {
    const { orgSlug: routeOrgSlug } = useParams<{ orgSlug: string }>();
    const navigate = useNavigate();

    // If no orgSlug in route, try to get from query params or use environment variable
    const urlParams = new URLSearchParams(window.location.search);
    const queryOrgSlug = urlParams.get('org');
    const defaultOrgSlug = import.meta.env.VITE_DEFAULT_ORG_SLUG || 'haukuri';
    const orgSlug = routeOrgSlug || queryOrgSlug || defaultOrgSlug;
    const [organization, setOrganization] = useState<any>(null);
    const [orgLoading, setOrgLoading] = useState(true);
    const [isCustomerLoading, setIsCustomerLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [bookingFinished, setBookingFinished] = useState(false);
    const [bookingResult, setBookingResult] = useState<any>(null);
    const hasPrefilledRef = useRef(false);

    const {
        isInitialized,
        isLoggedIn,
        profile,
        idToken,
        error: liffError,
        initLiff,
        login,
        closeWindow
    } = useLiff();

    // Fetch organization
    useEffect(() => {
        const fetchOrg = async () => {
            if (!orgSlug) {
                console.error("No orgSlug provided");
                return;
            }
            console.log("Fetching organization for slug:", orgSlug);
            setOrgLoading(true);
            const { data, error } = await supabase
                .rpc('get_organization_public', { org_slug: orgSlug });

            console.log("Organization fetch result:", { data, error });

            if (error || !data || data.length === 0) {
                console.error("Organization not found or error:", error);
                toast.error("組織情報が見つかりません");
            } else {
                console.log("Organization loaded:", data[0]);
                setOrganization(data[0]);
            }
            setOrgLoading(false);
        };
        fetchOrg();
    }, [orgSlug]);

    // Initialize LIFF once organization is loaded
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const isMockMode = urlParams.get('mock') === 'true';

        console.log("LIFF init effect triggered:", {
            isMockMode,
            isInitialized,
            hasOrganization: !!organization,
            liffId: organization?.line_liff_id
        });

        if (isMockMode && !isInitialized) {
            console.log("Initializing LIFF in MOCK mode");
            initLiff("MOCK");
        } else if (organization?.line_liff_id && !isInitialized) {
            console.log("Initializing LIFF with ID:", organization.line_liff_id);
            initLiff(organization.line_liff_id);
        } else {
            console.log("Not initializing LIFF:", {
                reason: !organization ? "No organization" :
                    !organization.line_liff_id ? "No LIFF ID" :
                        isInitialized ? "Already initialized" :
                            "Unknown"
            });
        }
    }, [organization, isInitialized, initLiff]);

    const {
        allServices,
        selectedServices,
        allOptions,
        selectedOptions,
        preferences,
        setPreferences,
        selectedDate,
        selectedTime,
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
        loading: bookingLoading,
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
        weekTimeSlots,
        loadingDay,
        loadingWeek,
        fetchDayAvailability,
        fetchWeekAvailability,
        prefetchAdjacentWeeks,
        checkRealTimeAvailability,
        getAvailabilityForDate,
        handleMonthChange,
        TIME_SLOTS,
    } = useAvailability(organization?.id);

    // Securely get or create customer using ID Token
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const isMock = urlParams.get('mock') === 'true';

        const getCustomer = async () => {
            if (!isLoggedIn || !idToken || !organization?.id || hasPrefilledRef.current) return;

            if (isMock) {
                console.log("Mock mode: Using dummy customer data");
                setCustomerLastName("田中");
                setCustomerFirstName("太郎");
                setCustomerEmail("tanaka@example.com");
                setCustomerPhone("090-1234-5678");
                setCustomerPostalCode("123-4567");
                setCustomerAddress("東京都品川区大崎1-2-3");
                setHasParking("yes");
                hasPrefilledRef.current = true;
                return;
            }

            setIsCustomerLoading(true);
            try {
                const { data, error } = await supabase.functions.invoke('get-or-create-line-customer', {
                    body: {
                        idToken,
                        organizationId: organization.id
                    }
                });

                if (error) throw error;

                if (data?.customer) {
                    const customer = data.customer;
                    // Pre-fill form
                    if (customer.name) {
                        const parts = customer.name.trim().split(/\s+/);
                        if (parts.length >= 2) {
                            setCustomerLastName(parts[0]);
                            setCustomerFirstName(parts.slice(1).join(' '));
                        } else {
                            setCustomerLastName(customer.name);
                        }
                    }
                    if (customer.email) setCustomerEmail(customer.email);
                    if (customer.phone) setCustomerPhone(customer.phone);
                    if (customer.postal_code) setCustomerPostalCode(customer.postal_code);
                    if (customer.address) setCustomerAddress(customer.address);
                    if (customer.address_building) setCustomerAddressBuilding(customer.address_building);

                    hasPrefilledRef.current = true;
                    console.log("Customer pre-filled from LINE", customer);
                }
            } catch (err) {
                console.error("Failed to sync LINE customer:", err);
            } finally {
                setIsCustomerLoading(false);
            }
        };

        if (isInitialized && isLoggedIn) {
            getCustomer();
        }
    }, [isInitialized, isLoggedIn, idToken, organization?.id]);

    // Login if not logged in
    useEffect(() => {
        if (isInitialized && !isLoggedIn && !liffError) {
            login();
        }
    }, [isInitialized, isLoggedIn, login, liffError]);

    const isMockMode = new URLSearchParams(window.location.search).get('mock') === 'true';
    const canProceedToStep2 = selectedServices.length > 0;
    const canProceedToStep3 = (preferences[0].date && preferences[0].time && (hasParking !== null && hasParking !== "")) || isMockMode;
    const canProceedToStep4 = (customerLastName && customerPhone && customerAddress && customerEmail) || isMockMode;
    const canSubmit = canProceedToStep2 && canProceedToStep3 && canProceedToStep4;

    const handleNext = () => {
        if (currentStep === 1 && canProceedToStep2) setCurrentStep(2);
        else if (currentStep === 2 && canProceedToStep3) setCurrentStep(3);
        else if (currentStep === 3 && canProceedToStep4) setCurrentStep(4);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleSubmit = async () => {
        try {
            if (selectedDate && selectedTime) {
                const isStillAvailable = await checkRealTimeAvailability(selectedDate, selectedTime);
                if (!isStillAvailable) {
                    toast.error("申し訳ありません。この時間帯は他の方が予約されました。別の時間帯を選択してください。");
                    await fetchDayAvailability(selectedDate);
                    setCurrentStep(2);
                    return;
                }
            }

            const result = await submitBooking();
            if (result) {
                setBookingResult(result);
                setBookingFinished(true);
            }
        } catch (err) {
            console.error("Booking failed:", err);
        }
    };

    // Debug logging
    console.log("LiffBookingPage state:", {
        orgLoading,
        isInitialized,
        isCustomerLoading,
        isLoggedIn,
        hasOrganization: !!organization,
        liffError,
        organizationLiffId: organization?.line_liff_id
    });

    // Show error if LIFF initialization failed
    if (liffError) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-4">
                <div className="max-w-md text-center space-y-4">
                    <div className="text-6xl">⚠️</div>
                    <h1 className="text-xl font-bold">エラーが発生しました</h1>
                    <p className="text-sm text-muted-foreground">{liffError}</p>
                    <Button onClick={() => window.location.reload()}>
                        再読み込み
                    </Button>
                </div>
            </div>
        );
    }

    if (orgLoading || !isInitialized || isCustomerLoading) {
        return (
            <LiffLoadingScreen
                organizationName={organization?.name}
                organizationLogo={organization?.logo_url}
                message={
                    orgLoading ? "組織情報を読み込み中..." :
                        !isInitialized ? "LINEと連携中..." :
                            isCustomerLoading ? "お客様情報を確認中..." :
                                "読み込み中..."
                }
            />
        );
    }

    if (bookingFinished && bookingResult) {
        return (
            <LiffCompleteScreen
                organizationName={organization.name}
                organizationLogo={organization.logo_url}
                booking={{
                    customerName: bookingResult.customerName,
                    selectedDate: bookingResult.date || bookingResult.preferences?.[0]?.date || new Date(),
                    selectedTime: bookingResult.time || bookingResult.preferences?.[0]?.time || "",
                    serviceTitles: bookingResult.serviceName ? [bookingResult.serviceName] : [],
                    totalPrice: bookingResult.totalPrice
                }}
                onClose={() => closeWindow()}
            />
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col pb-24">
            <LiffHeader
                displayName={profile?.displayName}
                pictureUrl={profile?.pictureUrl}
                currentStep={currentStep}
                totalSteps={4}
                organizationName={organization.name}
                organizationLogo={organization.logo_url}
            />

            <main className="flex-1 container max-w-2xl mx-auto px-4 py-6">
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

                {currentStep === 2 && (
                    <BookingDateTimeSelection
                        preferences={preferences}
                        onPreferencesChange={setPreferences}
                        hasParking={hasParking}
                        onParkingChange={setHasParking}
                        timeSlots={TIME_SLOTS}
                        dayTimeSlots={dayTimeSlots}
                        weekTimeSlots={weekTimeSlots}
                        getAvailabilityForDate={getAvailabilityForDate}
                        onMonthChange={handleMonthChange}
                        loadingDay={loadingDay}
                        loadingWeek={loadingWeek}
                        fetchDayAvailability={fetchDayAvailability}
                        fetchWeekAvailability={fetchWeekAvailability}
                        prefetchAdjacentWeeks={prefetchAdjacentWeeks}
                        organizationId={organization?.id}
                    />
                )}

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
                        hasParking={hasParking}
                        onHasParkingChange={setHasParking}
                        notes={notes}
                        onNotesChange={setNotes}
                        photos={photos}
                        onFileSelect={handleFileSelect}
                        onRemovePhoto={handleRemovePhoto}
                    />
                )}

                {currentStep === 4 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <Icon name="fact_check" size={20} className="text-primary" />
                            <h2 className="text-lg font-bold">予約内容の確認</h2>
                        </div>

                        <div className="bg-card rounded-lg border p-4 space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">サービス</h3>
                                <div className="mt-1 space-y-1">
                                    {selectedServices.map(s => (
                                        <p key={s.serviceId} className="text-sm font-medium">
                                            {s.service.title} × {s.quantity}
                                        </p>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">希望日時</h3>
                                <div className="mt-1 space-y-1">
                                    {preferences.map((p, i) => p.date && p.time && (
                                        <p key={i} className="text-sm font-medium">
                                            第{i + 1}希望: {p.date.toLocaleDateString('ja-JP')} {p.time}
                                        </p>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">お客様</h3>
                                <p className="text-sm font-medium">{customerLastName} {customerFirstName} 様</p>
                            </div>

                            <div className="pt-2 border-t flex justify-between items-center">
                                <span className="text-sm font-medium">合計金額</span>
                                <span className="text-xl font-bold text-primary">¥{totalPrice.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 safe-area-pb z-50">
                <div className="container max-w-2xl mx-auto flex gap-3">
                    {currentStep > 1 && (
                        <Button variant="outline" onClick={handleBack} className="flex-1">
                            戻る
                        </Button>
                    )}

                    {currentStep < 4 ? (
                        <Button
                            onClick={handleNext}
                            disabled={currentStep === 1 ? !canProceedToStep2 : !canProceedToStep3}
                            className="flex-1"
                        >
                            次へ
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={!canSubmit || bookingLoading}
                            className="flex-[2] bg-primary"
                        >
                            {bookingLoading ? "送信中..." : "予約を確定する"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiffBookingPage;
