import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

export interface DayHours {
  open: string | null;
  close: string | null;
  is_closed: boolean;
}

export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { open: "09:00", close: "18:00", is_closed: false },
  tuesday: { open: "09:00", close: "18:00", is_closed: false },
  wednesday: { open: "09:00", close: "18:00", is_closed: false },
  thursday: { open: "09:00", close: "18:00", is_closed: false },
  friday: { open: "09:00", close: "18:00", is_closed: false },
  saturday: { open: "09:00", close: "17:00", is_closed: false },
  sunday: { open: null, close: null, is_closed: true },
};

const DAY_NAMES: { key: keyof BusinessHours; label: string }[] = [
  { key: "monday", label: "月曜日" },
  { key: "tuesday", label: "火曜日" },
  { key: "wednesday", label: "水曜日" },
  { key: "thursday", label: "木曜日" },
  { key: "friday", label: "金曜日" },
  { key: "saturday", label: "土曜日" },
  { key: "sunday", label: "日曜日" },
];

// Generate time options (5:00 - 23:00 in 30min intervals)
const generateTimeOptions = () => {
  const options: string[] = [];
  for (let hour = 5; hour <= 23; hour++) {
    options.push(`${hour.toString().padStart(2, "0")}:00`);
    if (hour < 23) {
      options.push(`${hour.toString().padStart(2, "0")}:30`);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

interface BusinessHoursSettingsProps {
  organizationId?: string;
}

export function BusinessHoursSettings({ organizationId }: BusinessHoursSettingsProps) {
  const { toast } = useToast();
  const { refreshOrganization } = useAuth();
  const queryClient = useQueryClient();
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load business hours from organization
  useEffect(() => {
    const loadBusinessHours = async () => {
      if (!organizationId) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("business_hours")
          .eq("id", organizationId)
          .single();

        if (error) throw error;

        if (data?.business_hours) {
          setBusinessHours(data.business_hours as unknown as BusinessHours);
        }
      } catch (error) {
        console.error("Error loading business hours:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBusinessHours();
  }, [organizationId]);

  const handleDayChange = (
    day: keyof BusinessHours,
    field: keyof DayHours,
    value: string | boolean | null
  ) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleClosedChange = (day: keyof BusinessHours, isClosed: boolean) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        is_closed: isClosed,
        // Clear open/close times when marking as closed
        ...(isClosed ? { open: null, close: null } : { open: "09:00", close: "18:00" }),
      },
    }));
  };

  const handleSave = async () => {
    if (!organizationId) return;

    // Validate: ensure open < close for non-closed days
    for (const { key, label } of DAY_NAMES) {
      const day = businessHours[key];
      if (!day.is_closed && day.open && day.close) {
        if (day.open >= day.close) {
          toast({
            variant: "destructive",
            title: "入力エラー",
            description: `${label}の開始時間は終了時間より前に設定してください`,
          });
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ business_hours: JSON.parse(JSON.stringify(businessHours)) })
        .eq("id", organizationId);

      if (error) throw error;

      // Clear all availability-related caches so changes reflect immediately
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      queryClient.invalidateQueries({ queryKey: ["businessHours"] });
      
      await refreshOrganization();
      toast({
        title: "保存完了",
        description: "営業時間を更新しました",
      });
    } catch (error) {
      console.error("Error saving business hours:", error);
      toast({
        variant: "destructive",
        title: "保存失敗",
        description: error instanceof Error ? error.message : "営業時間の保存に失敗しました",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {DAY_NAMES.map(({ key, label }) => {
          const day = businessHours[key];
          const isClosed = day.is_closed;

          return (
            <div
              key={key}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border bg-card"
            >
              <div className="w-20 font-medium text-sm">{label}</div>

              <div className="flex items-center gap-2 flex-1">
                {!isClosed ? (
                  <>
                    <Select
                      value={day.open || "09:00"}
                      onValueChange={(value) => handleDayChange(key, "open", value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <span className="text-muted-foreground">〜</span>

                    <Select
                      value={day.close || "18:00"}
                      onValueChange={(value) => handleDayChange(key, "close", value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <span className="text-muted-foreground text-sm">定休日</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id={`${key}-closed`}
                  checked={isClosed}
                  onCheckedChange={(checked) => handleClosedChange(key, checked === true)}
                />
                <Label
                  htmlFor={`${key}-closed`}
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  定休日
                </Label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            "保存"
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        ※ 営業時間の変更は、予約カレンダーに即座に反映されます
      </p>
    </div>
  );
}
