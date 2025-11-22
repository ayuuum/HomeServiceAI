import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StickyFooterProps {
  totalPrice: number;
  discount?: number;
  discountRate?: number;
  onNext: () => void;
  buttonText?: string;
}

export const StickyFooter = ({ 
  totalPrice, 
  discount = 0,
  discountRate = 0,
  onNext, 
  buttonText = "次へ進む" 
}: StickyFooterProps) => {
  return (
    <div className="sticky-footer">
      <div className="container max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            {discount > 0 && (
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="bg-success/10 text-success border-success/30">
                  {Math.round(discountRate * 100)}%オフ
                </Badge>
                <span className="text-sm text-success font-medium">
                  -¥{discount.toLocaleString()}
                </span>
              </div>
            )}
            <p className="text-sm text-muted-foreground">合計金額</p>
            <p className="text-2xl font-bold text-foreground">
              ¥{totalPrice.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-1">税込</span>
            </p>
          </div>
          <Button 
            size="lg" 
            onClick={onNext}
            className="btn-primary gap-2"
          >
            {buttonText}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
