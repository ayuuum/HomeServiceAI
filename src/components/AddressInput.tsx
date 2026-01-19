import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

interface AddressInputProps {
  postalCode: string;
  onPostalCodeChange: (value: string) => void;
  address: string;
  onAddressChange: (value: string) => void;
  addressBuilding?: string;
  onAddressBuildingChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

interface ZipCloudResult {
  address1: string; // 都道府県
  address2: string; // 市区町村
  address3: string; // 町名
}

export const AddressInput = ({
  postalCode,
  onPostalCodeChange,
  address,
  onAddressChange,
  addressBuilding = "",
  onAddressBuildingChange,
  required = false,
  disabled = false,
}: AddressInputProps) => {
  const [isSearching, setIsSearching] = useState(false);

  const formatPostalCode = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/[^\d]/g, "");
    // Format as XXX-XXXX if we have enough digits
    if (digits.length > 3) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}`;
    }
    return digits;
  };

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPostalCode(e.target.value);
    onPostalCodeChange(formatted);

    // Auto-search when 7 digits entered
    const digits = formatted.replace(/[^\d]/g, "");
    if (digits.length === 7) {
      searchAddress(digits);
    }
  };

  const searchAddress = useCallback(async (zipcode?: string) => {
    const digits = (zipcode || postalCode).replace(/[^\d]/g, "");
    
    if (digits.length !== 7) {
      toast.error("郵便番号は7桁で入力してください");
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result: ZipCloudResult = data.results[0];
        const fullAddress = `${result.address1}${result.address2}${result.address3}`;
        onAddressChange(fullAddress);
        toast.success("住所を取得しました");
      } else {
        toast.error("該当する住所が見つかりませんでした");
      }
    } catch (error) {
      console.error("Address search error:", error);
      toast.error("住所の検索に失敗しました");
    } finally {
      setIsSearching(false);
    }
  }, [postalCode, onAddressChange]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Postal code */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="postalCode" className="text-lg sm:text-xl font-semibold">
            郵便番号
          </Label>
          {required && (
            <Badge className="bg-orange-500 text-white hover:bg-orange-500 text-sm px-2.5 py-0.5">
              必須
            </Badge>
          )}
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xl">
              〒
            </span>
            <Input
              id="postalCode"
              placeholder="例：100-0001"
              value={postalCode}
              onChange={handlePostalCodeChange}
              disabled={disabled}
              maxLength={8}
              className="pl-12 h-16 text-xl"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => searchAddress()}
            disabled={disabled || isSearching || postalCode.replace(/[^\d]/g, "").length !== 7}
            className="h-16 px-5 touch-manipulation flex items-center justify-center gap-2 text-base"
          >
            {isSearching ? (
              <Icon name="sync" size={22} className="animate-spin" />
            ) : (
              <>
                <Icon name="search" size={22} className="shrink-0" />
                <span>検索</span>
              </>
            )}
          </Button>
        </div>
        <p className="text-base text-muted-foreground">
          郵便番号を入力すると自動で住所が入力されます
        </p>
      </div>

      {/* Address */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="address" className="text-lg sm:text-xl font-semibold">
            住所
          </Label>
          {required && (
            <Badge className="bg-orange-500 text-white hover:bg-orange-500 text-sm px-2.5 py-0.5">
              必須
            </Badge>
          )}
        </div>
        <Input
          id="address"
          placeholder="例：東京都千代田区千代田1-1-1"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          disabled={disabled}
          className="h-16 text-xl"
        />
        <p className="text-base text-muted-foreground">
          番地まで入力してください
        </p>
      </div>

      {/* Building name */}
      {onAddressBuildingChange && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="addressBuilding" className="text-lg sm:text-xl font-semibold">
              建物名・部屋番号
            </Label>
            <Badge variant="outline" className="text-sm">任意</Badge>
          </div>
          <Input
            id="addressBuilding"
            placeholder="例：○○マンション 101号室"
            value={addressBuilding}
            onChange={(e) => onAddressBuildingChange(e.target.value)}
            disabled={disabled}
            className="h-16 text-xl"
          />
          <p className="text-base text-muted-foreground">
            マンション・アパートの場合はご記入ください
          </p>
        </div>
      )}
    </div>
  );
};
