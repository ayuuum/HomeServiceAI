import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/ui/icon";
import { AddressInput } from "@/components/AddressInput";

interface BookingCustomerFormProps {
    customerName: string;
    onNameChange: (value: string) => void;
    customerEmail: string;
    onEmailChange: (value: string) => void;
    customerPhone: string;
    onPhoneChange: (value: string) => void;
    postalCode: string;
    onPostalCodeChange: (value: string) => void;
    address: string;
    onAddressChange: (value: string) => void;
    notes: string;
    onNotesChange: (value: string) => void;
    photos: File[];
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemovePhoto: (index: number) => void;
    isLoggedIn?: boolean;
    onGoogleLogin?: () => Promise<void>;
    onLogout?: () => Promise<void>;
    isLoggingIn?: boolean;
}

export const BookingCustomerForm = ({
    customerName,
    onNameChange,
    customerEmail,
    onEmailChange,
    customerPhone,
    onPhoneChange,
    postalCode,
    onPostalCodeChange,
    address,
    onAddressChange,
    notes,
    onNotesChange,
    photos,
    onFileSelect,
    onRemovePhoto,
    isLoggedIn = false,
    onGoogleLogin,
    onLogout,
    isLoggingIn = false,
}: BookingCustomerFormProps) => {
    return (
        <div className="space-y-8 sm:space-y-12">
            {/* Section 6: Customer Info */}
            <section>
                <Separator className="mb-4 sm:mb-6" />
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                        <Icon name="person" size={18} className="text-primary sm:hidden" />
                        <Icon name="person" size={20} className="text-primary hidden sm:block" />
                        <h3 className="text-lg sm:text-xl font-semibold">お客様情報</h3>
                    </div>
                    
                    {!isLoggedIn ? (
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={onGoogleLogin}
                            disabled={isLoggingIn}
                            className="gap-2"
                        >
                            {isLoggingIn ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                                    ログイン中...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    Googleでログイン
                                </>
                            )}
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm text-green-600 flex items-center gap-1">
                                <Icon name="check_circle" size={16} />
                                ログイン済み
                            </span>
                            <Button variant="ghost" size="sm" onClick={onLogout} className="text-xs">
                                ログアウト
                            </Button>
                        </div>
                    )}
                </div>

<div className="space-y-3 sm:space-y-4">
                    <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                        <div className="space-y-1.5 sm:space-y-2">
                            <Label htmlFor="name" className="text-sm sm:text-base">お名前 <span className="text-destructive">*</span></Label>
                            <Input
                                id="name"
                                placeholder="例：山田 太郎"
                                value={customerName}
                                onChange={(e) => onNameChange(e.target.value)}
                                readOnly={isLoggedIn}
                                className={`h-11 sm:h-10 text-base sm:text-sm ${isLoggedIn ? 'bg-muted cursor-not-allowed' : ''}`}
                            />
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                            <Label htmlFor="phone" className="text-sm sm:text-base">電話番号</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="例：090-1234-5678"
                                value={customerPhone}
                                onChange={(e) => onPhoneChange(e.target.value)}
                                className="h-11 sm:h-10 text-base sm:text-sm"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="email" className="text-sm sm:text-base">メールアドレス</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="例：taro.yamada@example.com"
                            value={customerEmail}
                            onChange={(e) => onEmailChange(e.target.value)}
                            readOnly={isLoggedIn}
                            className={`h-11 sm:h-10 text-base sm:text-sm ${isLoggedIn ? 'bg-muted cursor-not-allowed' : ''}`}
                        />
                    </div>
                    
                    {/* Address with postal code auto-fill */}
                    <AddressInput
                        postalCode={postalCode}
                        onPostalCodeChange={onPostalCodeChange}
                        address={address}
                        onAddressChange={onAddressChange}
                        required={true}
                    />
                </div>
            </section>

            {/* Section 7: Photos & Notes */}
            <section>
                <div className="space-y-4 sm:space-y-6">
                    <div>
                        <Label className="text-sm sm:text-base font-semibold mb-1.5 sm:mb-2 block">
                            現場写真のアップロード（任意）
                        </Label>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                            事前に写真をお送りいただくと、より正確なお見積もりが可能です（最大5枚）
                        </p>
                        <div className="space-y-3">
                            {photos.length < 5 && (
                                <Button variant="outline" className="w-full h-12 sm:h-10 touch-manipulation" asChild>
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
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
                                                className="absolute top-1 right-1 h-7 w-7 sm:h-6 sm:w-6 p-0 touch-manipulation"
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
                        <Label className="text-sm sm:text-base font-semibold mb-1.5 sm:mb-2 block">
                            備考・特記事項（任意）
                        </Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => onNotesChange(e.target.value)}
                            placeholder="気になる点や特別な要望があればご記入ください"
                            className="min-h-24 text-base sm:text-sm"
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};
