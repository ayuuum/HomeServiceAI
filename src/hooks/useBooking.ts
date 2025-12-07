import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Service, ServiceOption } from "@/types/booking";
import { mapDbServiceToService, mapDbOptionToOption } from "@/lib/serviceMapper";
import { calculateDiscount } from "@/lib/discountCalculator";
import { toast } from "sonner";
import { format } from "date-fns";

export interface SelectedService {
    serviceId: string;
    quantity: number;
    service: Service;
}

export interface SelectedOption {
    optionId: string;
    quantity: number;
    option: ServiceOption;
}

export const useBooking = (storeId?: string, initialLineUserId?: string | null) => {
    // State management
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
    const [allOptions, setAllOptions] = useState<ServiceOption[]>([]);
    const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>();
    const [selectedTime, setSelectedTime] = useState<string>();
    const [hasParking, setHasParking] = useState<string>("");
    const [photos, setPhotos] = useState<File[]>([]);
    const [notes, setNotes] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [totalPrice, setTotalPrice] = useState(0);
    const [totalDiscount, setTotalDiscount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [lineUserId, setLineUserId] = useState<string | null>(initialLineUserId || null);

    // Fetch all services
    useEffect(() => {
        const fetchServices = async () => {
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching services:', error);
                toast.error("サービスの読み込みに失敗しました");
            } else {
                setAllServices((data || []).map(mapDbServiceToService));
            }
            setLoading(false);
        };

        fetchServices();

        // Realtime subscription for services
        const servicesChannel = supabase
            .channel('services-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'services'
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setAllServices(prev => [...prev, mapDbServiceToService(payload.new)]);
                } else if (payload.eventType === 'UPDATE') {
                    setAllServices(prev => prev.map(s =>
                        s.id === payload.new.id ? mapDbServiceToService(payload.new) : s
                    ));
                } else if (payload.eventType === 'DELETE') {
                    setAllServices(prev => prev.filter(s => s.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(servicesChannel);
        };
    }, []);

    // Check for authenticated user (LINE Login)
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Extract LINE profile info
                const { user_metadata } = user;
                if (user_metadata) {
                    if (user_metadata.full_name || user_metadata.name) {
                        setCustomerName(user_metadata.full_name || user_metadata.name);
                    }
                    if (user_metadata.email) {
                        setCustomerEmail(user_metadata.email);
                    }
                    // LINE provider specific ID
                    if (user.app_metadata.provider === 'line' && user.user_metadata.sub) {
                        setLineUserId(user.user_metadata.sub);
                    }
                }
            }
        };
        checkUser();
    }, []);

    // Fetch options for selected services
    useEffect(() => {
        if (selectedServices.length === 0) {
            setAllOptions([]);
            return;
        }

        const fetchOptions = async () => {
            const serviceIds = selectedServices.map(s => s.serviceId);
            const { data, error } = await supabase
                .from('service_options')
                .select('*')
                .in('service_id', serviceIds);

            if (error) {
                console.error('Error fetching options:', error);
            } else {
                setAllOptions((data || []).map(mapDbOptionToOption));
            }
        };

        fetchOptions();

        // Realtime subscription for options
        const optionsChannel = supabase
            .channel('options-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'service_options'
            }, (payload) => {
                const serviceIds = selectedServices.map(s => s.serviceId);
                if (payload.eventType === 'INSERT' && serviceIds.includes(payload.new.service_id)) {
                    setAllOptions(prev => [...prev, mapDbOptionToOption(payload.new)]);
                } else if (payload.eventType === 'UPDATE') {
                    setAllOptions(prev => prev.map(o => o.id === payload.new.id ? mapDbOptionToOption(payload.new) : o));
                } else if (payload.eventType === 'DELETE') {
                    setAllOptions(prev => prev.filter(o => o.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(optionsChannel);
        };
    }, [selectedServices]);

    // Calculate total price
    useEffect(() => {
        let total = 0;
        let discount = 0;

        // Services total with quantity discounts
        selectedServices.forEach(({ service, quantity }) => {
            const baseTotal = service.basePrice * quantity;
            const { discount: serviceDiscount } = calculateDiscount(
                service.basePrice,
                quantity,
                service.quantityDiscounts || []
            );
            total += baseTotal - serviceDiscount;
            discount += serviceDiscount;
        });

        // Options total
        selectedOptions.forEach(({ option, quantity }) => {
            total += option.price * quantity;
        });

        setTotalPrice(total);
        setTotalDiscount(discount);
    }, [selectedServices, selectedOptions]);

    // Cleanup photo URLs
    useEffect(() => {
        return () => {
            photos.forEach(file => {
                if (file instanceof File) {
                    URL.revokeObjectURL(URL.createObjectURL(file));
                }
            });
        };
    }, [photos]);

    const handleServiceQuantityChange = (serviceId: string, newQuantity: number) => {
        if (newQuantity === 0) {
            // Remove service
            setSelectedServices(prev => prev.filter(s => s.serviceId !== serviceId));
            // Remove related options
            setSelectedOptions(prev => prev.filter(o => o.option.serviceId !== serviceId));
        } else {
            const service = allServices.find(s => s.id === serviceId);
            if (!service) return;

            setSelectedServices(prev => {
                const existing = prev.find(s => s.serviceId === serviceId);
                if (existing) {
                    return prev.map(s => s.serviceId === serviceId ? { ...s, quantity: newQuantity } : s);
                } else {
                    return [...prev, { serviceId, quantity: newQuantity, service }];
                }
            });
        }
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
        setSelectedOptions(prev => prev.map(o =>
            o.optionId === optionId ? { ...o, quantity: newQuantity } : o
        ));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setPhotos(prev => [...prev, ...newFiles].slice(0, 5));
        }
    };

    const handleRemovePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const submitBooking = async () => {
        // Validation
        if (selectedServices.length === 0) {
            toast.error("サービスを選択してください");
            return null;
        }

        if (!selectedDate || !selectedTime) {
            toast.error("日時を選択してください");
            return null;
        }

        if (!hasParking) {
            toast.error("駐車場の有無を選択してください");
            return null;
        }

        if (!customerName.trim()) {
            toast.error("お名前を入力してください");
            return null;
        }

        if (customerEmail && !customerEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            toast.error("有効なメールアドレスを入力してください");
            return null;
        }

        try {
            // 1. Get store ID
            let targetStoreId = storeId;

            if (!targetStoreId) {
                // Default to first non-HQ store if no storeId in URL
                const { data: storeData } = await supabase
                    .from('stores')
                    .select('id')
                    .eq('is_hq', false)
                    .limit(1)
                    .single();
                targetStoreId = storeData?.id;
            }

            if (!targetStoreId) {
                throw new Error("Store not found");
            }

            // --- Double Booking Prevention ---
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            const { data: existingBookings, error: checkError } = await supabase
                .from('bookings')
                .select('id')
                .eq('store_id', targetStoreId)
                .eq('selected_date', formattedDate)
                .eq('selected_time', selectedTime)
                .neq('status', 'cancelled');

            if (checkError) {
                console.error("Error checking availability:", checkError);
                toast.error("予約状況の確認に失敗しました");
                return null;
            }

            if (existingBookings && existingBookings.length > 0) {
                toast.error("申し訳ありませんが、この日時は既に予約が入ってしまいました。別の日時を選択してください。");
                return null;
            }
            // ---------------------------------

            // 2. Find or create customer (Customer Merging)
            let customerId: string | null = null;

            // Normalize phone number for search (remove hyphens)
            const normalizedPhone = customerPhone.replace(/-/g, '');

            if (customerEmail || normalizedPhone) {
                // Build query conditions
                let query = supabase
                    .from('customers')
                    .select('id')
                    .eq('store_id', targetStoreId);

                const conditions = [];
                if (customerEmail) conditions.push(`email.eq.${customerEmail}`);
                if (normalizedPhone) conditions.push(`phone.eq.${normalizedPhone}`); // Note: This assumes phone in DB is also normalized or we search loosely. Ideally DB phone should be normalized.
                // For now, let's try to match exact string if user entered hyphens, OR normalized if DB has no hyphens.
                // To be safe and simple without changing DB schema right now:
                // We will search by the exact phone string provided by user first.
                // Ideally we should clean data on insert.

                // Let's stick to the plan: Search by Email OR Phone (as provided)
                // If the user inputs 090-1234-5678, we search for that.
                if (customerPhone) conditions.push(`phone.eq.${customerPhone}`);

                if (conditions.length > 0) {
                    query = query.or(conditions.join(','));
                    const { data: existingCustomer } = await query.maybeSingle();

                    if (existingCustomer) {
                        customerId = existingCustomer.id;

                        // Update existing customer info to keep it fresh
                        await supabase
                            .from('customers')
                            .update({
                                name: customerName.trim(),
                                email: customerEmail.trim() || null,
                                phone: customerPhone.trim() || null,
                                // Only update line_user_id if it's currently null or we want to overwrite
                                ...(lineUserId ? { line_user_id: lineUserId } : {})
                            })
                            .eq('id', customerId);
                    }
                }
            }

            // If no existing customer found, create new one
            if (!customerId) {
                const { data: newCustomer, error: customerError } = await supabase
                    .from('customers')
                    .insert({
                        store_id: targetStoreId,
                        name: customerName.trim(),
                        email: customerEmail.trim() || null,
                        phone: customerPhone.trim() || null,
                        line_user_id: lineUserId || null,
                    })
                    .select('id')
                    .single();

                if (customerError) {
                    console.error("Customer creation error:", customerError);
                    throw customerError;
                }

                if (!newCustomer) {
                    throw new Error("Failed to create customer record");
                }

                customerId = newCustomer.id;
            }

            if (!customerId) {
                throw new Error("Customer ID is missing");
            }

            // 3. Create booking
            const { data: bookingData, error: bookingError } = await supabase
                .from('bookings')
                .insert({
                    store_id: targetStoreId,
                    customer_id: customerId,
                    customer_name: customerName.trim(),
                    customer_email: customerEmail.trim() || null,
                    customer_phone: customerPhone.trim() || null,
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

            // 4. Create booking_services records
            const servicesData = selectedServices.map(({ serviceId, quantity, service }) => ({
                booking_id: bookingData.id,
                service_id: serviceId,
                service_title: service.title,
                service_quantity: quantity,
                service_base_price: service.basePrice
            }));

            const { error: servicesError } = await supabase
                .from('booking_services')
                .insert(servicesData);

            if (servicesError) throw servicesError;

            // 5. Create booking_options records
            if (selectedOptions.length > 0) {
                const optionsData = selectedOptions.map(({ optionId, quantity, option }) => ({
                    booking_id: bookingData.id,
                    option_id: optionId,
                    option_title: option.title,
                    option_price: option.price,
                    option_quantity: quantity
                }));

                const { error: optionsError } = await supabase
                    .from('booking_options')
                    .insert(optionsData);

                if (optionsError) throw optionsError;
            }

            // Reset form
            setSelectedServices([]);
            setSelectedOptions([]);
            setSelectedDate(undefined);
            setSelectedTime(undefined);
            setHasParking("");
            setPhotos([]);
            setNotes("");
            setCustomerName("");
            setCustomerEmail("");
            setCustomerPhone("");

            return {
                date: selectedDate,
                time: selectedTime,
                serviceName: selectedServices.map(s => s.service.title).join(", "),
                totalPrice: totalPrice,
            };

        } catch (error) {
            console.error("Booking error:", error);
            toast.error("予約の送信に失敗しました");
            return null;
        }
    };

    const getOptionsForService = (serviceId: string) => {
        return allOptions.filter(o => o.serviceId === serviceId);
    };

    return {
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
    };
};
