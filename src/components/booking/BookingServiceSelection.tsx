import { Service, ServiceOption } from "@/types/booking";
import { SelectedService, SelectedOption } from "@/hooks/useBooking";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuantitySelector } from "@/components/QuantitySelector";
import { OptionCheckbox } from "@/components/OptionCheckbox";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/icon";
import { LineLoginButton } from "@/components/LineLoginButton";

interface BookingServiceSelectionProps {
    allServices: Service[];
    selectedServices: SelectedService[];
    allOptions: ServiceOption[];
    selectedOptions: SelectedOption[];
    lineUserId: string | null;
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
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } }
};

export const BookingServiceSelection = ({
    allServices,
    selectedServices,
    allOptions,
    selectedOptions,
    lineUserId,
    onServiceQuantityChange,
    onOptionChange,
    onOptionQuantityChange,
    getOptionsForService,
}: BookingServiceSelectionProps) => {
    return (
        <div className="space-y-12">
            {/* Section 1: Service Selection */}
            <section>
                <div className="flex items-center gap-2 mb-6">
                    <h3 className="text-2xl font-bold">サービスを選ぶ</h3>
                </div>

                {!lineUserId && (
                    <div className="mb-8 p-6 bg-[#06C755]/5 border border-[#06C755]/20 rounded-xl">
                        <p className="text-center text-sm text-muted-foreground mb-4">
                            LINEでログインすると、お名前や連絡先が自動で入力されます
                        </p>
                        <LineLoginButton />
                    </div>
                )}

                <p className="text-sm text-muted-foreground mb-6">
                    複数のサービスを同時に選択できます。数量を調整してカートに追加してください。
                </p>

                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    variants={container}
                    initial="hidden"
                    animate="show"
                >
                    {allServices.map((service) => {
                        const selectedService = selectedServices.find(s => s.serviceId === service.id);
                        const quantity = selectedService?.quantity || 0;

                        return (
                            <motion.div key={service.id} variants={item} whileHover={{ y: -5 }}>
                                <Card className={`overflow-hidden transition-all duration-300 ${quantity > 0 ? "ring-2 ring-primary border-transparent shadow-medium" : "border-border shadow-subtle hover:shadow-medium"}`}>
                                    <div className="aspect-video relative overflow-hidden bg-muted">
                                        <img
                                            src={service.imageUrl}
                                            alt={service.title}
                                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                        />
                                    </div>
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start gap-4 mb-4">
                                            <div className="flex-1">
                                                <h4 className="text-lg font-bold text-foreground mb-2 leading-tight">{service.title}</h4>
                                                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                                    {service.description}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-sm text-muted-foreground mb-0.5">基本料金</p>
                                                <p className="text-xl font-bold text-foreground tabular-nums">
                                                    ¥{service.basePrice.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                                    {service.duration}分
                                                </span>
                                                {quantity > 0 && (
                                                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none">
                                                        選択中
                                                    </Badge>
                                                )}
                                            </div>
                                            <QuantitySelector
                                                value={quantity}
                                                onChange={(newQty) => onServiceQuantityChange(service.id, newQty)}
                                                min={0}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </section>

            {/* Section 2: Selected Services Summary */}
            {selectedServices.length > 0 && (
                <section>
                    <Separator className="mb-6" />
                    <div className="flex items-center gap-2 mb-4">
                        <Icon name="check_circle" size={20} className="text-success" />
                        <h3 className="text-xl font-semibold">選択中のサービス</h3>
                    </div>
                    <Card>
                        <CardContent className="p-6 space-y-3">
                            {selectedServices.map(({ serviceId, quantity, service }) => {
                                // Note: Discount calculation logic is simplified here for display purposes
                                // Ideally, this should come from the hook or a shared utility if complex
                                const subtotal = service.basePrice * quantity;

                                return (
                                    <div key={serviceId} className="flex justify-between items-center">
                                        <div>
                                            <span className="font-medium">{service.title}</span>
                                            <span className="text-muted-foreground"> × {quantity}台</span>
                                        </div>
                                        <span className="font-semibold">
                                            ¥{subtotal.toLocaleString()}
                                        </span>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </section>
            )}

            {/* Section 3: Options Selection */}
            {selectedServices.length > 0 && allOptions.length > 0 && (
                <section>
                    <Separator className="mb-6" />
                    <div className="flex items-center gap-2 mb-4">
                        <Icon name="auto_awesome" size={20} className="text-primary" />
                        <h3 className="text-xl font-semibold">オプションを追加</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                        選択したサービスに追加できるオプションです
                    </p>

                    {selectedServices.map(({ serviceId, service }) => {
                        const serviceOptions = getOptionsForService(serviceId);
                        if (serviceOptions.length === 0) return null;

                        return (
                            <div key={serviceId} className="mb-6">
                                <h4 className="font-semibold mb-3">{service.title} のオプション</h4>
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
                </section>
            )}
        </div>
    );
};
