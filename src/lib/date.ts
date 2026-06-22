import { format } from "date-fns";
import { es } from "date-fns/locale";

export function formatMatchDate(date: string) {
  return format(new Date(date), "EEE d MMM, h:mm a", { locale: es });
}

export function toDatetimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
