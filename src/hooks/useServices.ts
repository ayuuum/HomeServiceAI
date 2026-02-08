import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Service, ServiceOption } from "@/types/booking";
import { mapDbServiceToService, mapDbOptionToOption } from "@/lib/serviceMapper";
import { toast } from "sonner";

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

/**
 * Hook for managing service and option selection logic.
 * Extracted from useBooking to improve maintainability.
 */
export const useServices = (organizationId?: string) => {
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
    const [allOptions, setAllOptions] = useState<ServiceOption[]>([]);
    const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
    const [loading, setLoading] = useState(true);

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

    const getOptionsForService = (serviceId: string) => {
        return allOptions.filter(o => o.serviceId === serviceId);
    };

    const clearSelections = () => {
        setSelectedServices([]);
        setSelectedOptions([]);
    };

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
        setSelectedServices,
        allOptions,
        selectedOptions,
        setSelectedOptions,
        loading,
        handleServiceQuantityChange,
        handleOptionChange,
        handleOptionQuantityChange,
        getOptionsForService,
        clearSelections,
        applyRecommendation,
    };
};
