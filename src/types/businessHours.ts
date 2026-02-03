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

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { open: "09:00", close: "18:00", is_closed: false },
  tuesday: { open: "09:00", close: "18:00", is_closed: false },
  wednesday: { open: "09:00", close: "18:00", is_closed: false },
  thursday: { open: "09:00", close: "18:00", is_closed: false },
  friday: { open: "09:00", close: "18:00", is_closed: false },
  saturday: { open: "09:00", close: "17:00", is_closed: false },
  sunday: { open: null, close: null, is_closed: true },
};

// Day of week mapping (0 = Sunday, 1 = Monday, etc.)
export const DAY_OF_WEEK_KEYS: (keyof BusinessHours)[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * Generate time slots for a specific day based on business hours
 * @param businessHours The business hours configuration
 * @param dayOfWeek Day of week (0 = Sunday, 1 = Monday, etc.)
 * @param intervalMinutes Interval between slots in minutes (default: 60)
 * @returns Array of time strings (e.g., ["09:00", "10:00", ...])
 */
export function generateTimeSlotsForDay(
  businessHours: BusinessHours | null | undefined,
  dayOfWeek: number,
  intervalMinutes: number = 60
): string[] {
  if (!businessHours) {
    // Fallback to default slots if no business hours configured
    return ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  }

  const dayKey = DAY_OF_WEEK_KEYS[dayOfWeek];
  const dayHours = businessHours[dayKey];

  if (dayHours.is_closed || !dayHours.open || !dayHours.close) {
    return [];
  }

  const slots: string[] = [];
  const [openHour, openMinute] = dayHours.open.split(":").map(Number);
  const [closeHour, closeMinute] = dayHours.close.split(":").map(Number);

  let currentMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;

  while (currentMinutes < closeMinutes) {
    const hour = Math.floor(currentMinutes / 60);
    const minute = currentMinutes % 60;
    slots.push(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`);
    currentMinutes += intervalMinutes;
  }

  return slots;
}

/**
 * Get all unique time slots across all days of the week
 * @param businessHours The business hours configuration
 * @param intervalMinutes Interval between slots in minutes (default: 60)
 * @returns Sorted array of unique time strings
 */
export function getAllTimeSlots(
  businessHours: BusinessHours | null | undefined,
  intervalMinutes: number = 60
): string[] {
  if (!businessHours) {
    return ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  }

  const allSlots = new Set<string>();

  for (let i = 0; i < 7; i++) {
    const slots = generateTimeSlotsForDay(businessHours, i, intervalMinutes);
    slots.forEach((slot) => allSlots.add(slot));
  }

  return Array.from(allSlots).sort();
}

/**
 * Check if a specific time is within business hours for a given day
 * @param businessHours The business hours configuration
 * @param dayOfWeek Day of week (0 = Sunday, 1 = Monday, etc.)
 * @param time Time string (e.g., "09:00")
 * @returns true if the time is within business hours
 */
export function isWithinBusinessHours(
  businessHours: BusinessHours | null | undefined,
  dayOfWeek: number,
  time: string
): boolean {
  if (!businessHours) return true; // Default to true if no config

  const dayKey = DAY_OF_WEEK_KEYS[dayOfWeek];
  const dayHours = businessHours[dayKey];

  if (dayHours.is_closed || !dayHours.open || !dayHours.close) {
    return false;
  }

  return time >= dayHours.open && time < dayHours.close;
}

/**
 * Check if a day is a closed day (定休日)
 * @param businessHours The business hours configuration
 * @param dayOfWeek Day of week (0 = Sunday, 1 = Monday, etc.)
 * @returns true if the day is closed
 */
export function isClosedDay(
  businessHours: BusinessHours | null | undefined,
  dayOfWeek: number
): boolean {
  if (!businessHours) return false;

  const dayKey = DAY_OF_WEEK_KEYS[dayOfWeek];
  return businessHours[dayKey]?.is_closed ?? false;
}
