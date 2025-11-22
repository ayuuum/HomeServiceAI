interface QuantityDiscount {
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
