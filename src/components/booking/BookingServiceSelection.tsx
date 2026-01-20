import { Service, ServiceOption } from "@/types/booking";
import { SelectedService, SelectedOption } from "@/hooks/useBooking";
import { Badge } from "@/components/ui/badge";
import { QuantitySelector } from "@/components/QuantitySelector";
import { OptionCheckbox } from "@/components/OptionCheckbox";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/icon";
import { Check } from "lucide-react";

interface BookingServiceSelectionProps {
    allServices: Service[];
    selectedServices: SelectedService[];
    allOptions: ServiceOption[];
    selectedOptions: SelectedOption[];
    onServiceQuantityChange: (serviceId: string, quantity: number) => void;
    onOptionChange: (optionId: string, checked: boolean) => void;
    onOptionQuantityChange: (optionId: string, quantity: number) => void;
    getOptionsForService: (serviceId: string) => ServiceOption[];
}

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.04
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.15, ease: "easeOut" as const } }
};

export const BookingServiceSelection = ({
    allServices,
    selectedServices,
    allOptions,
    selectedOptions,
    onServiceQuantityChange,
    onOptionChange,
    onOptionQuantityChange,
    getOptionsForService,
}: BookingServiceSelectionProps) => {
    return (
        <div className="space-y-3">
            <section>
                {/* Header with required badge and icon */}
                <div className="flex items-center gap-2 mb-2">
                    <Icon name="auto_awesome" size={18} className="text-primary" />
                    <h3 className="text-base font-bold">サービスを選ぶ</h3>
                    <Badge className="bg-destructive text-white hover:bg-destructive text-xs px-1.5 py-0">
                        必須
                    </Badge>
                </div>

                <p className="text-xs text-muted-foreground mb-3">
                    ご希望のサービスを選択してください
                </p>

                <motion.div
                    className="space-y-1.5"
                    variants={container}
                    initial="hidden"
                    animate="show"
                >
                    {allServices.map((service) => {
                        const selectedService = selectedServices.find(s => s.serviceId === service.id);
                        const quantity = selectedService?.quantity || 0;
                        const isSelected = quantity > 0;

                        return (
                            <motion.div key={service.id} variants={item}>
                                {/* Simple 1-line list item - L-step style */}
                                <div
                                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200 cursor-pointer touch-manipulation ${
                                        isSelected 
                                            ? "border-primary bg-primary/5 border-2" 
                                            : "border-border hover:border-muted-foreground/50 bg-card"
                                    }`}
                                    onClick={() => {
                                        if (!isSelected) {
                                            onServiceQuantityChange(service.id, 1);
                                        }
                                    }}
                                >
                                    {/* Left: Title + Price in one line */}
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        {isSelected && (
                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                        <span className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                            {service.title}
                                        </span>
                                        <span className="text-xs text-muted-foreground flex-shrink-0">
                                            {service.duration}分
                                        </span>
                                    </div>
                                    
                                    {/* Right: Price + Quantity */}
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                        <span className="text-sm font-bold text-primary">
                                            ¥{service.basePrice.toLocaleString()}
                                        </span>
                                        {isSelected && (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <QuantitySelector
                                                    value={quantity}
                                                    onChange={(newQty) => onServiceQuantityChange(service.id, newQty)}
                                                    min={0}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </section>

            {/* Options section */}
            <AnimatePresence>
                {selectedServices.length > 0 && allOptions.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <Separator className="mb-3" />
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name="auto_awesome" size={16} className="text-primary" />
                            <h3 className="text-base font-bold">オプションを追加</h3>
                            <Badge variant="outline" className="text-xs px-1.5 py-0">任意</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                            選択したサービスに追加できるオプションです
                        </p>

                        {selectedServices.map(({ serviceId, service }) => {
                            const serviceOptions = getOptionsForService(serviceId);
                            if (serviceOptions.length === 0) return null;

                            return (
                                <div key={serviceId} className="mb-3">
                                    <h4 className="font-bold mb-1.5 text-xs text-muted-foreground">
                                        {service.title} のオプション
                                    </h4>
                                    <div className="space-y-1.5">
                                        {serviceOptions.map((option) => {
                                            const selected = selectedOptions.find(o => o.optionId === option.id);
                                            return (
                                                <OptionCheckbox
                                                    key={option.id}
                                                    option={option}
                                                    checked={!!selected}
                                                    quantity={selected?.quantity || 1}
                                                    onChange={(checked) => onOptionChange(option.id, checked)}
                                                    onQuantityChange={(qty) => onOptionQuantityChange(option.id, qty)}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </motion.section>
                )}
            </AnimatePresence>
        </div>
    );
};
