import { Service, ServiceOption } from "@/types/booking";
import { SelectedService, SelectedOption } from "@/hooks/useBooking";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
            staggerChildren: 0.08
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } }
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
        <div className="space-y-6 sm:space-y-10">
            <section>
                {/* Header with required badge */}
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <h3 className="text-xl sm:text-2xl font-bold">サービスを選ぶ</h3>
                    <Badge className="bg-orange-500 text-white hover:bg-orange-500 text-xs px-2 py-0.5">
                        必須
                    </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-5 sm:mb-6">
                    ご希望のサービスを選択してください
                </p>

                <motion.div
                    className="space-y-4"
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
                                {/* Lステップ style card with dashed border */}
                                <Card className={`border-2 border-dashed transition-all duration-200 ${
                                    isSelected 
                                        ? "border-primary bg-primary/5" 
                                        : "border-border hover:border-muted-foreground/50"
                                }`}>
                                    <CardContent className="p-4 sm:p-5">
                                        <div className="flex gap-3 sm:gap-4">
                                            {/* Small image */}
                                            <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted">
                                                {service.imageUrl ? (
                                                    <img
                                                        src={service.imageUrl}
                                                        alt={service.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Icon name="home_repair_service" size={28} className="text-muted-foreground/50" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-base sm:text-lg font-bold text-foreground mb-1 leading-tight">
                                                    {service.title}
                                                </h4>
                                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                                    {service.description}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                                        {service.duration}分
                                                    </span>
                                                    <span className="text-lg sm:text-xl font-bold text-primary">
                                                        ¥{service.basePrice.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Selection button or quantity selector */}
                                        <div className="mt-4">
                                            {!isSelected ? (
                                                <Button
                                                    variant="outline"
                                                    className="w-full h-12 sm:h-11 text-base border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors touch-manipulation"
                                                    onClick={() => onServiceQuantityChange(service.id, 1)}
                                                >
                                                    選択する
                                                </Button>
                                            ) : (
                                                <div className="space-y-3">
                                                    {/* Selected indicator */}
                                                    <div className="flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-md">
                                                        <Check className="w-5 h-5" />
                                                        <span className="font-medium">選択中</span>
                                                    </div>
                                                    
                                                    {/* Quantity selector */}
                                                    <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                                                        <span className="text-sm font-medium text-foreground">数量</span>
                                                        <QuantitySelector
                                                            value={quantity}
                                                            onChange={(newQty) => onServiceQuantityChange(service.id, newQty)}
                                                            min={0}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </section>

            {/* Selected services summary */}
            <AnimatePresence>
                {selectedServices.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <Separator className="mb-5" />
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-4 h-4 text-primary-foreground" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-semibold">選択中のサービス</h3>
                        </div>
                        <Card className="bg-primary/5 border-primary/20">
                            <CardContent className="p-4 space-y-2">
                                {selectedServices.map(({ serviceId, quantity, service }) => {
                                    const subtotal = service.basePrice * quantity;
                                    return (
                                        <div key={serviceId} className="flex justify-between items-center text-base">
                                            <div className="min-w-0 flex-1">
                                                <span className="font-medium">{service.title}</span>
                                                <span className="text-muted-foreground text-sm ml-2">× {quantity}台</span>
                                            </div>
                                            <span className="font-bold text-primary flex-shrink-0 ml-2">
                                                ¥{subtotal.toLocaleString()}
                                            </span>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </motion.section>
                )}
            </AnimatePresence>

            {/* Options section */}
            <AnimatePresence>
                {selectedServices.length > 0 && allOptions.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <Separator className="mb-5" />
                        <div className="flex items-center gap-3 mb-4">
                            <Icon name="auto_awesome" size={22} className="text-primary" />
                            <h3 className="text-lg sm:text-xl font-semibold">オプションを追加</h3>
                            <Badge variant="outline" className="text-xs">任意</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-5">
                            選択したサービスに追加できるオプションです
                        </p>

                        {selectedServices.map(({ serviceId, service }) => {
                            const serviceOptions = getOptionsForService(serviceId);
                            if (serviceOptions.length === 0) return null;

                            return (
                                <div key={serviceId} className="mb-5">
                                    <h4 className="font-semibold mb-3 text-base text-muted-foreground">
                                        {service.title} のオプション
                                    </h4>
                                    <div className="space-y-3">
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
