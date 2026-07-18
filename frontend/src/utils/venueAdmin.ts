import { WeekdayKey, WorkingHoursSchedule } from "../types";

export const WEEKDAYS: Array<{ key: WeekdayKey; label: string; short: string }> = [
  { key: "mon", label: "Понедельник", short: "Пн" },
  { key: "tue", label: "Вторник", short: "Вт" },
  { key: "wed", label: "Среда", short: "Ср" },
  { key: "thu", label: "Четверг", short: "Чт" },
  { key: "fri", label: "Пятница", short: "Пт" },
  { key: "sat", label: "Суббота", short: "Сб" },
  { key: "sun", label: "Воскресенье", short: "Вс" },
];

const transliterationMap: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export const slugifyVenueName = (value: string) => {
  const transliterated = value
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => transliterationMap[char] ?? char)
    .join("");

  return transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
};

export const createEmptySchedule = (): WorkingHoursSchedule => ({
  mon: [],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
  note: "",
});

export const normalizeSchedule = (schedule?: Partial<WorkingHoursSchedule> | null): WorkingHoursSchedule => ({
  ...createEmptySchedule(),
  ...(schedule || {}),
});

export const formatScheduleLine = (schedule?: WorkingHoursSchedule, fallback?: string) => {
  if (!schedule) return fallback || "Расписание уточняется";

  const lines = WEEKDAYS.map(({ key, short }) => {
    const intervals = schedule[key] || [];
    if (intervals.length === 0) return `${short}: выходной`;
    return `${short}: ${intervals.map((slot) => `${slot.from}-${slot.to}`).join(", ")}`;
  });

  return lines.join(" · ");
};

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return Number.isInteger(hours) && Number.isInteger(minutes) ? hours * 60 + minutes : null;
};

export const formatTodaySchedule = (schedule?: WorkingHoursSchedule, fallback?: string, now = new Date()) => {
  if (!schedule) return fallback || "Расписание уточняется";

  const dayIndex = now.getDay();
  const key = (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as WeekdayKey[])[dayIndex];
  const label = WEEKDAYS.find((day) => day.key === key)?.short || "Сегодня";
  const previousKey = (["sat", "sun", "mon", "tue", "wed", "thu", "fri"] as WeekdayKey[])[dayIndex];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const overnightEnds = (schedule[previousKey] || [])
    .filter((slot) => {
      const from = timeToMinutes(slot.from);
      const to = timeToMinutes(slot.to);
      return from !== null && to !== null && from > to && nowMinutes < to;
    })
    .map((slot) => slot.to);

  if (overnightEnds.length > 0) return `До ${overnightEnds.join(", ")}`;

  const intervals = schedule[key] || [];

  if (intervals.length === 0) return `${label}: выходной`;
  return `${label}: ${intervals.map((slot) => `${slot.from}-${slot.to}`).join(", ")}`;
};

export const buildWorkingHoursText = (schedule: WorkingHoursSchedule) => {
  const lines = WEEKDAYS
    .map(({ key, short }) => {
      const intervals = schedule[key] || [];
      return intervals.length ? `${short} ${intervals.map((slot) => `${slot.from}-${slot.to}`).join(", ")}` : "";
    })
    .filter(Boolean);

  return [lines.join(", "), schedule.note?.trim()].filter(Boolean).join(". ");
};
