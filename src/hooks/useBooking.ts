import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Service, ServiceOption } from "@/types/booking";
import { mapDbServiceToService, mapDbOptionToOption } from "@/lib/serviceMapper";
import { calculateDiscount } from "@/lib/discountCalculator";
import { toast } from "sonner";
import { format } from "date-fns";
import { useBookingStorage } from "./useBookingStorage";

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

export const useBooking = (organizationId?: string) => {
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
    const [customerLastName, setCustomerLastName] = useState("");
    const [customerFirstName, setCustomerFirstName] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerPostalCode, setCustomerPostalCode] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [customerAddressBuilding, setCustomerAddressBuilding] = useState("");
    const [totalPrice, setTotalPrice] = useState(0);
    const [totalDiscount, setTotalDiscount] = useState(0);
    const [loading, setLoading] = useState(true);
    
    // Storage hook for form persistence
    const { saveBookingData, loadBookingData, clearBookingData } = useBookingStorage(organizationId || '');
    const hasRestoredRef = useRef(false);
    const isRestoringRef = useRef(false);

    // Fetch services for the organization
    useEffect(() => {
        if (!organizationId) {
            setLoading(false);
            return;
        }

        const fetchServices = async () => {
            let query = supabase
                .from('services')
                .select('*')
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: true });

            const { data, error } = await query;

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
            .channel(`services-changes-${organizationId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'services',
                filter: `organization_id=eq.${organizationId}`
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
    }, [organizationId]);

    // Restore saved data from localStorage after services are loaded
    useEffect(() => {
        if (!organizationId || allServices.length === 0 || hasRestoredRef.current) return;
        
        const storedData = loadBookingData();
        if (!storedData) return;
        
        hasRestoredRef.current = true;
        isRestoringRef.current = true;
        
        // Restore services
        if (storedData.selectedServices?.length > 0) {
            const restoredServices: SelectedService[] = [];
            storedData.selectedServices.forEach(s => {
                const service = allServices.find(svc => svc.id === s.serviceId);
                if (service) {
                    restoredServices.push({ serviceId: s.serviceId, quantity: s.quantity, service });
                }
            });
            if (restoredServices.length > 0) {
                setSelectedServices(restoredServices);
            }
        }
        
        // Restore other fields
        if (storedData.selectedDate) setSelectedDate(new Date(storedData.selectedDate));
        if (storedData.selectedTime) setSelectedTime(storedData.selectedTime);
        if (storedData.hasParking) setHasParking(storedData.hasParking);
        if (storedData.customerLastName) setCustomerLastName(storedData.customerLastName);
        if (storedData.customerFirstName) setCustomerFirstName(storedData.customerFirstName);
        if (storedData.customerEmail) setCustomerEmail(storedData.customerEmail);
        if (storedData.customerPhone) setCustomerPhone(storedData.customerPhone);
        if (storedData.customerPostalCode) setCustomerPostalCode(storedData.customerPostalCode);
        if (storedData.customerAddress) setCustomerAddress(storedData.customerAddress);
        if (storedData.customerAddressBuilding) setCustomerAddressBuilding(storedData.customerAddressBuilding);
        if (storedData.notes) setNotes(storedData.notes);
        
        // Wait for options to load then restore them
        if (storedData.selectedOptions?.length > 0) {
            // Options will be restored after allOptions is populated
            const restoreOptions = () => {
                const restoredOptions: SelectedOption[] = [];
                storedData.selectedOptions.forEach(o => {
                    const option = allOptions.find(opt => opt.id === o.optionId);
                    if (option) {
                        restoredOptions.push({ optionId: o.optionId, quantity: o.quantity, option });
                    }
                });
                if (restoredOptions.length > 0) {
                    setSelectedOptions(restoredOptions);
                }
            };
            // Delay to wait for options fetch
            setTimeout(restoreOptions, 1000);
        }
        
        toast.info("前回の入力内容を復元しました");
        
        setTimeout(() => {
            isRestoringRef.current = false;
        }, 1500);
    }, [organizationId, allServices, loadBookingData, allOptions]);

    // Auto-save form data to localStorage (debounced)
    useEffect(() => {
        if (!organizationId || isRestoringRef.current) return;
        
        const timeoutId = setTimeout(() => {
            saveBookingData({
                selectedServices: selectedServices.map(s => ({ 
                    serviceId: s.serviceId, 
                    quantity: s.quantity 
                })),
                selectedOptions: selectedOptions.map(o => ({ 
                    optionId: o.optionId, 
                    quantity: o.quantity 
                })),
                selectedDate: selectedDate?.toISOString() || null,
                selectedTime: selectedTime || null,
                hasParking,
                customerLastName,
                customerFirstName,
                customerEmail,
                customerPhone,
                customerPostalCode,
                customerAddress,
                customerAddressBuilding,
                notes,
            });
        }, 500);
        
        return () => clearTimeout(timeoutId);
    }, [
        organizationId,
        selectedServices, 
        selectedOptions, 
        selectedDate, 
        selectedTime,
        hasParking, 
        customerLastName, 
        customerFirstName, 
        customerEmail, 
        customerPhone,
        customerPostalCode,
        customerAddress,
        customerAddressBuilding,
        notes,
        saveBookingData
    ]);

    // Monitor auth state and auto-fill user info
    useEffect(() => {
        const parseFullName = (fullName: string) => {
            const parts = fullName.trim().split(/\s+/);
            if (parts.length >= 2) {
                return { lastName: parts[0], firstName: parts.slice(1).join(' ') };
            }
            return { lastName: fullName, firstName: '' };
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (session?.user) {
                    const { user_metadata } = session.user;
                    if (user_metadata) {
                        if (user_metadata.full_name || user_metadata.name) {
                            const { lastName, firstName } = parseFullName(user_metadata.full_name || user_metadata.name);
                            setCustomerLastName(lastName);
                            setCustomerFirstName(firstName);
                        }
                    }
                    // Also set email from session
                    if (user_metadata?.email || session.user.email) {
                        setCustomerEmail(user_metadata?.email || session.user.email || "");
                    }
                }
            }
        );

        // Initial check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                const { user_metadata } = session.user;
                if (user_metadata) {
                    if (user_metadata.full_name || user_metadata.name) {
                        const { lastName, firstName } = parseFullName(user_metadata.full_name || user_metadata.name);
                        setCustomerLastName(lastName);
                        setCustomerFirstName(firstName);
                    }
                }
                if (user_metadata?.email || session.user.email) {
                    setCustomerEmail(user_metadata?.email || session.user.email || "");
                }
            }
        });

        return () => subscription.unsubscribe();
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

        const fullName = `${customerLastName} ${customerFirstName}`.trim();
        if (!fullName) {
            toast.error("お名前を入力してください");
            return null;
        }

        if (customerEmail && !customerEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            toast.error("有効なメールアドレスを入力してください");
            return null;
        }

        if (!organizationId) {
            toast.error("組織情報が取得できませんでした");
            return null;
        }

        try {
            // --- Double Booking Prevention ---
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            const { data: existingBookings, error: checkError } = await supabase
                .from('bookings')
                .select('id')
                .eq('organization_id', organizationId)
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

            try {
                // 1. Create or Find Customer
                let customerId: string | undefined;

                // Check if user is authenticated - only authenticated users can search existing customers
                const { data: { user } } = await supabase.auth.getUser();

                // Only search for existing customer if user is authenticated (has SELECT permission)
                if (user && (customerEmail || customerPhone)) {
                    // Build query conditions
                    let query = supabase
                        .from('customers')
                        .select('id');

                    const conditions = [];
                    if (customerEmail) conditions.push(`email.eq.${customerEmail}`);

                    if (customerPhone) {
                        // Search for both the input format and the normalized format (no hyphens)
                        const normalizedPhone = customerPhone.replace(/[^\d]/g, '');
                        conditions.push(`phone.eq.${customerPhone}`);
                        if (normalizedPhone !== customerPhone) {
                            conditions.push(`phone.eq.${normalizedPhone}`);
                        }
                    }

                    if (conditions.length > 0) {
                        query = query.or(conditions.join(','));
                        const { data: existingCustomer } = await query.maybeSingle();

                        if (existingCustomer) {
                            customerId = existingCustomer.id;
                            // Update existing customer info to keep it fresh
                            await supabase
                                .from('customers')
                                .update({
                                    name: `${customerLastName} ${customerFirstName}`.trim(),
                                    email: customerEmail.trim() || null,
                                    phone: customerPhone.trim() || null,
                                    postal_code: customerPostalCode.trim() || null,
                                    address: customerAddress.trim() || null,
                                    address_building: customerAddressBuilding.trim() || null,
                                })
                                .eq('id', customerId);
                        }
                    }
                }

                // For unauthenticated users or when no existing customer found, create new customer
                if (!customerId) {
                    // Use secure RPC function to create customer with organization validation
                    const { data: newCustomerId, error: customerError } = await supabase
                        .rpc('create_customer_secure', {
                            p_organization_id: organizationId,
                            p_name: `${customerLastName} ${customerFirstName}`.trim(),
                            p_email: customerEmail || null,
                            p_phone: customerPhone || null,
                            p_postal_code: customerPostalCode || null,
                            p_address: customerAddress || null,
                            p_address_building: customerAddressBuilding || null
                        });

                    if (customerError) throw customerError;
                    customerId = newCustomerId;
                }

                if (!customerId) {
                    throw new Error("Customer ID is missing");
                }

                // 2. Create Booking
                const newBookingId = crypto.randomUUID();
                const { error: bookingError } = await supabase
                    .from('bookings')
                    .insert({
                        id: newBookingId,
                        customer_id: customerId,
                        customer_name: `${customerLastName} ${customerFirstName}`.trim(),
                        customer_email: customerEmail.trim() || null,
                        customer_phone: customerPhone.trim() || null,
                        customer_address: customerAddress.trim() || null,
                        customer_address_building: customerAddressBuilding.trim() || null,
                        customer_postal_code: customerPostalCode.trim() || null,
                        selected_date: format(selectedDate, 'yyyy-MM-dd'),
                        selected_time: selectedTime,
                        total_price: totalPrice,
                        status: 'pending',
                        diagnosis_has_parking: hasParking === "yes",
                        diagnosis_notes: notes,
                        organization_id: organizationId
                    });

                if (bookingError) throw bookingError;

                // 4. Create booking_services records
                const servicesData = selectedServices.map(({ serviceId, quantity, service }) => ({
                    booking_id: newBookingId,
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
                        booking_id: newBookingId,
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

                // Send confirmation email if customer has email
                if (customerEmail.trim()) {
                    try {
                        console.log('[useBooking] Sending confirmation email for booking:', newBookingId);
                        const { error: emailError } = await supabase.functions.invoke('send-booking-email', {
                            body: { 
                                bookingId: newBookingId, 
                                emailType: 'confirmation' 
                            }
                        });
                        
                        if (emailError) {
                            console.error('[useBooking] Email send error:', emailError);
                            // Don't fail the booking if email fails
                        } else {
                            console.log('[useBooking] Confirmation email sent successfully');
                        }
                    } catch (emailErr) {
                        console.error('[useBooking] Email function error:', emailErr);
                        // Don't fail the booking if email fails
                    }
                }

                // Reset form and clear storage
                clearBookingData();
                setSelectedServices([]);
                setSelectedOptions([]);
                setSelectedDate(undefined);
                setSelectedTime(undefined);
                setHasParking("");
                setPhotos([]);
                setNotes("");
                setCustomerLastName("");
                setCustomerFirstName("");
                setCustomerEmail("");
                setCustomerPhone("");
                setCustomerPostalCode("");
                setCustomerAddress("");
                setCustomerAddressBuilding("");

                return {
                    date: selectedDate,
                    time: selectedTime,
                    serviceName: selectedServices.map(s => s.service.title).join(", "),
                    totalPrice: totalPrice,
                    customerName: `${customerLastName} ${customerFirstName}`.trim(),
                    customerPhone,
                    customerPostalCode,
                    customerAddress,
                    customerAddressBuilding,
                };

            } catch (error) {
                console.error("Booking error:", error);
                toast.error("予約の送信に失敗しました。もう一度お試しください。");
                return null;
            }
        } catch (outerError) {
            console.error("Outer booking error:", outerError);
            toast.error("予約処理中にエラーが発生しました");
            return null;
        }
    };

    const getOptionsForService = (serviceId: string) => {
        return allOptions.filter(o => o.serviceId === serviceId);
    };

    // AI recommendation helper
    const applyRecommendation = (serviceIds: string[], optionIds: string[]) => {
        // Clear existing selections
        setSelectedServices([]);
        setSelectedOptions([]);

        // Add recommended services
        serviceIds.forEach(id => {
            const service = allServices.find(s => s.id === id);
            if (service) {
                setSelectedServices(prev => [...prev, { serviceId: id, quantity: 1, service }]);
            }
        });

        // Add recommended options (after options are loaded)
        setTimeout(() => {
            optionIds.forEach(id => {
                const option = allOptions.find(o => o.id === id);
                if (option) {
                    setSelectedOptions(prev => [...prev, { optionId: id, quantity: 1, option }]);
                }
            });
        }, 500);
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
        applyRecommendation,
        clearBookingData,
    };
};
