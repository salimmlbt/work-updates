import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string, pattern: string) {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), pattern);
  } catch (e) {
    return dateStr;
  }
}

export function differenceInDays(start: string, end: string) {
  if (!start || !end) return 0;
  try {
    return differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
  } catch (e) {
    return 0;
  }
}

export const getInitials = (name?: string) => {
  if (!name) return 'U';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};
