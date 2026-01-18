import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
    <div className="space-y-3 sm:space-y-4">
      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="postalCode" className="text-sm sm:text-base">
          郵便番号 {required && <span className="text-destructive">*</span>}
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:flex-none sm:w-40">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              〒
            </span>
            <Input
              id="postalCode"
              placeholder="例：100-0001"
              value={postalCode}
              onChange={handlePostalCodeChange}
              disabled={disabled}
              maxLength={8}
              className="pl-8 h-11 sm:h-10 text-base sm:text-sm"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => searchAddress()}
            disabled={disabled || isSearching || postalCode.replace(/[^\d]/g, "").length !== 7}
            className="h-11 sm:h-10 px-3 sm:px-4 touch-manipulation flex items-center justify-center gap-1.5"
          >
            {isSearching ? (
              <Icon name="sync" size={16} className="animate-spin" />
            ) : (
              <>
                <Icon name="search" size={16} className="shrink-0" />
                <span className="hidden sm:inline">住所検索</span>
                <span className="sm:hidden">検索</span>
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          郵便番号を入力すると自動で住所が入力されます
        </p>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="address" className="text-sm sm:text-base">
          住所 {required && <span className="text-destructive">*</span>}
        </Label>
        <Input
          id="address"
          placeholder="例：東京都千代田区千代田1-1-1"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          disabled={disabled}
          className="h-11 sm:h-10 text-base sm:text-sm"
        />
        <p className="text-xs text-muted-foreground">
          番地まで入力してください
        </p>
      </div>

      {onAddressBuildingChange && (
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="addressBuilding" className="text-sm sm:text-base">
            建物名・部屋番号（任意）
          </Label>
          <Input
            id="addressBuilding"
            placeholder="例：○○マンション 101号室"
            value={addressBuilding}
            onChange={(e) => onAddressBuildingChange(e.target.value)}
            disabled={disabled}
            className="h-11 sm:h-10 text-base sm:text-sm"
          />
          <p className="text-xs text-muted-foreground">
            マンション・アパートの場合はご記入ください
          </p>
        </div>
      )}
    </div>
  );
};
