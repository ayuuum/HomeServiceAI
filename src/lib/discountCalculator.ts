export interface QuantityDiscount {
  min_quantity: number;
  discount_rate: number;
}

export const calculateDiscount = (
  basePrice: number,
  quantity: number,
  discounts: QuantityDiscount[]
): { discount: number; discountRate: number } => {
  if (!discounts || discounts.length === 0) {
    return { discount: 0, discountRate: 0 };
  }

  // Find the highest applicable discount
  const applicableDiscount = discounts
    .filter(d => quantity >= d.min_quantity)
    .sort((a, b) => b.discount_rate - a.discount_rate)[0];

  if (!applicableDiscount) {
    return { discount: 0, discountRate: 0 };
  }

  const discount = Math.floor(basePrice * quantity * applicableDiscount.discount_rate);
  return { discount, discountRate: applicableDiscount.discount_rate };
};

/**
 * Get the next discount tier that the user can achieve
 * Returns null if user is already at the highest tier or no discounts exist
 */
export const getNextDiscountTier = (
  basePrice: number,
  currentQuantity: number,
  discounts: QuantityDiscount[]
): { remaining: number; rate: number; savings: number } | null => {
  if (!discounts || discounts.length === 0) return null;
  
  const sortedDiscounts = [...discounts].sort((a, b) => a.min_quantity - b.min_quantity);
  const nextTier = sortedDiscounts.find(d => currentQuantity < d.min_quantity);
  
  if (!nextTier) return null;
  
  return {
    remaining: nextTier.min_quantity - currentQuantity,
    rate: nextTier.discount_rate,
    savings: Math.floor(basePrice * nextTier.min_quantity * nextTier.discount_rate)
  };
};

// ============ Set Discount (Cross-Service Bundle) ============

export interface SetDiscountDefinition {
  id: string;
  title: string;
  service_ids: string[];
  discount_rate: number;
  description?: string;
}

export interface AppliedSetDiscount {
  id: string;
  title: string;
  discountRate: number;
  discountAmount: number;
  description?: string;
}

/**
 * Find all applicable set discounts based on selected service IDs.
 * Multiple sets can apply simultaneously if conditions are met.
 */
export const calculateSetDiscounts = (
  selectedServiceIds: string[],
  setDiscountDefinitions: SetDiscountDefinition[],
  subtotalAfterQuantityDiscount: number
): { appliedDiscounts: AppliedSetDiscount[]; totalSetDiscount: number } => {
  if (!setDiscountDefinitions || setDiscountDefinitions.length === 0 || selectedServiceIds.length < 2) {
    return { appliedDiscounts: [], totalSetDiscount: 0 };
  }

  const appliedDiscounts: AppliedSetDiscount[] = [];

  for (const def of setDiscountDefinitions) {
    // Check if all required service IDs are present in the selection
    const allIncluded = def.service_ids.every(id => selectedServiceIds.includes(id));
    if (allIncluded && def.service_ids.length >= 2) {
      const discountAmount = Math.floor(subtotalAfterQuantityDiscount * def.discount_rate);
      appliedDiscounts.push({
        id: def.id,
        title: def.title,
        discountRate: def.discount_rate,
        discountAmount,
        description: def.description,
      });
    }
  }

  // If multiple sets apply, use the best one (highest discount amount)
  if (appliedDiscounts.length > 1) {
    appliedDiscounts.sort((a, b) => b.discountAmount - a.discountAmount);
    const best = appliedDiscounts[0];
    return { appliedDiscounts: [best], totalSetDiscount: best.discountAmount };
  }

  const totalSetDiscount = appliedDiscounts.reduce((sum, d) => sum + d.discountAmount, 0);
  return { appliedDiscounts, totalSetDiscount };
};

/**
 * Find set discounts that could be unlocked by adding one more service.
 * Returns suggestions like "Add service X to get 10% off".
 */
export const getSetDiscountSuggestions = (
  selectedServiceIds: string[],
  setDiscountDefinitions: SetDiscountDefinition[]
): { definition: SetDiscountDefinition; missingServiceIds: string[] }[] => {
  if (!setDiscountDefinitions || setDiscountDefinitions.length === 0) {
    return [];
  }

  const suggestions: { definition: SetDiscountDefinition; missingServiceIds: string[] }[] = [];

  for (const def of setDiscountDefinitions) {
    const missingIds = def.service_ids.filter(id => !selectedServiceIds.includes(id));
    // Only suggest if exactly 1 service is missing (close to qualifying)
    if (missingIds.length === 1 && selectedServiceIds.length > 0) {
      suggestions.push({ definition: def, missingServiceIds: missingIds });
    }
  }

  return suggestions;
};
