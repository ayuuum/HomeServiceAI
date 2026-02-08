import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles } from 'lucide-react';
import { SERVICE_TEMPLATES, ServiceTemplate } from './serviceTemplates';

interface ServiceTemplateSelectorProps {
    selectedTemplates: ServiceTemplate[];
    onSelectionChange: (templates: ServiceTemplate[]) => void;
    onCustomizePrice: (templateId: string, price: number) => void;
}

export function ServiceTemplateSelector({
    selectedTemplates,
    onSelectionChange,
    onCustomizePrice,
}: ServiceTemplateSelectorProps) {
    const [showCustomPrices, setShowCustomPrices] = useState<Record<string, boolean>>({});

    const toggleTemplate = (template: ServiceTemplate) => {
        const isSelected = selectedTemplates.some(t => t.id === template.id);
        if (isSelected) {
            onSelectionChange(selectedTemplates.filter(t => t.id !== template.id));
        } else {
            onSelectionChange([...selectedTemplates, { ...template }]);
        }
    };

    const isSelected = (templateId: string) =>
        selectedTemplates.some(t => t.id === templateId);

    const formatPrice = (price: number) =>
        new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(price);

    const formatDuration = (minutes: number) => {
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`;
        }
        return `${minutes}分`;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">
                    よく使われるサービスを選択してください。価格は後から変更できます。
                </p>
            </div>

            <div className="grid gap-3">
                {SERVICE_TEMPLATES.map((template) => {
                    const selected = isSelected(template.id);
                    const customPrice = selectedTemplates.find(t => t.id === template.id)?.basePrice;

                    return (
                        <Card
                            key={template.id}
                            className={`cursor-pointer transition-all ${selected
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                    : 'hover:border-muted-foreground/50'
                                }`}
                            onClick={() => toggleTemplate(template)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    {/* Checkbox */}
                                    <div
                                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selected
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-muted-foreground/30'
                                            }`}
                                    >
                                        {selected && <Check className="h-4 w-4" />}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium">{template.title}</h4>
                                            {template.isPopular && (
                                                <Badge variant="secondary" className="text-xs">
                                                    人気
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                            {template.description}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2 text-sm">
                                            <span className="font-medium text-primary">
                                                {formatPrice(customPrice ?? template.basePrice)}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {formatDuration(template.duration)}
                                            </span>
                                        </div>

                                        {/* Price customization (shown when selected) */}
                                        {selected && showCustomPrices[template.id] && (
                                            <div
                                                className="mt-3 flex items-center gap-2"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <span className="text-sm text-muted-foreground">価格:</span>
                                                <Input
                                                    type="number"
                                                    value={customPrice ?? template.basePrice}
                                                    onChange={(e) => onCustomizePrice(template.id, Number(e.target.value))}
                                                    className="w-32 h-8"
                                                />
                                                <span className="text-sm text-muted-foreground">円</span>
                                            </div>
                                        )}

                                        {selected && !showCustomPrices[template.id] && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="mt-2 h-7 text-xs"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowCustomPrices(prev => ({ ...prev, [template.id]: true }));
                                                }}
                                            >
                                                価格を変更
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {selectedTemplates.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <span className="font-medium">{selectedTemplates.length}件</span>のサービスを選択中
                </div>
            )}
        </div>
    );
}
