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
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="icon"
        className="h-12 w-12 touch-manipulation rounded-full border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
        onClick={handleDecrease}
        disabled={value <= min}
      >
        <Icon name="remove" size={22} />
      </Button>
      <span className="w-12 text-center font-bold text-xl tabular-nums">{value}</span>
      <Button
        variant="outline"
        size="icon"
        className="h-12 w-12 touch-manipulation rounded-full border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
        onClick={handleIncrease}
        disabled={value >= max}
      >
        <Icon name="add" size={22} />
      </Button>
    </div>
  );
};
