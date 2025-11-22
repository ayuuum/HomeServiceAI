import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  min?: number;
  max?: number;
}

export const QuantitySelector = ({ 
  quantity, 
  onQuantityChange,
  min = 1,
  max = 10 
}: QuantitySelectorProps) => {
  const handleDecrement = () => {
    if (quantity > min) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < max) {
      onQuantityChange(quantity + 1);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground whitespace-nowrap">台数:</span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={handleDecrement}
          disabled={quantity <= min}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={handleIncrement}
          disabled={quantity >= max}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
