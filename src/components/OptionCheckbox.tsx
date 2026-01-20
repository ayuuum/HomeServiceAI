import { ServiceOption } from "@/types/booking";
import { QuantitySelector } from "@/components/QuantitySelector";
import { Check } from "lucide-react";

interface OptionCheckboxProps {
  option: ServiceOption;
  checked: boolean;
  quantity: number;
  onChange: (checked: boolean) => void;
  onQuantityChange: (quantity: number) => void;
}

export const OptionCheckbox = ({
  option,
  checked,
  quantity,
  onChange,
  onQuantityChange
}: OptionCheckboxProps) => {
  return (
    <div
      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200 cursor-pointer touch-manipulation ${
        checked 
          ? "border-primary bg-primary/5 border-2" 
          : "border-border hover:border-muted-foreground/50 bg-card"
      }`}
      onClick={() => onChange(!checked)}
    >
      {/* Left: Check + Title */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {checked && (
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
        <span className={`text-sm font-semibold truncate ${checked ? 'text-primary' : 'text-foreground'}`}>
          {option.title}
        </span>
      </div>
      
      {/* Right: Price + Quantity */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <span className="text-sm font-bold text-primary">
          +¥{(option.price * quantity).toLocaleString()}
        </span>
        {checked && (
          <div onClick={(e) => e.stopPropagation()}>
            <QuantitySelector
              value={quantity}
              onChange={onQuantityChange}
              min={1}
            />
          </div>
        )}
      </div>
    </div>
  );
};
