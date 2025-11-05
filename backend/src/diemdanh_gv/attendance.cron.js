const cron = require("node-cron");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");

dayjs.extend(utc);

const { cleanupOldSessions } = require("./attendance.model");

const DEFAULT_RETENTION_DAYS = 120;
const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
const DEFAULT_STATUSES = ["ended", "closed", "expired"];

const resolveRetentionDays = () => {
  const value = Number(process.env.ATTENDANCE_HISTORY_TTL_DAYS);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_RETENTION_DAYS;
  return Math.floor(value);
};

const resolveTimezone = () => {
  const value = process.env.CRON_TIMEZONE;
  return value && typeof value === "string" ? value : DEFAULT_TIMEZONE;
};

async function runCleanupOnce(label = "manual") {
  const retentionDays = resolveRetentionDays();
  const cutoff = dayjs().utc().subtract(retentionDays, "day").startOf("day");

  try {
    const removedCount = await cleanupOldSessions({
      before: cutoff.toDate(),
      statuses: DEFAULT_STATUSES,
    });
    console.log(
      `[Attendance][Cleanup:${label}] removed ${removedCount} sessions older than ${retentionDays} days (cutoff=${cutoff.format(
        "YYYY-MM-DD"
      )})`
    );
    return removedCount;
  } catch (error) {
    console.error(`[Attendance][Cleanup:${label}] failed`, error);
    return 0;
  }
}

function scheduleAttendanceCleanup() {
  const timezone = resolveTimezone();
  const schedule = process.env.ATTENDANCE_HISTORY_CRON || "0 0 * * *";

  cron.schedule(
    schedule,
    () => {
      runCleanupOnce("cron").catch((error) => {
        console.error("[Attendance][Cleanup] unexpected error", error);
      });
    },
    { timezone }
  );

  console.log(
    `[Attendance][Cleanup] scheduled with rule "${schedule}" (timezone=${timezone}, retention=${resolveRetentionDays()} days)`
  );
}

module.exports = {
  scheduleAttendanceCleanup,
  runCleanupOnce,
};
