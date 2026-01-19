import { ServiceOption } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuantitySelector } from "@/components/QuantitySelector";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    <Card className={`border-2 border-dashed transition-all duration-200 ${
      checked 
        ? "border-primary bg-primary/10" 
        : "border-border hover:border-muted-foreground/50"
    }`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-foreground mb-1">
              {option.title}
            </h4>
            {option.description && (
              <p className="text-xs text-muted-foreground mb-1.5 line-clamp-2">
                {option.description}
              </p>
            )}
            <p className="text-base font-bold text-primary">
              +¥{(option.price * quantity).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Selection button or selected state */}
        <div className="mt-2">
          {!checked ? (
            <Button
              variant="outline"
              className="w-full h-9 text-sm font-semibold border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors touch-manipulation"
              onClick={() => onChange(true)}
            >
              選択する
            </Button>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {/* Selected indicator */}
                <Button
                  className="w-full h-9 text-sm font-semibold bg-primary text-white hover:bg-primary/90 touch-manipulation"
                  onClick={() => onChange(false)}
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  選択中
                </Button>
                
                {/* Quantity selector */}
                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                  <span className="text-sm font-medium text-foreground">数量</span>
                  <QuantitySelector
                    value={quantity}
                    onChange={onQuantityChange}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
