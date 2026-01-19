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
        ? "border-primary bg-primary/5" 
        : "border-border hover:border-muted-foreground/50"
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-foreground mb-1">
              {option.title}
            </h4>
            {option.description && (
              <p className="text-sm text-muted-foreground mb-2">
                {option.description}
              </p>
            )}
            <p className="text-lg font-bold text-primary">
              +¥{(option.price * quantity).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Selection button or selected state */}
        <div className="mt-3">
          {!checked ? (
            <Button
              variant="outline"
              className="w-full h-11 text-base border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors touch-manipulation"
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
                className="space-y-3"
              >
                {/* Selected indicator */}
                <Button
                  className="w-full h-11 text-base bg-primary text-primary-foreground hover:bg-primary/90 touch-manipulation"
                  onClick={() => onChange(false)}
                >
                  <Check className="w-5 h-5 mr-2" />
                  選択中
                </Button>
                
                {/* Quantity selector */}
                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
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
