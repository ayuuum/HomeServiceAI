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
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-12 w-12 sm:h-10 sm:w-10 touch-manipulation rounded-full border-2"
        onClick={handleDecrease}
        disabled={value <= min}
      >
        <Icon name="remove" size={20} className="sm:hidden" />
        <Icon name="remove" size={18} className="hidden sm:block" />
      </Button>
      <span className="w-10 text-center font-bold text-lg tabular-nums">{value}</span>
      <Button
        variant="outline"
        size="icon"
        className="h-12 w-12 sm:h-10 sm:w-10 touch-manipulation rounded-full border-2"
        onClick={handleIncrease}
        disabled={value >= max}
      >
        <Icon name="add" size={20} className="sm:hidden" />
        <Icon name="add" size={18} className="hidden sm:block" />
      </Button>
    </div>
  );
};
