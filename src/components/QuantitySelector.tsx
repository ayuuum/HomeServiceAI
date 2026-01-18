
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export const QuantitySelector = ({
  value,
  onChange,
  min = 0,
  max = 10,
}: QuantitySelectorProps) => {
  const handleDecrease = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrease = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11 sm:h-9 sm:w-9 touch-manipulation"
        onClick={handleDecrease}
        disabled={value <= min}
      >
        <Icon name="remove" size={18} className="sm:hidden" />
        <Icon name="remove" size={16} className="hidden sm:block" />
      </Button>
      <span className="w-6 text-center font-medium text-base">{value}</span>
      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11 sm:h-9 sm:w-9 touch-manipulation"
        onClick={handleIncrease}
        disabled={value >= max}
      >
        <Icon name="add" size={18} className="sm:hidden" />
        <Icon name="add" size={16} className="hidden sm:block" />
      </Button>
    </div>
  );
};

