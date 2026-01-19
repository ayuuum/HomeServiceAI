import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
    addressBuilding: string;
    onAddressBuildingChange: (value: string) => void;
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
    addressBuilding,
    onAddressBuildingChange,
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
        <div className="space-y-6 sm:space-y-10">
            {/* Customer Info Section */}
            <section>
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <Icon name="person" size={22} className="text-primary" />
                        <h3 className="text-lg sm:text-xl font-bold">お客様情報</h3>
                    </div>
                    
                    {!isLoggedIn ? (
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={onGoogleLogin}
                            disabled={isLoggingIn}
                            className="gap-2 h-10 text-sm"
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
                                    Googleログイン
                                </>
                            )}
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-green-600 flex items-center gap-1 font-medium">
                                <Icon name="check_circle" size={18} />
                                ログイン済み
                            </span>
                            <Button variant="ghost" size="sm" onClick={onLogout} className="text-sm h-9">
                                ログアウト
                            </Button>
                        </div>
                    )}
                </div>

                <div className="space-y-5">
                    {/* Name field */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="name" className="text-base font-medium">お名前</Label>
                            <Badge className="bg-orange-500 text-white hover:bg-orange-500 text-xs px-2 py-0.5">
                                必須
                            </Badge>
                        </div>
                        <Input
                            id="name"
                            placeholder="例：山田 太郎"
                            value={customerName}
                            onChange={(e) => onNameChange(e.target.value)}
                            readOnly={isLoggedIn}
                            className={`h-14 text-lg ${isLoggedIn ? 'bg-muted cursor-not-allowed' : ''}`}
                        />
                    </div>

                    {/* Phone field */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="phone" className="text-base font-medium">電話番号</Label>
                            <Badge className="bg-orange-500 text-white hover:bg-orange-500 text-xs px-2 py-0.5">
                                必須
                            </Badge>
                        </div>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="例：090-1234-5678"
                            value={customerPhone}
                            onChange={(e) => onPhoneChange(e.target.value)}
                            className="h-14 text-lg"
                        />
                    </div>

                    {/* Email field */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="email" className="text-base font-medium">メールアドレス</Label>
                            <Badge variant="outline" className="text-xs">任意</Badge>
                        </div>
                        <Input
                            id="email"
                            type="email"
                            placeholder="例：taro.yamada@example.com"
                            value={customerEmail}
                            onChange={(e) => onEmailChange(e.target.value)}
                            readOnly={isLoggedIn}
                            className={`h-14 text-lg ${isLoggedIn ? 'bg-muted cursor-not-allowed' : ''}`}
                        />
                    </div>
                    
                    {/* Address with postal code auto-fill */}
                    <AddressInput
                        postalCode={postalCode}
                        onPostalCodeChange={onPostalCodeChange}
                        address={address}
                        onAddressChange={onAddressChange}
                        addressBuilding={addressBuilding}
                        onAddressBuildingChange={onAddressBuildingChange}
                        required={true}
                    />
                </div>
            </section>

            {/* Photos & Notes Section */}
            <section>
                <Separator className="mb-5" />
                <div className="space-y-5">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Label className="text-base font-medium">現場写真のアップロード</Label>
                            <Badge variant="outline" className="text-xs">任意</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            事前に写真をお送りいただくと、当日の作業がスムーズになります（最大5枚）
                        </p>
                        <div className="space-y-3">
                            {photos.length < 5 && (
                                <Button variant="outline" className="w-full h-14 text-base touch-manipulation" asChild>
                                    <label>
                                        <Icon name="photo_camera" size={20} className="mr-2" />
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
                                <div className="grid grid-cols-3 gap-3">
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
                                                className="absolute top-1 right-1 h-8 w-8 p-0 touch-manipulation"
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
                        <div className="flex items-center gap-2 mb-3">
                            <Label className="text-base font-medium">備考・特記事項</Label>
                            <Badge variant="outline" className="text-xs">任意</Badge>
                        </div>
                        <Textarea
                            value={notes}
                            onChange={(e) => onNotesChange(e.target.value)}
                            placeholder="気になる点や特別な要望があればご記入ください"
                            className="min-h-28 text-lg"
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};
