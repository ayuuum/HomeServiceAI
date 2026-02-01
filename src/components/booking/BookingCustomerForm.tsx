import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/ui/icon";
import { AddressInput } from "@/components/AddressInput";

interface BookingCustomerFormProps {
  customerLastName: string;
  onLastNameChange: (value: string) => void;
  customerFirstName: string;
  onFirstNameChange: (value: string) => void;
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
  hasParking: string;
  onHasParkingChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  photos: File[];
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
}

export const BookingCustomerForm = ({
  customerLastName,
  onLastNameChange,
  customerFirstName,
  onFirstNameChange,
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
  hasParking,
  onHasParkingChange,
  notes,
  onNotesChange,
  photos,
  onFileSelect,
  onRemovePhoto,
}: BookingCustomerFormProps) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Customer Info Section */}
      <section>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <Icon name="person" size={20} className="text-primary" />
            <h3 className="text-lg sm:text-xl font-bold">お客様情報</h3>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-5">
          {/* Name fields - Split into Last Name and First Name */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-base sm:text-lg font-semibold">お名前</Label>
              <Badge className="bg-destructive text-white hover:bg-destructive text-xs px-2 py-0.5">必須</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="lastName" className="text-sm text-muted-foreground">
                  姓
                </Label>
                <Input
                  id="lastName"
                  placeholder="山田"
                  value={customerLastName}
                  onChange={(e) => onLastNameChange(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="firstName" className="text-sm text-muted-foreground">
                  名
                </Label>
                <Input
                  id="firstName"
                  placeholder="太郎"
                  value={customerFirstName}
                  onChange={(e) => onFirstNameChange(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
            </div>
          </div>

          {/* Phone field */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="phone" className="text-base sm:text-lg font-semibold">
                電話番号
              </Label>
              <Badge className="bg-destructive text-white hover:bg-destructive text-xs px-2 py-0.5">必須</Badge>
            </div>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              pattern="[0-9-]*"
              placeholder="090-1234-5678"
              value={customerPhone}
              onChange={(e) => onPhoneChange(e.target.value)}
              className="h-11 text-base placeholder:text-muted-foreground/50"
            />
            <p className="text-xs sm:text-sm text-muted-foreground">
              ハイフンなしでも入力可能です
            </p>
          </div>

          {/* Email field */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="email" className="text-base sm:text-lg font-semibold">
                メールアドレス
              </Label>
              <Badge className="bg-destructive text-white hover:bg-destructive text-xs px-2 py-0.5">
                必須
              </Badge>
            </div>
            <Input
              id="email"
              type="email"
              placeholder="taro.yamada@example.com"
              value={customerEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              className="h-11 text-base"
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

      {/* Diagnostic Info Section */}
      <section>
        <Separator className="mb-4 sm:mb-5" />
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Icon name="info" size={20} className="text-primary" />
          <h3 className="text-lg sm:text-xl font-bold">事前情報</h3>
        </div>
        <div className="space-y-4 sm:space-y-5">
          {/* Parking Availability */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-base sm:text-lg font-semibold">駐車場の有無</Label>
              <Badge className="bg-destructive text-white hover:bg-destructive text-xs px-2 py-0.5">必須</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              作業車両を停める駐車スペースはありますか？
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={hasParking === "yes" ? "default" : "outline"}
                className={`h-11 text-base ${hasParking === "yes" ? "" : "hover:bg-muted"}`}
                onClick={() => onHasParkingChange("yes")}
              >
                <Icon name="local_parking" size={18} className="mr-2" />
                あり
              </Button>
              <Button
                type="button"
                variant={hasParking === "no" ? "default" : "outline"}
                className={`h-11 text-base ${hasParking === "no" ? "" : "hover:bg-muted"}`}
                onClick={() => onHasParkingChange("no")}
              >
                <Icon name="block" size={18} className="mr-2" />
                なし
              </Button>
            </div>
          </div>

          {/* Photos Upload */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Label className="text-base sm:text-lg font-semibold">現場写真のアップロード</Label>
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                任意
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              事前に写真をお送りいただくと、当日の作業がスムーズになります（最大5枚）
            </p>
            <div className="space-y-3">
              {photos.length < 5 && (
                <Button variant="outline" className="w-full h-10 text-sm touch-manipulation" asChild>
                  <label>
                    <Icon name="photo_camera" size={18} className="mr-2" />
                    写真を追加
                    <input type="file" accept="image/*" multiple onChange={onFileSelect} className="hidden" />
                  </label>
                </Button>
              )}
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
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
                        className="absolute top-0.5 right-0.5 h-6 w-6 p-0 touch-manipulation text-sm"
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

          {/* Notes */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Label className="text-base sm:text-lg font-semibold">備考・特記事項</Label>
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                任意
              </Badge>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="気になる点や特別な要望があればご記入ください"
              className="min-h-24 text-base"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
