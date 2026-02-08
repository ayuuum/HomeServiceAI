import { useState, useEffect, useMemo } from "react";
import { SelectedService, SelectedOption } from "./useServices";
import {
    calculateDiscount,
    calculateSetDiscount,
    getSuggestedSetServices,
    SetDiscount,
    AppliedSetDiscount,
    ServiceSubtotal
} from "@/lib/discountCalculator";

/**
 * Hook for calculating total price including discounts and set discounts.
 * Extracted from useBooking for better testability and reusability.
 */
export const usePriceCalculation = (
    selectedServices: SelectedService[],
    selectedOptions: SelectedOption[],
    setDiscounts?: SetDiscount[]
) => {
    const [totalPrice, setTotalPrice] = useState(0);
    const [totalDiscount, setTotalDiscount] = useState(0);
    const [setDiscountTotal, setSetDiscountTotal] = useState(0);
    const [appliedSetDiscounts, setAppliedSetDiscounts] = useState<AppliedSetDiscount[]>([]);
    const [suggestedSetServices, setSuggestedSetServices] = useState<Array<{ serviceId: string; setDiscount: SetDiscount }>>([]);

    // Calculate total price
    useEffect(() => {
        let total = 0;
        let quantityDiscount = 0;
        const serviceSubtotals: ServiceSubtotal[] = [];

        // Services total with quantity discounts
        selectedServices.forEach(({ service, quantity }) => {
            const baseTotal = service.basePrice * quantity;
            const { discount: serviceDiscount } = calculateDiscount(
                service.basePrice,
                quantity,
                service.quantityDiscounts || []
            );
            const subtotal = baseTotal - serviceDiscount;
            total += subtotal;
            quantityDiscount += serviceDiscount;

            // Record subtotal for set discount calculation
            serviceSubtotals.push({
                serviceId: service.id,
                subtotal
            });
        });

        // Options total
        selectedOptions.forEach(({ option, quantity }) => {
            total += option.price * quantity;
        });

        // Apply set discounts
        if (setDiscounts && setDiscounts.length > 0) {
            const { totalDiscount: setDiscAmnt, appliedDiscounts } = calculateSetDiscount(
                serviceSubtotals,
                setDiscounts
            );
            setSetDiscountTotal(setDiscAmnt);
            setAppliedSetDiscounts(appliedDiscounts);
            total -= setDiscAmnt;

            // Update upsell suggestions
            const selectedServiceIds = selectedServices.map(s => s.service.id);
            const suggestions = getSuggestedSetServices(selectedServiceIds, setDiscounts);
            setSuggestedSetServices(suggestions);
        } else {
            setSetDiscountTotal(0);
            setAppliedSetDiscounts([]);
            setSuggestedSetServices([]);
        }

        setTotalPrice(total);
        setTotalDiscount(quantityDiscount);
    }, [selectedServices, selectedOptions, setDiscounts]);

    // Computed properties
    const hasSetDiscount = setDiscountTotal > 0;
    const totalDiscountAmount = totalDiscount + setDiscountTotal;

    return {
        totalPrice,
        totalDiscount,
        setDiscountTotal,
        appliedSetDiscounts,
        suggestedSetServices,
        hasSetDiscount,
        totalDiscountAmount,
    };
};
