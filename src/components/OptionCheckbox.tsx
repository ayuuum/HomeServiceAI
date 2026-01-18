import { ServiceOption } from "@/types/booking";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { QuantitySelector } from "@/components/QuantitySelector";

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
  const handleContainerClick = (e: React.MouseEvent) => {
    // Prevent toggle if clicking on QuantitySelector buttons
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    onChange(!checked);
  };

  return (
    <div 
      className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer touch-manipulation"
      onClick={handleContainerClick}
    >
      <div className="flex items-start space-x-3">
        <Checkbox
          id={option.id}
          checked={checked}
          onCheckedChange={onChange}
          className="mt-0.5"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1">
          <Label
            htmlFor={option.id}
            className="text-base font-medium cursor-pointer"
          >
            {option.title}
          </Label>
          {option.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {option.description}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-semibold text-primary">
            +¥{(option.price * quantity).toLocaleString()}
          </p>
        </div>
      </div>

      {checked && (
        <div className="mt-4 ml-9 sm:ml-8">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground whitespace-nowrap">数量:</span>
            <QuantitySelector
              value={quantity}
              onChange={onQuantityChange}
            />
          </div>
        </div>
      )}
    </div>
  );
};
