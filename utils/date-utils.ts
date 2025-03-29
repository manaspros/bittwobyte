import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";

export const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp);

  if (isToday(date)) {
    return format(date, "h:mm a");
  } else if (isYesterday(date)) {
    return `Yesterday at ${format(date, "h:mm a")}`;
  } else {
    return format(date, "MMM d, yyyy h:mm a");
  }
};

export const formatLastSeen = (date: string): string => {
  if (!date) return "Unknown";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const formatDateSeparator = (date: string): string => {
  return format(new Date(date), "MMMM d, yyyy");
};
