import { Service, ServiceOption } from "@/types/booking";
import { SelectedService, SelectedOption } from "@/hooks/useBooking";
import { Badge } from "@/components/ui/badge";
import { QuantitySelector } from "@/components/QuantitySelector";
import { OptionCheckbox } from "@/components/OptionCheckbox";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/icon";
import { Check } from "lucide-react";
import { calculateDiscount, getNextDiscountTier } from "@/lib/discountCalculator";

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
                        
                        // Calculate current discount and next tier
                        const currentDiscount = isSelected && service.quantityDiscounts?.length
                            ? calculateDiscount(service.basePrice, quantity, service.quantityDiscounts)
                            : { discount: 0, discountRate: 0 };
                        
                        const nextTier = isSelected && service.quantityDiscounts?.length
                            ? getNextDiscountTier(service.basePrice, quantity, service.quantityDiscounts)
                            : null;

                        return (
                            <motion.div key={service.id} variants={item}>
                                {/* Simple 1-line list item - L-step style */}
                                <div
                                    className={`flex flex-col p-2.5 rounded-lg border transition-all duration-200 cursor-pointer touch-manipulation ${
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
                                    {/* Main row */}
                                    <div className="flex items-center justify-between">
                                        {/* Left: Circular image + Title + Duration */}
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            {/* Circular thumbnail - L-step style */}
                                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                                                {service.imageUrl ? (
                                                    <img 
                                                        src={service.imageUrl} 
                                                        alt={service.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Icon name="cleaning_services" size={20} className="text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Check mark when selected */}
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

                                    {/* Discount tiers display - show when service is selected and has discounts */}
                                    <AnimatePresence>
                                        {isSelected && service.quantityDiscounts && service.quantityDiscounts.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-2 space-y-1.5"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {/* Available discount tiers */}
                                                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-2.5 py-1.5">
                                                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
                                                        <Icon name="sell" size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                                        <span className="text-xs font-medium">
                                                            {service.quantityDiscounts
                                                                .sort((a, b) => a.min_quantity - b.min_quantity)
                                                                .map((d, i, arr) => (
                                                                    <span key={i}>
                                                                        {d.min_quantity}台で{Math.round(d.discount_rate * 100)}%OFF
                                                                        {i < arr.length - 1 && ' • '}
                                                                    </span>
                                                                ))}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Current discount applied */}
                                                {currentDiscount.discountRate > 0 && (
                                                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                                        <Icon name="check_circle" size={14} className="flex-shrink-0" />
                                                        <span className="text-xs font-medium">
                                                            {Math.round(currentDiscount.discountRate * 100)}%OFF適用中！
                                                        </span>
                                                        <span className="text-xs font-bold">
                                                            ¥{currentDiscount.discount.toLocaleString()}お得
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Nudge message for next tier */}
                                                {nextTier && (
                                                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                                                        <Icon name="trending_up" size={14} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                                        <span className="text-xs">
                                                            あと<span className="font-bold">{nextTier.remaining}台</span>で
                                                            <span className="font-bold">{Math.round(nextTier.rate * 100)}%OFF</span>！
                                                            （¥{nextTier.savings.toLocaleString()}お得）
                                                        </span>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
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