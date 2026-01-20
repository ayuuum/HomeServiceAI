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
  
  // Find the next tier that hasn't been reached yet
  const sortedDiscounts = [...discounts].sort((a, b) => a.min_quantity - b.min_quantity);
  const nextTier = sortedDiscounts.find(d => currentQuantity < d.min_quantity);
  
  if (!nextTier) return null;
  
  return {
    remaining: nextTier.min_quantity - currentQuantity,
    rate: nextTier.discount_rate,
    savings: Math.floor(basePrice * nextTier.min_quantity * nextTier.discount_rate)
  };
};
