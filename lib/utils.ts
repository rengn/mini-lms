import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function toLocalDateTime(date: Date) {
  const localTime = date.getTime() - date.getTimezoneOffset() * 60_000;
  return new Date(localTime).toISOString().slice(0, 16);
}

export function getLocalDateTimeMinimum(now: number) {
  const nextMinute = new Date(now);
  nextMinute.setSeconds(0, 0);
  nextMinute.setTime(nextMinute.getTime() + 60_000);
  return toLocalDateTime(nextMinute);
}

export function toFutureISOString(value: string) {
  const date = new Date(value);
  const timestamp = date.getTime();

  if (
    !Number.isFinite(timestamp) ||
    toLocalDateTime(date) !== value.slice(0, 16)
  ) {
    throw new Error("Choose a valid local date and time.");
  }

  if (timestamp <= Date.now()) {
    throw new Error("Choose a date and time in the future.");
  }

  return date.toISOString();
}

export function formatScheduledAt(value: string, useLocalTime: boolean) {
  const date = new Date(value);

  if (!useLocalTime) {
    return date.toUTCString();
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
