import { ServiceOption } from "@/types/booking";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface OptionCheckboxProps {
  option: ServiceOption;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const OptionCheckbox = ({ option, checked, onChange }: OptionCheckboxProps) => {
  return (
    <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
      <Checkbox
        id={option.id}
        checked={checked}
        onCheckedChange={onChange}
        className="mt-1"
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
          +¥{option.price.toLocaleString()}
        </p>
      </div>
    </div>
  );
};
