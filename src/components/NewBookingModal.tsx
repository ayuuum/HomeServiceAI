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
import { useStore } from "@/contexts/StoreContext";
import { Loader2, Search, UserPlus, Trash2, Plus } from "lucide-react";

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
    const { selectedStoreId } = useStore();
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
    const [currentServiceId, setCurrentServiceId] = useState<string>(""); // Temporary for adding

    // Date & Time
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState<string>("");
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

        setLoading(true);
        try {
            let customerId = selectedCustomer?.id;

            // Create customer if needed
            if (!customerId) {
                const { data: createdCustomer, error: customerError } = await supabase
                    .from("customers")
                    .insert({
                        store_id: selectedStoreId,
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
                    store_id: selectedStoreId,
                    customer_id: customerId,
                    customer_name: selectedCustomer ? selectedCustomer.name : newCustomer.name,
                    customer_email: selectedCustomer ? selectedCustomer.email : newCustomer.email,
                    customer_phone: selectedCustomer ? selectedCustomer.phone : newCustomer.phone,
                    selected_date: format(selectedDate, "yyyy-MM-dd"),
                    selected_time: selectedTime,
                    total_price: total,
                    status: "confirmed",
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
                    <Search className="h-4 w-4 mr-2" />
                    既存顧客を検索
                </Button>
                <Button
                    variant={customerMode === "create" ? "default" : "outline"}
                    onClick={() => setCustomerMode("create")}
                    className="flex-1"
                >
                    <UserPlus className="h-4 w-4 mr-2" />
                    新規顧客登録
                </Button>
            </div>

            {customerMode === "search" ? (
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="名前、メール、電話番号で検索"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                        {loading && (
                            <div className="absolute right-2 top-2.5">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
                            {services.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                    {s.title} (¥{s.basePrice.toLocaleString()})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleAddService} disabled={!currentServiceId} variant="secondary">
                        <Plus className="h-4 w-4 mr-2" />
                        追加
                    </Button>
                </div>
            </div>

            {selectedServices.length > 0 && (
                <div className="space-y-4">
                    {selectedServices.map(({ serviceId, quantity, service }) => {
                        const serviceOptions = getOptionsForService(serviceId);
                        return (
                            <div key={serviceId} className="border rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-semibold">{service.title}</h4>
                                        <p className="text-sm text-muted-foreground">¥{service.basePrice.toLocaleString()}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveService(serviceId)}
                                        className="text-destructive hover:text-destructive/90"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Label className="text-xs">数量:</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => handleServiceQuantityChange(serviceId, parseInt(e.target.value) || 1)}
                                        className="w-20 h-8"
                                    />
                                </div>

                                {serviceOptions.length > 0 && (
                                    <div className="pt-2 border-t">
                                        <Label className="text-xs mb-2 block">オプション</Label>
                                        <div className="space-y-2">
                                            {serviceOptions.map((option) => {
                                                const selected = selectedOptions.find(o => o.optionId === option.id);
                                                return (
                                                    <div key={option.id} className="flex items-center justify-between text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox
                                                                checked={!!selected}
                                                                onCheckedChange={(checked) => handleOptionChange(option.id, !!checked)}
                                                            />
                                                            <span>{option.title} (+¥{option.price.toLocaleString()})</span>
                                                        </div>
                                                        {selected && (
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                value={selected.quantity}
                                                                onChange={(e) => handleOptionQuantityChange(option.id, parseInt(e.target.value) || 1)}
                                                                className="w-16 h-7 text-xs"
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderDateTimeStep = () => (
        <div className="space-y-4">
            <div>
                <Label>日付 *</Label>
                <div className="border rounded-lg p-2 flex justify-center">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        locale={ja}
                    />
                </div>
            </div>
            {selectedDate && (
                <div>
                    <Label>時間 *</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                        {timeSlots.map((time) => (
                            <Button
                                key={time}
                                variant={selectedTime === time ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedTime(time)}
                            >
                                {time}
                            </Button>
                        ))}
                    </div>
                </div>
            )}
            <div>
                <Label>備考</Label>
                <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="特記事項があれば入力"
                />
            </div>
        </div>
    );

    const renderConfirmStep = () => {
        let total = 0;
        let totalDiscount = 0;

        selectedServices.forEach(({ service, quantity }) => {
            let serviceTotal = service.basePrice * quantity;
            const { discount } = calculateDiscount(
                service.basePrice,
                quantity,
                service.quantityDiscounts || []
            );
            serviceTotal -= discount;
            total += serviceTotal;
            totalDiscount += discount;
        });

        selectedOptions.forEach(({ option, quantity }) => {
            total += option.price * quantity;
        });

        return (
            <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-3 text-sm">
                    <div>
                        <span className="font-semibold block mb-1">顧客情報</span>
                        {selectedCustomer ? (
                            <p>{selectedCustomer.name} ({selectedCustomer.email || "-"})</p>
                        ) : (
                            <p>{newCustomer.name} ({newCustomer.email || "-"})</p>
                        )}
                    </div>
                    <div>
                        <span className="font-semibold block mb-1">日時</span>
                        <p>
                            {selectedDate ? format(selectedDate, "yyyy/MM/dd") : "-"} {selectedTime}
                        </p>
                    </div>
                    <div>
                        <span className="font-semibold block mb-1">サービス内容</span>
                        {selectedServices.map(({ service, quantity }) => (
                            <div key={service.id} className="flex justify-between">
                                <span>{service.title} × {quantity}</span>
                                <span>¥{(service.basePrice * quantity).toLocaleString()}</span>
                            </div>
                        ))}
                        {totalDiscount > 0 && (
                            <div className="flex justify-between text-success">
                                <span>割引</span>
                                <span>-¥{totalDiscount.toLocaleString()}</span>
                            </div>
                        )}
                        {selectedOptions.map(({ option, quantity }) => (
                            <div key={option.id} className="flex justify-between text-muted-foreground">
                                <span>+ {option.title} × {quantity}</span>
                                <span>¥{(option.price * quantity).toLocaleString()}</span>
                            </div>
                        ))}
                        <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                            <span>合計</span>
                            <span>¥{total.toLocaleString()}</span>
                        </div>
                    </div>
                    {notes && (
                        <div>
                            <span className="font-semibold block mb-1">備考</span>
                            <p className="whitespace-pre-wrap">{notes}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>新規予約作成</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {step === "customer" && renderCustomerStep()}
                    {step === "service" && renderServiceStep()}
                    {step === "datetime" && renderDateTimeStep()}
                    {step === "confirm" && renderConfirmStep()}
                </div>

                <DialogFooter className="flex justify-between sm:justify-between">
                    <Button
                        variant="outline"
                        onClick={() => {
                            if (step === "customer") onOpenChange(false);
                            if (step === "service") setStep("customer");
                            if (step === "datetime") setStep("service");
                            if (step === "confirm") setStep("datetime");
                        }}
                    >
                        {step === "customer" ? "キャンセル" : "戻る"}
                    </Button>

                    {step !== "confirm" ? (
                        <Button
                            onClick={() => {
                                if (step === "customer") {
                                    if (selectedCustomer || newCustomer.name) setStep("service");
                                    else toast.error("顧客を選択または入力してください");
                                } else if (step === "service") {
                                    if (selectedServices.length > 0) setStep("datetime");
                                    else toast.error("サービスを少なくとも1つ選択してください");
                                } else if (step === "datetime") {
                                    if (selectedDate && selectedTime) setStep("confirm");
                                    else toast.error("日時を選択してください");
                                }
                            }}
                        >
                            次へ
                        </Button>
                    ) : (
                        <Button onClick={handleCreateBooking} disabled={loading} className="btn-primary">
                            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            予約を確定する
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
