import { format, addHours, parse } from "date-fns";

interface GoogleCalendarEvent {
    title: string;
    details: string;
    location?: string;
    date: Date;
    time: string; // Format: "HH:mm"
    durationMinutes?: number;
}

export const generateGoogleCalendarUrl = ({
    title,
    details,
    location,
    date,
    time,
    durationMinutes = 60, // Default to 1 hour
}: GoogleCalendarEvent) => {
    // Parse the time string to set hours and minutes on the date object
    const [hours, minutes] = time.split(":").map(Number);

    const startDate = new Date(date);
    startDate.setHours(hours);
    startDate.setMinutes(minutes);
    startDate.setSeconds(0);

    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    // Format dates as YYYYMMDDTHHmmss
    const formatDateTime = (d: Date) => format(d, "yyyyMMdd'T'HHmmss");

    const startStr = formatDateTime(startDate);
    const endStr = formatDateTime(endDate);

    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.append("action", "TEMPLATE");
    url.searchParams.append("text", title);
    url.searchParams.append("dates", `${startStr}/${endStr}`);
    url.searchParams.append("details", details);
    if (location) {
        url.searchParams.append("location", location);
    }

    return url.toString();
};
