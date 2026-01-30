import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, startOfWeek, isBefore } from "date-fns";

export interface DayAvailability {
  date: string;
  bookedSlots: number;
  status: "available" | "partial" | "full";
}

export interface TimeSlotAvailability {
  time: string;
  isBooked: boolean;
  isBlocked: boolean;
  blockInfo?: {
    id: string;
    type: string;
    title: string | null;
  };
}

// 週単位の時間スロット空き状況
export interface WeekTimeSlotAvailability {
  [dateStr: string]: TimeSlotAvailability[];
}

// ブロック情報の型
export interface BlockInfo {
  id: string;
  time: string | null;
  type: string;
  title: string | null;
}

export interface WeekBlocks {
  [dateStr: string]: BlockInfo[];
}

const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
];

const MAX_BOOKINGS_PER_SLOT = 1; // 1つの時間帯に1件のみ

export const useAvailability = (organizationId?: string) => {
  const [monthAvailability, setMonthAvailability] = useState<DayAvailability[]>([]);
  const [dayTimeSlots, setDayTimeSlots] = useState<TimeSlotAvailability[]>([]);
  const [weekTimeSlots, setWeekTimeSlots] = useState<WeekTimeSlotAvailability>({});
  const [weekBlocks, setWeekBlocks] = useState<WeekBlocks>({});
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [loadingWeek, setLoadingWeek] = useState(false);

  // キャッシュ: 週データを保存して再利用
  const [weekAvailabilityCache, setWeekAvailabilityCache] = useState<
    Record<string, { slots: WeekTimeSlotAvailability; blocks: WeekBlocks }>
  >({});

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
      isBlocked: false,
    }));

    setDayTimeSlots(slots);
    setLoadingDay(false);
  }, [organizationId]);

  // 週単位で全時間スロットの空き状況を取得（Edge Function経由で安全に取得）
  const fetchWeekAvailability = useCallback(async (weekStart: Date, showLoading = true, forceRefresh = false) => {
    if (!organizationId) return;

    const cacheKey = format(weekStart, "yyyy-MM-dd");

    // キャッシュにあればそれを使用（強制更新でなければ即座に表示）
    if (!forceRefresh && weekAvailabilityCache[cacheKey]) {
      setWeekTimeSlots(weekAvailabilityCache[cacheKey].slots);
      setWeekBlocks(weekAvailabilityCache[cacheKey].blocks);
      return;
    }

    if (showLoading) {
      setLoadingWeek(true);
    }

    const weekEnd = addDays(weekStart, 6);
    const startDateStr = format(weekStart, "yyyy-MM-dd");
    const endDateStr = format(weekEnd, "yyyy-MM-dd");

    try {
      const { data, error } = await supabase.functions.invoke("get-availability", {
        body: {
          organizationId,
          startDate: startDateStr,
          endDate: endDateStr,
        },
      });

      if (error) {
        console.error("Error fetching week availability:", error);
        setLoadingWeek(false);
        return;
      }

      const bookingsByDateTime: Record<string, Record<string, number>> = data?.availability || {};
      const blocksData: Record<string, BlockInfo[]> = data?.blocks || {};

      // 週内の全日付に対してスロット情報を作成
      const weekSlots: WeekTimeSlotAvailability = {};
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        const dateStr = format(day, "yyyy-MM-dd");
        const dayBookings = bookingsByDateTime[dateStr] || {};
        const dayBlocks = blocksData[dateStr] || [];

        // Check for all-day block
        const allDayBlock = dayBlocks.find(b => b.time === null);

        weekSlots[dateStr] = TIME_SLOTS.map((time) => {
          // Check if this specific time is blocked
          const timeBlock = dayBlocks.find(b => b.time === time);
          const isBlocked = !!allDayBlock || !!timeBlock;
          const blockInfo = timeBlock || allDayBlock;

          return {
            time,
            isBooked: (dayBookings[time] || 0) >= MAX_BOOKINGS_PER_SLOT,
            isBlocked,
            blockInfo: isBlocked && blockInfo ? {
              id: blockInfo.id,
              type: blockInfo.type,
              title: blockInfo.title,
            } : undefined,
          };
        });
      }

      // キャッシュに保存
      setWeekAvailabilityCache(prev => ({
        ...prev,
        [cacheKey]: { slots: weekSlots, blocks: blocksData }
      }));

      setWeekTimeSlots(weekSlots);
      setWeekBlocks(blocksData);
    } catch (err) {
      console.error("Error fetching week availability:", err);
    } finally {
      setLoadingWeek(false);
    }
  }, [organizationId, weekAvailabilityCache]);

  // 前後の週を先読み（バックグラウンド）
  const prefetchAdjacentWeeks = useCallback(async (currentWeekStart: Date) => {
    if (!organizationId) return;

    const nextWeek = addDays(currentWeekStart, 7);
    const prevWeek = addDays(currentWeekStart, -7);
    const today = new Date();

    // 次の週を先読み
    const nextCacheKey = format(nextWeek, "yyyy-MM-dd");
    if (!weekAvailabilityCache[nextCacheKey]) {
      fetchWeekAvailability(nextWeek, false);
    }

    // 前の週を先読み（過去でなければ）
    if (!isBefore(prevWeek, startOfWeek(today, { weekStartsOn: 1 }))) {
      const prevCacheKey = format(prevWeek, "yyyy-MM-dd");
      if (!weekAvailabilityCache[prevCacheKey]) {
        fetchWeekAvailability(prevWeek, false);
      }
    }
  }, [organizationId, weekAvailabilityCache, fetchWeekAvailability]);

  // キャッシュをクリア（リアルタイム更新時に使用）
  const clearWeekCache = useCallback(() => {
    setWeekAvailabilityCache({});
  }, []);

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

    const bookingsChannel = supabase
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
          // キャッシュをクリアして空き状況を再取得
          clearWeekCache();
          fetchMonthAvailability(currentMonth);
        }
      )
      .subscribe();

    const blocksChannel = supabase
      .channel(`blocks-availability-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "schedule_blocks",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          // キャッシュをクリアして空き状況を再取得
          clearWeekCache();
          fetchMonthAvailability(currentMonth);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(blocksChannel);
    };
  }, [organizationId, currentMonth, fetchMonthAvailability, clearWeekCache]);

  return {
    monthAvailability,
    dayTimeSlots,
    weekTimeSlots,
    weekBlocks,
    loadingMonth,
    loadingDay,
    loadingWeek,
    fetchMonthAvailability,
    fetchDayAvailability,
    fetchWeekAvailability,
    prefetchAdjacentWeeks,
    checkRealTimeAvailability,
    getAvailabilityForDate,
    getSlotAvailability,
    handleMonthChange,
    clearWeekCache,
    TIME_SLOTS,
  };
};
