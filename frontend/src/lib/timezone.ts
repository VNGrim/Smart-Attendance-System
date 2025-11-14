const VN_TZ = "Asia/Ho_Chi_Minh";

const ensureDate = (value: Date | string | number): Date => {
  if (value instanceof Date) return value;
  // If value is a date-only string like "2025-11-12", constructing a Date
  // directly may be interpreted inconsistently across environments and
  // cause a timezone-shifted day (showing yesterday). To avoid that, parse
  // date-only strings as midday UTC which is safe when converting to VN time.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00Z`);
  }
  return new Date(value);
};

export function formatVietnamDate(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions
) {
  const date = ensureDate(value);
  const baseOptions: Intl.DateTimeFormatOptions =
    options ?? {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TZ,
    ...baseOptions,
  }).format(date);
}

export function formatVietnamDateTime(value: Date | string | number) {
  return formatVietnamDate(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatVietnamTime(value: Date | string | number) {
  return formatVietnamDate(value, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatVietnamWeekday(value: Date | string | number) {
  return formatVietnamDate(value, {
    weekday: "long",
  });
}

export function vietnamDateIso(value?: Date | string | number) {
  const date = ensureDate(value ?? Date.now());
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function nowVietnam(): Date {
  const iso = vietnamDateIso();
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: VN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
  return new Date(`${iso}T${time}`);
}
