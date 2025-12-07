import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/ui/icon";

interface BookingCustomerFormProps {
    customerName: string;
    onNameChange: (value: string) => void;
    customerEmail: string;
    onEmailChange: (value: string) => void;
    customerPhone: string;
    onPhoneChange: (value: string) => void;
    notes: string;
    onNotesChange: (value: string) => void;
    photos: File[];
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemovePhoto: (index: number) => void;
}

export const BookingCustomerForm = ({
    customerName,
    onNameChange,
    customerEmail,
    onEmailChange,
    customerPhone,
    onPhoneChange,
    notes,
    onNotesChange,
    photos,
    onFileSelect,
    onRemovePhoto,
}: BookingCustomerFormProps) => {
    return (
        <div className="space-y-12">
            {/* Section 6: Customer Info */}
            <section>
                <Separator className="mb-6" />
                <div className="flex items-center gap-2 mb-4">
                    <Icon name="person" size={20} className="text-primary" />
                    <h3 className="text-xl font-semibold">お客様情報</h3>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">お名前 <span className="text-destructive">*</span></Label>
                            <Input
                                id="name"
                                placeholder="例：山田 太郎"
                                value={customerName}
                                onChange={(e) => onNameChange(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">電話番号</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="例：090-1234-5678"
                                value={customerPhone}
                                onChange={(e) => onPhoneChange(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">メールアドレス</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="例：taro.yamada@example.com"
                            value={customerEmail}
                            onChange={(e) => onEmailChange(e.target.value)}
                        />
                    </div>
                </div>
            </section>

            {/* Section 7: Photos & Notes */}
            <section>
                <div className="space-y-6">
                    <div>
                        <Label className="text-base font-semibold mb-2 block">
                            現場写真のアップロード（任意）
                        </Label>
                        <p className="text-sm text-muted-foreground mb-3">
                            事前に写真をお送りいただくと、より正確なお見積もりが可能です（最大5枚）
                        </p>
                        <div className="space-y-3">
                            {photos.length < 5 && (
                                <Button variant="outline" className="w-full" asChild>
                                    <label>
                                        <Icon name="photo_camera" size={16} className="mr-2" />
                                        写真を追加
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={onFileSelect}
                                            className="hidden"
                                        />
                                    </label>
                                </Button>
                            )}
                            {photos.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                    {photos.map((photo, index) => (
                                        <div key={index} className="relative aspect-square">
                                            <img
                                                src={URL.createObjectURL(photo)}
                                                alt={`Photo ${index + 1}`}
                                                className="w-full h-full object-cover rounded-lg"
                                            />
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="absolute top-1 right-1 h-6 w-6 p-0"
                                                onClick={() => onRemovePhoto(index)}
                                            >
                                                ×
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label className="text-base font-semibold mb-2 block">
                            備考・特記事項（任意）
                        </Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => onNotesChange(e.target.value)}
                            placeholder="気になる点や特別な要望があればご記入ください"
                            className="min-h-24"
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};
