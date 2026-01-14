import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

export interface DayAvailability {
  date: string;
  bookedSlots: number;
  status: "available" | "partial" | "full";
}

export interface TimeSlotAvailability {
  time: string;
  isBooked: boolean;
}

const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
];

const MAX_BOOKINGS_PER_SLOT = 1; // 1つの時間帯に1件のみ

export const useAvailability = (organizationId?: string) => {
  const [monthAvailability, setMonthAvailability] = useState<DayAvailability[]>([]);
  const [dayTimeSlots, setDayTimeSlots] = useState<TimeSlotAvailability[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);

  // 月ごとの空き状況を取得
  const fetchMonthAvailability = useCallback(async (date: Date) => {
    if (!organizationId) return;

    setLoadingMonth(true);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("selected_date, selected_time")
      .eq("organization_id", organizationId)
      .neq("status", "cancelled")
      .gte("selected_date", format(monthStart, "yyyy-MM-dd"))
      .lte("selected_date", format(monthEnd, "yyyy-MM-dd"));

    if (error) {
      console.error("Error fetching month availability:", error);
      setLoadingMonth(false);
      return;
    }

    // 日付ごとの予約数を集計
    const bookingsByDate: Record<string, number> = {};
    (bookings || []).forEach((booking) => {
      const dateStr = booking.selected_date;
      bookingsByDate[dateStr] = (bookingsByDate[dateStr] || 0) + 1;
    });

    // 月の全日付に対して空き状況を計算
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const availability: DayAvailability[] = days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const bookedSlots = bookingsByDate[dateStr] || 0;
      const totalSlots = TIME_SLOTS.length;

      let status: DayAvailability["status"] = "available";
      if (bookedSlots >= totalSlots) {
        status = "full";
      } else if (bookedSlots > 0 && bookedSlots >= totalSlots * 0.6) {
        status = "partial";
      }

      return { date: dateStr, bookedSlots, status };
    });

    setMonthAvailability(availability);
    setLoadingMonth(false);
  }, [organizationId]);

  // 特定日の時間帯別空き状況を取得
  const fetchDayAvailability = useCallback(async (date: Date) => {
    if (!organizationId) return;

    setLoadingDay(true);
    const dateStr = format(date, "yyyy-MM-dd");

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("selected_time")
      .eq("organization_id", organizationId)
      .eq("selected_date", dateStr)
      .neq("status", "cancelled");

    if (error) {
      console.error("Error fetching day availability:", error);
      setLoadingDay(false);
      return;
    }

    // 時間帯ごとの予約数を集計
    const bookingsByTime: Record<string, number> = {};
    (bookings || []).forEach((booking) => {
      bookingsByTime[booking.selected_time] = 
        (bookingsByTime[booking.selected_time] || 0) + 1;
    });

    const slots: TimeSlotAvailability[] = TIME_SLOTS.map((time) => ({
      time,
      isBooked: (bookingsByTime[time] || 0) >= MAX_BOOKINGS_PER_SLOT,
    }));

    setDayTimeSlots(slots);
    setLoadingDay(false);
  }, [organizationId]);

  // リアルタイム空き確認（送信前チェック用）
  const checkRealTimeAvailability = useCallback(async (
    date: Date,
    time: string
  ): Promise<boolean> => {
    if (!organizationId) return false;

    const dateStr = format(date, "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("bookings")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("selected_date", dateStr)
      .eq("selected_time", time)
      .neq("status", "cancelled");

    if (error) {
      console.error("Error checking availability:", error);
      return false;
    }

    return (data?.length || 0) < MAX_BOOKINGS_PER_SLOT;
  }, [organizationId]);

  // 日付の空き状況を取得するヘルパー
  const getAvailabilityForDate = useCallback((date: Date): DayAvailability | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return monthAvailability.find((a) => a.date === dateStr);
  }, [monthAvailability]);

  // 時間帯の空き状況を取得するヘルパー
  const getSlotAvailability = useCallback((time: string): TimeSlotAvailability | undefined => {
    return dayTimeSlots.find((s) => s.time === time);
  }, [dayTimeSlots]);

  // 月が変更された時の処理
  const handleMonthChange = useCallback((date: Date) => {
    setCurrentMonth(date);
    fetchMonthAvailability(date);
  }, [fetchMonthAvailability]);

  // 初期ロード
  useEffect(() => {
    if (organizationId) {
      fetchMonthAvailability(currentMonth);
    }
  }, [organizationId, fetchMonthAvailability, currentMonth]);

  // リアルタイム更新の設定
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel(`bookings-availability-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          // 空き状況を再取得
          fetchMonthAvailability(currentMonth);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, currentMonth, fetchMonthAvailability]);

  return {
    monthAvailability,
    dayTimeSlots,
    loadingMonth,
    loadingDay,
    fetchMonthAvailability,
    fetchDayAvailability,
    checkRealTimeAvailability,
    getAvailabilityForDate,
    getSlotAvailability,
    handleMonthChange,
    TIME_SLOTS,
  };
};
