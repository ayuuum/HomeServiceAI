import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, startOfWeek, isBefore, getDay } from "date-fns";
import { 
  BusinessHours, 
  DEFAULT_BUSINESS_HOURS, 
  generateTimeSlotsForDay, 
  getAllTimeSlots,
  isClosedDay
} from "@/types/businessHours";

export interface DayAvailability {
  date: string;
  bookedSlots: number;
  status: "available" | "partial" | "full";
  isClosed?: boolean;
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

// Default time slots (fallback when no business hours are set)
const DEFAULT_TIME_SLOTS = [
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
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);
  const [lastFetchedWeekStart, setLastFetchedWeekStart] = useState<Date | null>(null);

  // キャッシュ: 週データを保存して再利用
  const [weekAvailabilityCache, setWeekAvailabilityCache] = useState<
    Record<string, { slots: WeekTimeSlotAvailability; blocks: WeekBlocks; businessHours: BusinessHours | null }>
  >({});

  // Get time slots for a specific day based on business hours
  const getTimeSlotsForDay = useCallback((date: Date): string[] => {
    const dayOfWeek = getDay(date);
    return generateTimeSlotsForDay(businessHours, dayOfWeek);
  }, [businessHours]);

  // Get all possible time slots (union of all days)
  const getAllAvailableTimeSlots = useCallback((): string[] => {
    return getAllTimeSlots(businessHours);
  }, [businessHours]);

  // Check if a day is closed
  const isDayClosed = useCallback((date: Date): boolean => {
    const dayOfWeek = getDay(date);
    return isClosedDay(businessHours, dayOfWeek);
  }, [businessHours]);

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
      const isClosed = isDayClosed(day);
      const totalSlots = isClosed ? 0 : getTimeSlotsForDay(day).length;

      let status: DayAvailability["status"] = "available";
      if (isClosed || totalSlots === 0 || bookedSlots >= totalSlots) {
        status = "full";
      } else if (bookedSlots > 0 && bookedSlots >= totalSlots * 0.6) {
        status = "partial";
      }

      return { date: dateStr, bookedSlots, status, isClosed };
    });

    setMonthAvailability(availability);
    setLoadingMonth(false);
  }, [organizationId, isDayClosed, getTimeSlotsForDay]);

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

    const timeSlots = getTimeSlotsForDay(date);
    const slots: TimeSlotAvailability[] = timeSlots.map((time) => ({
      time,
      isBooked: (bookingsByTime[time] || 0) >= MAX_BOOKINGS_PER_SLOT,
      isBlocked: false,
    }));

    setDayTimeSlots(slots);
    setLoadingDay(false);
  }, [organizationId, getTimeSlotsForDay]);

  // 週単位で全時間スロットの空き状況を取得（Edge Function経由で安全に取得）
  const fetchWeekAvailability = useCallback(async (weekStart: Date, showLoading = true, forceRefresh = false) => {
    if (!organizationId) return;

    const cacheKey = format(weekStart, "yyyy-MM-dd");

    // キャッシュにあればそれを使用（強制更新でなければ即座に表示）
    if (!forceRefresh && weekAvailabilityCache[cacheKey]) {
      setWeekTimeSlots(weekAvailabilityCache[cacheKey].slots);
      setWeekBlocks(weekAvailabilityCache[cacheKey].blocks);
      if (weekAvailabilityCache[cacheKey].businessHours) {
        setBusinessHours(weekAvailabilityCache[cacheKey].businessHours);
      }
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
      const fetchedBusinessHours: BusinessHours | null = data?.businessHours || null;

      // Update business hours from API response
      if (fetchedBusinessHours) {
        setBusinessHours(fetchedBusinessHours);
      }

      // 週内の全日付に対してスロット情報を作成
      const weekSlots: WeekTimeSlotAvailability = {};
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        const dateStr = format(day, "yyyy-MM-dd");
        const dayBookings = bookingsByDateTime[dateStr] || {};
        const dayBlocks = blocksData[dateStr] || [];
        const dayOfWeek = getDay(day);

        // Get time slots for this specific day based on business hours
        const dayTimeSlotsList = generateTimeSlotsForDay(fetchedBusinessHours, dayOfWeek);
        
        // Check for all-day block
        const allDayBlock = dayBlocks.find(b => b.time === null);
        const isClosed = isClosedDay(fetchedBusinessHours, dayOfWeek);

        // If the day is closed (定休日), return empty slots or blocked slots
        if (isClosed) {
          weekSlots[dateStr] = [];
        } else {
          weekSlots[dateStr] = dayTimeSlotsList.map((time) => {
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
      }

      // キャッシュに保存
      setWeekAvailabilityCache(prev => ({
        ...prev,
        [cacheKey]: { slots: weekSlots, blocks: blocksData, businessHours: fetchedBusinessHours }
      }));

      setWeekTimeSlots(weekSlots);
      setWeekBlocks(blocksData);
      // 最後に取得した週の開始日を記録
      setLastFetchedWeekStart(weekStart);
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
    setBusinessHours(null); // Also reset business hours to force refetch
  }, []);

  // リアルタイム空き確認（送信前チェック用）
  const checkRealTimeAvailability = useCallback(async (
    date: Date,
    time: string
  ): Promise<boolean> => {
    if (!organizationId) return false;

    // First check if the day is closed
    if (isDayClosed(date)) return false;

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
  }, [organizationId, isDayClosed]);

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

  // 組織IDが取得されたら即座に営業時間をフェッチ（初期ロード用）
  useEffect(() => {
    const fetchInitialBusinessHours = async () => {
      if (!organizationId || businessHours) return;
      
      try {
        const { data, error } = await supabase.functions.invoke("get-availability", {
          body: { organizationId },
        });
        
        if (!error && data?.businessHours) {
          setBusinessHours(data.businessHours);
        }
      } catch (err) {
        console.error("Error fetching initial business hours:", err);
      }
    };
    
    fetchInitialBusinessHours();
  }, [organizationId]);

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

    // 営業時間変更を監視
    const organizationChannel = supabase
      .channel(`organization-hours-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "organizations",
          filter: `id=eq.${organizationId}`,
        },
        () => {
          // キャッシュをクリア
          clearWeekCache();
          
          // 月の空き状況を再取得
          fetchMonthAvailability(currentMonth);
          
          // 最後に表示していた週があれば、その週を強制再取得して新しい businessHours を取得
          if (lastFetchedWeekStart) {
            fetchWeekAvailability(lastFetchedWeekStart, false, true);
          } else {
            // 週がまだ取得されていない場合は、初期営業時間を取得
            const fetchInitialBusinessHours = async () => {
              try {
                const today = new Date();
                const weekEnd = addDays(today, 6);
                const { data, error } = await supabase.functions.invoke("get-availability", {
                  body: { 
                    organizationId,
                    startDate: format(today, "yyyy-MM-dd"),
                    endDate: format(weekEnd, "yyyy-MM-dd"),
                  },
                });
                
                if (!error && data?.businessHours) {
                  setBusinessHours(data.businessHours);
                }
              } catch (err) {
                console.error("Error fetching business hours:", err);
              }
            };
            fetchInitialBusinessHours();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(blocksChannel);
      supabase.removeChannel(organizationChannel);
    };
  }, [organizationId, currentMonth, fetchMonthAvailability, clearWeekCache, lastFetchedWeekStart, fetchWeekAvailability]);

  // Export TIME_SLOTS as the dynamic version based on business hours
  const TIME_SLOTS = getAllAvailableTimeSlots();

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
    businessHours,
    getTimeSlotsForDay,
    isDayClosed,
  };
};
