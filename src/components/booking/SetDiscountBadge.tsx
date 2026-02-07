import { AppliedSetDiscount } from "@/lib/discountCalculator";
import { PartyPopper } from "lucide-react";

interface SetDiscountBadgeProps {
  appliedDiscounts: AppliedSetDiscount[];
}

export function SetDiscountBadge({ appliedDiscounts }: SetDiscountBadgeProps) {
  if (appliedDiscounts.length === 0) return null;

  return (
    <div className="space-y-2">
      {appliedDiscounts.map((discount) => (
        <div
          key={discount.id}
          className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2.5 text-sm"
        >
          <PartyPopper className="w-4 h-4 text-accent shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="font-semibold">セット割が適用されます！</span>
            <span className="ml-1 text-muted-foreground">
              「{discount.title}」 -¥{discount.discountAmount.toLocaleString()}
              （{Math.round(discount.discountRate * 100)}%OFF）
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
