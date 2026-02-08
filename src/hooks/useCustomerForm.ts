import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import liff from "@line/liff";

interface CustomerFormData {
    lastName: string;
    firstName: string;
    email: string;
    phone: string;
    postalCode: string;
    address: string;
    addressBuilding: string;
}

/**
 * Hook for managing customer form state.
 * Handles auto-fill from Supabase auth and LIFF profile.
 */
export const useCustomerForm = (organizationId?: string, liffId?: string) => {
    const [customerLastName, setCustomerLastName] = useState("");
    const [customerFirstName, setCustomerFirstName] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerPostalCode, setCustomerPostalCode] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [customerAddressBuilding, setCustomerAddressBuilding] = useState("");
    const [lineUserId, setLineUserId] = useState<string | null>(null);
    const [isLiffInitialized, setIsLiffInitialized] = useState(false);

    // Helper to parse full name into last/first
    const parseFullName = (fullName: string) => {
        const parts = fullName.trim().split(/\s+/);
        if (parts.length >= 2) {
            return { lastName: parts[0], firstName: parts.slice(1).join(' ') };
        }
        return { lastName: fullName, firstName: '' };
    };

    // Monitor auth state and auto-fill user info
    useEffect(() => {
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
                            const { lastName, firstName } = parseFullName(customer.name);
                            setCustomerLastName(lastName);
                            setCustomerFirstName(firstName);
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

    const clearForm = () => {
        setCustomerLastName("");
        setCustomerFirstName("");
        setCustomerEmail("");
        setCustomerPhone("");
        setCustomerPostalCode("");
        setCustomerAddress("");
        setCustomerAddressBuilding("");
    };

    const validateForm = (): string | null => {
        const fullName = `${customerLastName} ${customerFirstName}`.trim();
        if (!fullName) {
            return "お名前を入力してください";
        }

        if (!customerEmail) {
            return "メールアドレスを入力してください";
        }

        if (!customerEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return "有効なメールアドレスを入力してください";
        }

        return null;
    };

    const getFormData = (): CustomerFormData => ({
        lastName: customerLastName,
        firstName: customerFirstName,
        email: customerEmail,
        phone: customerPhone,
        postalCode: customerPostalCode,
        address: customerAddress,
        addressBuilding: customerAddressBuilding,
    });

    const setFormData = (data: Partial<CustomerFormData>) => {
        if (data.lastName !== undefined) setCustomerLastName(data.lastName);
        if (data.firstName !== undefined) setCustomerFirstName(data.firstName);
        if (data.email !== undefined) setCustomerEmail(data.email);
        if (data.phone !== undefined) setCustomerPhone(data.phone);
        if (data.postalCode !== undefined) setCustomerPostalCode(data.postalCode);
        if (data.address !== undefined) setCustomerAddress(data.address);
        if (data.addressBuilding !== undefined) setCustomerAddressBuilding(data.addressBuilding);
    };

    return {
        // State values
        customerLastName,
        customerFirstName,
        customerEmail,
        customerPhone,
        customerPostalCode,
        customerAddress,
        customerAddressBuilding,
        lineUserId,
        // Setters
        setCustomerLastName,
        setCustomerFirstName,
        setCustomerEmail,
        setCustomerPhone,
        setCustomerPostalCode,
        setCustomerAddress,
        setCustomerAddressBuilding,
        // Utilities
        clearForm,
        validateForm,
        getFormData,
        setFormData,
    };
};
