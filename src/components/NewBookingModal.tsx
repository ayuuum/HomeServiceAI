import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Service, ServiceOption } from "@/types/booking";
import { mapDbServiceToService, mapDbOptionToOption } from "@/lib/serviceMapper";
import { calculateDiscount } from "@/lib/discountCalculator";
import { Icon } from "@/components/ui/icon";

interface NewBookingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onBookingCreated: () => void;
}

type Step = "customer" | "service" | "datetime" | "confirm";

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

export const NewBookingModal = ({
    open,
    onOpenChange,
    onBookingCreated,
}: NewBookingModalProps) => {
    const [step, setStep] = useState<Step>("customer");
    const [loading, setLoading] = useState(false);

    // Data
    const [services, setServices] = useState<Service[]>([]);
    const [allOptions, setAllOptions] = useState<ServiceOption[]>([]);

    // Form State
    // Customer
    const [customerMode, setCustomerMode] = useState<"search" | "create">("search");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "" });

    // Service & Options
    const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
    const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
    const [currentServiceId, setCurrentServiceId] = useState<string>("");

    // Date & Time
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState<string>("");
    const [hasParking, setHasParking] = useState<string>("");
    const [notes, setNotes] = useState("");

    const timeSlots = [
        "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
    ];

    useEffect(() => {
        if (open) {
            fetchServices();
            resetForm();
        }
    }, [open]);

    // Fetch options when selected services change
    useEffect(() => {
        if (selectedServices.length > 0) {
            fetchOptions(selectedServices.map(s => s.serviceId));
        } else {
            setAllOptions([]);
        }
    }, [selectedServices]);

    const resetForm = () => {
        setStep("customer");
        setCustomerMode("search");
        setSearchQuery("");
        setSearchResults([]);
        setSelectedCustomer(null);
        setNewCustomer({ name: "", email: "", phone: "" });
        setSelectedServices([]);
        setSelectedOptions([]);
        setCurrentServiceId("");
        setSelectedDate(undefined);
        setSelectedTime("");
        setHasParking("");
        setNotes("");
    };

    const fetchServices = async () => {
        const { data } = await supabase.from("services").select("*").order("created_at");
        if (data) setServices(data.map(mapDbServiceToService));
    };

    const fetchOptions = async (serviceIds: string[]) => {
        if (serviceIds.length === 0) return;
        const { data } = await supabase
            .from("service_options")
            .select("*")
            .in("service_id", serviceIds);
        if (data) setAllOptions(data.map(mapDbOptionToOption));
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                handleSearchCustomer(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearchCustomer = async (query: string) => {
        setLoading(true);
        const { data } = await supabase
            .from("customers")
            .select("*")
            .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
            .limit(5);
        setSearchResults(data || []);
        setLoading(false);
    };

    const handleAddService = () => {
        if (!currentServiceId) return;
        const service = services.find(s => s.id === currentServiceId);
        if (!service) return;

        // Check if already added
        if (selectedServices.some(s => s.serviceId === currentServiceId)) {
            toast.error("このサービスは既に追加されています");
            return;
        }

        setSelectedServices([...selectedServices, { serviceId: currentServiceId, quantity: 1, service }]);
        setCurrentServiceId("");
    };

    const handleRemoveService = (serviceId: string) => {
        setSelectedServices(prev => prev.filter(s => s.serviceId !== serviceId));
        setSelectedOptions(prev => prev.filter(o => o.option.serviceId !== serviceId));
    };

    const handleServiceQuantityChange = (serviceId: string, newQuantity: number) => {
        if (newQuantity < 1) return;
        setSelectedServices(prev => prev.map(s => s.serviceId === serviceId ? { ...s, quantity: newQuantity } : s));
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
        if (newQuantity < 1) return;
        setSelectedOptions(prev => prev.map(o => o.optionId === optionId ? { ...o, quantity: newQuantity } : o));
    };

    const getOptionsForService = (serviceId: string) => {
        return allOptions.filter(o => o.serviceId === serviceId);
    };

    const handleCreateBooking = async () => {
        if (!selectedDate || !selectedTime || selectedServices.length === 0) return;
        if (!selectedCustomer && !newCustomer.name) return;
        if (!hasParking) {
            toast.error("駐車場の有無を選択してください");
            return;
        }

        setLoading(true);
        try {
            // --- Double Booking Prevention ---
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            const { data: existingBookings, error: checkError } = await supabase
                .from('bookings')
                .select('id')
                .eq('selected_date', formattedDate)
                .eq('selected_time', selectedTime)
                .neq('status', 'cancelled');

            if (checkError) throw checkError;

            if (existingBookings && existingBookings.length > 0) {
                toast.error("申し訳ありませんが、この日時は既に予約が入ってしまいました。");
                setLoading(false);
                return;
            }
            // ---------------------------------

            let customerId = selectedCustomer?.id;

            // Customer Merging Logic if creating new customer or if we want to update existing
            if (!customerId && (newCustomer.email || newCustomer.phone)) {
                const conditions = [];
                if (newCustomer.email) conditions.push(`email.eq.${newCustomer.email}`);
                if (newCustomer.phone) conditions.push(`phone.eq.${newCustomer.phone}`);

                if (conditions.length > 0) {
                    const { data: existingCustomer } = await supabase
                        .from('customers')
                        .select('id')
                        .or(conditions.join(','))
                        .maybeSingle();

                    if (existingCustomer) {
                        customerId = existingCustomer.id;
                        // Update existing
                        await supabase
                            .from('customers')
                            .update({
                                name: newCustomer.name,
                                email: newCustomer.email || null,
                                phone: newCustomer.phone || null,
                            })
                            .eq('id', customerId);
                    }
                }
            }

            // Create customer if needed and still not found
            if (!customerId) {
                const { data: createdCustomer, error: customerError } = await supabase
                    .from("customers")
                    .insert({
                        name: newCustomer.name,
                        email: newCustomer.email || null,
                        phone: newCustomer.phone || null,
                    })
                    .select()
                    .single();

                if (customerError) throw customerError;
                customerId = createdCustomer.id;
            }

            // Calculate totals
            let total = 0;
            selectedServices.forEach(({ service, quantity }) => {
                let serviceTotal = service.basePrice * quantity;
                const { discount } = calculateDiscount(
                    service.basePrice,
                    quantity,
                    service.quantityDiscounts || []
                );
                serviceTotal -= discount;
                total += serviceTotal;
            });

            selectedOptions.forEach(({ option, quantity }) => {
                total += option.price * quantity;
            });

            // Create Booking
            const { data: booking, error: bookingError } = await supabase
                .from("bookings")
                .insert({
                    customer_id: customerId,
                    customer_name: selectedCustomer ? selectedCustomer.name : newCustomer.name,
                    customer_email: selectedCustomer ? selectedCustomer.email : newCustomer.email,
                    customer_phone: selectedCustomer ? selectedCustomer.phone : newCustomer.phone,
                    selected_date: format(selectedDate, "yyyy-MM-dd"),
                    selected_time: selectedTime,
                    total_price: total,
                    status: "confirmed",
                    diagnosis_has_parking: hasParking === "yes",
                    diagnosis_notes: notes,
                })
                .select()
                .single();

            if (bookingError) throw bookingError;

            // Create Booking Services
            const bookingServicesData = selectedServices.map(({ serviceId, quantity, service }) => ({
                booking_id: booking.id,
                service_id: serviceId,
                service_title: service.title,
                service_quantity: quantity,
                service_base_price: service.basePrice,
            }));

            const { error: serviceError } = await supabase.from("booking_services").insert(bookingServicesData);
            if (serviceError) throw serviceError;

            // Create Booking Options
            if (selectedOptions.length > 0) {
                const bookingOptionsData = selectedOptions.map(({ optionId, quantity, option }) => ({
                    booking_id: booking.id,
                    option_id: optionId,
                    option_title: option.title,
                    option_price: option.price,
                    option_quantity: quantity,
                }));

                const { error: optionsError } = await supabase
                    .from("booking_options")
                    .insert(bookingOptionsData);
                if (optionsError) throw optionsError;
            }

            toast.success("予約を作成しました");
            onBookingCreated();
            onOpenChange(false);
        } catch (error) {
            console.error("Error creating booking:", error);
            toast.error("予約の作成に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const renderCustomerStep = () => (
        <div className="space-y-4">
            <div className="flex gap-2 mb-4">
                <Button
                    variant={customerMode === "search" ? "default" : "outline"}
                    onClick={() => setCustomerMode("search")}
                    className="flex-1"
                >
                    <Icon name="search" size={16} className="mr-2" />
                    既存顧客を検索
                </Button>
                <Button
                    variant={customerMode === "create" ? "default" : "outline"}
                    onClick={() => setCustomerMode("create")}
                    className="flex-1"
                >
                    <Icon name="person_add" size={16} className="mr-2" />
                    新規顧客登録
                </Button>
            </div>

            {customerMode === "search" ? (
                <div className="space-y-4">
                    <div className="relative">
                        <div className="absolute left-2 top-2.5 text-muted-foreground">
                            <Icon name="search" size={16} />
                        </div>
                        <Input
                            placeholder="名前、メール、電話番号で検索"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                        {loading && (
                            <div className="absolute right-2 top-2.5">
                                <Icon name="sync" size={16} className="animate-spin text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {searchResults.map((customer) => (
                            <div
                                key={customer.id}
                                className={`p-3 border rounded-lg cursor-pointer hover:bg-muted ${selectedCustomer?.id === customer.id ? "border-primary bg-primary/5" : ""
                                    }`}
                                onClick={() => setSelectedCustomer(customer)}
                            >
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {customer.email} / {customer.phone}
                                </p>
                            </div>
                        ))}
                        {searchResults.length === 0 && searchQuery && !loading && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                顧客が見つかりません
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div>
                        <Label>お名前 *</Label>
                        <Input
                            value={newCustomer.name}
                            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label>メールアドレス</Label>
                        <Input
                            value={newCustomer.email}
                            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label>電話番号</Label>
                        <Input
                            value={newCustomer.phone}
                            onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                        />
                    </div>
                </div>
            )}
        </div>
    );

    const renderServiceStep = () => (
        <div className="space-y-6">
            <div className="space-y-3">
                <Label>サービス追加</Label>
                <div className="flex gap-2">
                    <Select value={currentServiceId} onValueChange={setCurrentServiceId}>
                        <SelectTrigger className="flex-1">
                            <SelectValue placeholder="サービスを選択" />
                        </SelectTrigger>
                        <SelectContent>
                            {services.map((service) => (
                                <SelectItem key={service.id} value={service.id}>
                                    {service.title} - ¥{service.basePrice.toLocaleString()}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleAddService} disabled={!currentServiceId}>
                        <Icon name="add" size={16} />
                    </Button>
                </div>
            </div>

            {selectedServices.length > 0 && (
                <div className="space-y-4">
                    <Label>選択したサービス</Label>
                    {selectedServices.map(({ serviceId, quantity, service }) => (
                        <div key={serviceId} className="p-4 border rounded-lg space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium">{service.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                        ¥{service.basePrice.toLocaleString()} / 台
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={() => handleRemoveService(serviceId)}
                                >
                                    <Icon name="close" size={16} />
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-sm">台数:</Label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleServiceQuantityChange(serviceId, quantity - 1)}
                                    disabled={quantity <= 1}
                                >
                                    -
                                </Button>
                                <span className="w-8 text-center">{quantity}</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleServiceQuantityChange(serviceId, quantity + 1)}
                                >
                                    +
                                </Button>
                            </div>

                            {/* Options for this service */}
                            {getOptionsForService(serviceId).length > 0 && (
                                <div className="pt-2 border-t space-y-2">
                                    <p className="text-sm font-medium">オプション:</p>
                                    {getOptionsForService(serviceId).map((option) => {
                                        const selected = selectedOptions.find(o => o.optionId === option.id);
                                        return (
                                            <div key={option.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={!!selected}
                                                        onCheckedChange={(checked) =>
                                                            handleOptionChange(option.id, !!checked)
                                                        }
                                                    />
                                                    <span className="text-sm">{option.title}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        +¥{option.price.toLocaleString()}
                                                    </span>
                                                </div>
                                                {selected && (
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-6 w-6 p-0"
                                                            onClick={() =>
                                                                handleOptionQuantityChange(option.id, selected.quantity - 1)
                                                            }
                                                            disabled={selected.quantity <= 1}
                                                        >
                                                            -
                                                        </Button>
                                                        <span className="w-6 text-center text-sm">{selected.quantity}</span>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-6 w-6 p-0"
                                                            onClick={() =>
                                                                handleOptionQuantityChange(option.id, selected.quantity + 1)
                                                            }
                                                        >
                                                            +
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderDateTimeStep = () => (
        <div className="space-y-6">
            <div>
                <Label className="mb-2 block">日付を選択</Label>
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={ja}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                />
            </div>

            <div>
                <Label className="mb-2 block">時間を選択</Label>
                <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((time) => (
                        <Button
                            key={time}
                            variant={selectedTime === time ? "default" : "outline"}
                            onClick={() => setSelectedTime(time)}
                            className="w-full"
                        >
                            {time}
                        </Button>
                    ))}
                </div>
            </div>

            <div>
                <Label className="mb-2 block">駐車場</Label>
                <div className="flex gap-2">
                    <Button
                        variant={hasParking === "yes" ? "default" : "outline"}
                        onClick={() => setHasParking("yes")}
                        className="flex-1"
                    >
                        あり
                    </Button>
                    <Button
                        variant={hasParking === "no" ? "default" : "outline"}
                        onClick={() => setHasParking("no")}
                        className="flex-1"
                    >
                        なし
                    </Button>
                </div>
            </div>

            <div>
                <Label className="mb-2 block">備考</Label>
                <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="特記事項があれば入力してください"
                />
            </div>
        </div>
    );

    const renderConfirmStep = () => {
        let total = 0;
        selectedServices.forEach(({ service, quantity }) => {
            let serviceTotal = service.basePrice * quantity;
            const { discount } = calculateDiscount(service.basePrice, quantity, service.quantityDiscounts || []);
            serviceTotal -= discount;
            total += serviceTotal;
        });
        selectedOptions.forEach(({ option, quantity }) => {
            total += option.price * quantity;
        });

        return (
            <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-3">
                    <div>
                        <p className="text-sm text-muted-foreground">顧客</p>
                        <p className="font-medium">
                            {selectedCustomer ? selectedCustomer.name : newCustomer.name}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">サービス</p>
                        {selectedServices.map(({ service, quantity }) => (
                            <p key={service.id} className="font-medium">
                                {service.title} × {quantity}
                            </p>
                        ))}
                    </div>
                    {selectedOptions.length > 0 && (
                        <div>
                            <p className="text-sm text-muted-foreground">オプション</p>
                            {selectedOptions.map(({ option, quantity }) => (
                                <p key={option.id} className="font-medium">
                                    {option.title} × {quantity}
                                </p>
                            ))}
                        </div>
                    )}
                    <div>
                        <p className="text-sm text-muted-foreground">日時</p>
                        <p className="font-medium">
                            {selectedDate && format(selectedDate, "yyyy年M月d日", { locale: ja })} {selectedTime}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">駐車場</p>
                        <p className="font-medium">{hasParking === "yes" ? "あり" : "なし"}</p>
                    </div>
                    {notes && (
                        <div>
                            <p className="text-sm text-muted-foreground">備考</p>
                            <p className="font-medium">{notes}</p>
                        </div>
                    )}
                    <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">合計金額</p>
                        <p className="text-2xl font-bold text-primary">¥{total.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        );
    };

    const canProceed = () => {
        switch (step) {
            case "customer":
                return selectedCustomer || newCustomer.name;
            case "service":
                return selectedServices.length > 0;
            case "datetime":
                return selectedDate && selectedTime && hasParking;
            case "confirm":
                return true;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (step === "customer") setStep("service");
        else if (step === "service") setStep("datetime");
        else if (step === "datetime") setStep("confirm");
        else if (step === "confirm") handleCreateBooking();
    };

    const handleBack = () => {
        if (step === "service") setStep("customer");
        else if (step === "datetime") setStep("service");
        else if (step === "confirm") setStep("datetime");
    };

    const getStepTitle = () => {
        switch (step) {
            case "customer": return "1. 顧客選択";
            case "service": return "2. サービス選択";
            case "datetime": return "3. 日時選択";
            case "confirm": return "4. 確認";
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{getStepTitle()}</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {step === "customer" && renderCustomerStep()}
                    {step === "service" && renderServiceStep()}
                    {step === "datetime" && renderDateTimeStep()}
                    {step === "confirm" && renderConfirmStep()}
                </div>

                <DialogFooter className="flex gap-2">
                    {step !== "customer" && (
                        <Button variant="outline" onClick={handleBack}>
                            戻る
                        </Button>
                    )}
                    <Button onClick={handleNext} disabled={!canProceed() || loading}>
                        {loading ? (
                            <Icon name="sync" size={16} className="animate-spin mr-2" />
                        ) : null}
                        {step === "confirm" ? "予約を作成" : "次へ"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
