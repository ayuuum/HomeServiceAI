import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Service, ServiceOption } from "@/types/booking";
import { mapDbServiceToService, mapDbOptionToOption } from "@/lib/serviceMapper";
import { calculateDiscount } from "@/lib/discountCalculator";
import { calculateSetDiscounts, SetDiscountDefinition, AppliedSetDiscount } from "@/lib/discountCalculator";
import { toast } from "sonner";
import { format } from "date-fns";
import { useBookingStorage } from "./useBookingStorage";
import liff from "@line/liff";

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

export const useBooking = (organizationId?: string, liffId?: string) => {
    // State management
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
    const [allOptions, setAllOptions] = useState<ServiceOption[]>([]);
    const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
    // 希望日時（3つ）
    const [preferences, setPreferences] = useState<{ date: Date | undefined; time: string | undefined }[]>([
        { date: undefined, time: undefined },
        { date: undefined, time: undefined },
        { date: undefined, time: undefined },
    ]);
    // 後方互換性のため selectedDate/selectedTime も維持（第1希望を参照）
    const selectedDate = preferences[0]?.date;
    const selectedTime = preferences[0]?.time;
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
    const [appliedSetDiscounts, setAppliedSetDiscounts] = useState<AppliedSetDiscount[]>([]);
    const [setDiscountDefinitions, setSetDiscountDefinitions] = useState<SetDiscountDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [lineUserId, setLineUserId] = useState<string | null>(null);
    const [isLiffInitialized, setIsLiffInitialized] = useState(false);

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

        // Restore preferences
        if (storedData.preferences) {
            setPreferences(storedData.preferences.map((p: any) => ({
                date: p.date ? new Date(p.date) : undefined,
                time: p.time || undefined
            })));
        } else {
            // Legacy support: restore from selectedDate/selectedTime
            if (storedData.selectedDate || storedData.selectedTime) {
                setPreferences([
                    { date: storedData.selectedDate ? new Date(storedData.selectedDate) : undefined, time: storedData.selectedTime || undefined },
                    { date: undefined, time: undefined },
                    { date: undefined, time: undefined },
                ]);
            }
        }
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
                preferences: preferences.map(p => ({
                    date: p.date?.toISOString() || null,
                    time: p.time || null
                })),
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
        preferences,
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

    // Initialize LIFF and fetch LINE user info
    useEffect(() => {
        if (!liffId || isLiffInitialized) return;

        const initLiff = async () => {
            try {
                await liff.init({ liffId });
                setIsLiffInitialized(true);

                if (liff.isLoggedIn()) {
                    const profile = await liff.getProfile();
                    setLineUserId(profile.userId);

                    // Fetch existing customer info by line_user_id
                    const { data: customer, error } = await supabase
                        .from('customers')
                        .select('*')
                        .eq('line_user_id', profile.userId)
                        .eq('organization_id', organizationId)
                        .maybeSingle();

                    if (!error && customer) {
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

                        toast.info("LINEアカウントの登録情報を復元しました");
                    }
                }
            } catch (err) {
                console.error("LIFF initialization failed", err);
            }
        };

        initLiff();
    }, [liffId, organizationId, isLiffInitialized]);

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

    // Fetch set discount definitions when organization loads
    useEffect(() => {
        if (!organizationId) return;
        const fetchSetDiscounts = async () => {
            const { data } = await supabase
                .from('organizations')
                .select('service_set_discounts')
                .eq('id', organizationId)
                .single();
            if (data?.service_set_discounts) {
                setSetDiscountDefinitions(data.service_set_discounts as unknown as SetDiscountDefinition[]);
            }
        };
        fetchSetDiscounts();
    }, [organizationId]);

    // Calculate total price
    useEffect(() => {
        let subtotal = 0;
        let quantityDiscount = 0;

        // Services total with quantity discounts
        selectedServices.forEach(({ service, quantity }) => {
            const baseTotal = service.basePrice * quantity;
            const { discount: serviceDiscount } = calculateDiscount(
                service.basePrice,
                quantity,
                service.quantityDiscounts || []
            );
            subtotal += baseTotal - serviceDiscount;
            quantityDiscount += serviceDiscount;
        });

        // Options total
        selectedOptions.forEach(({ option, quantity }) => {
            subtotal += option.price * quantity;
        });

        // Set discounts (applied on subtotal after quantity discounts)
        const serviceIds = selectedServices.map(s => s.serviceId);
        const { appliedDiscounts, totalSetDiscount } = calculateSetDiscounts(
            serviceIds,
            setDiscountDefinitions,
            subtotal
        );

        setAppliedSetDiscounts(appliedDiscounts);
        setTotalPrice(subtotal - totalSetDiscount);
        setTotalDiscount(quantityDiscount + totalSetDiscount);
    }, [selectedServices, selectedOptions, setDiscountDefinitions]);

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

        if (!customerEmail) {
            toast.error("メールアドレスを入力してください");
            return null;
        }

        if (!customerEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
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
                // 1. Find or Create Customer using secure RPC function
                // This function handles:
                // - Search by line_user_id (highest priority)
                // - Search by phone number (normalized)
                // - Search by email
                // - Create new customer if no match found
                // - Update existing customer info if found
                const { data: customerId, error: customerError } = await supabase
                    .rpc('find_or_create_customer', {
                        p_organization_id: organizationId,
                        p_name: `${customerLastName} ${customerFirstName}`.trim(),
                        p_email: customerEmail || null,
                        p_phone: customerPhone || null,
                        p_postal_code: customerPostalCode || null,
                        p_address: customerAddress || null,
                        p_address_building: customerAddressBuilding || null,
                        p_line_user_id: lineUserId || null,
                        p_avatar_url: null
                    });

                if (customerError) {
                    console.error("Error finding/creating customer:", customerError);
                    throw customerError;
                }

                if (!customerId) {
                    throw new Error("Customer ID is missing");
                }

                // 2. Create Booking using secure RPC
                const { data: newBookingId, error: bookingError } = await supabase
                    .rpc('create_booking_secure', {
                        p_organization_id: organizationId,
                        p_customer_id: customerId,
                        p_customer_name: `${customerLastName} ${customerFirstName}`.trim(),
                        p_customer_email: customerEmail.trim() || null,
                        p_customer_phone: customerPhone.trim() || null,
                        p_customer_address: customerAddress.trim() || null,
                        p_customer_address_building: customerAddressBuilding.trim() || null,
                        p_customer_postal_code: customerPostalCode.trim() || null,
                        p_selected_date: format(selectedDate!, 'yyyy-MM-dd'),
                        p_selected_time: selectedTime,
                        p_preference1_date: preferences[0]?.date ? format(preferences[0].date, 'yyyy-MM-dd') : null,
                        p_preference1_time: preferences[0]?.time || null,
                        p_preference2_date: preferences[1]?.date ? format(preferences[1].date, 'yyyy-MM-dd') : null,
                        p_preference2_time: preferences[1]?.time || null,
                        p_preference3_date: preferences[2]?.date ? format(preferences[2].date, 'yyyy-MM-dd') : null,
                        p_preference3_time: preferences[2]?.time || null,
                        p_total_price: totalPrice,
                        p_diagnosis_has_parking: hasParking === "yes",
                        p_diagnosis_notes: notes
                    });

                if (bookingError) throw bookingError;
                if (!newBookingId) throw new Error("Booking creation failed: No ID returned");

                const bookingId = newBookingId as unknown as string;

                // 4. Create booking_services records
                const servicesData = selectedServices.map(({ serviceId, quantity, service }) => ({
                    booking_id: bookingId,
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
                        booking_id: bookingId,
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

                // Send confirmation notification
                try {
                    console.log('[useBooking] Sending confirmation notification for booking:', newBookingId);
                    const { error: emailError } = await supabase.functions.invoke('send-hybrid-notification', {
                        body: {
                            bookingId: newBookingId,
                            notificationType: 'pending'
                        }
                    });

                    if (emailError) {
                        console.error('[useBooking] Notification send error:', emailError);
                        // Don't fail the booking if notification fails
                    } else {
                        console.log('[useBooking] Confirmation notification sent successfully');
                    }
                } catch (emailErr) {
                    console.error('[useBooking] Notification function error:', emailErr);
                    // Don't fail the booking if notification fails
                }

                // Send admin notification for new booking
                try {
                    console.log('[useBooking] Sending admin notification for new booking:', newBookingId);
                    const { error: adminEmailError } = await supabase.functions.invoke('send-hybrid-notification', {
                        body: {
                            bookingId: newBookingId,
                            notificationType: 'admin_notification',
                            adminNotificationType: 'new_booking'
                        }
                    });

                    if (adminEmailError) {
                        console.error('[useBooking] Admin notification error:', adminEmailError);
                    } else {
                        console.log('[useBooking] Admin notification sent successfully');
                    }
                } catch (adminEmailErr) {
                    console.error('[useBooking] Admin notification function error:', adminEmailErr);
                    // Don't fail the booking if admin notification fails
                }

                // Create in-app notification for new booking request
                try {
                    console.log('[useBooking] Creating in-app notification for new booking:', newBookingId);
                    const { error: notificationError } = await supabase
                        .from('notifications')
                        .insert({
                            organization_id: organizationId,
                            type: 'new_booking',
                            title: `${customerLastName} ${customerFirstName}様から予約リクエスト`,
                            message: `${selectedServices.map(s => s.service.title).join('、')} - ${format(selectedDate!, 'M/d')} ${selectedTime}`,
                            resource_type: 'booking',
                            resource_id: bookingId
                        });

                    if (notificationError) {
                        console.error('[useBooking] In-app notification error:', notificationError);
                    } else {
                        console.log('[useBooking] In-app notification created successfully');
                    }
                } catch (notifErr) {
                    console.error('[useBooking] In-app notification error:', notifErr);
                    // Don't fail the booking if notification fails
                }

                // Reset form and clear storage
                clearBookingData();
                setSelectedServices([]);
                setSelectedOptions([]);
                setPreferences([
                    { date: undefined, time: undefined },
                    { date: undefined, time: undefined },
                    { date: undefined, time: undefined },
                ]);
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
                    preferences: preferences.filter(p => p.date && p.time).map(p => ({
                        date: p.date!,
                        time: p.time!
                    })),
                    serviceName: selectedServices.map(s => s.service.title).join(", "),
                    totalPrice: totalPrice,
                    customerName: `${customerLastName} ${customerFirstName}`.trim(),
                    customerPhone,
                    customerPostalCode,
                    customerAddress,
                    customerAddressBuilding,
                    hasParking,
                    notes,
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
        // 新しい3候補のインターフェース
        preferences,
        setPreferences,
        // 後方互換性のため残す（読み取り専用）
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
        appliedSetDiscounts,
        setDiscountDefinitions,
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
