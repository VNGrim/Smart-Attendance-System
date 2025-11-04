export type Student = {
  id: string;
  mssv: string;
  name: string;
  className: string;
  cohort: string;
  major: string;
  advisor: string;
  status: "Hoạt động" | "Bị khóa";
  email?: string;
  phone?: string;
  avatar?: string | null;
  classList?: string[];
  statusCode?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  note?: string;
};

export type StudentOptions = {
  classes: { id: string; name: string }[];
  cohorts: string[];
  majors: string[];
  advisors: { id: string; name: string; subject: string | null }[];
};

type BackendStudent = Partial<{
  id: string;
  student_id: string;
  mssv: string;
  classList: string[];
  classes: string | string[];
  status: string;
  name: string;
  full_name: string;
  className: string;
  class_name: string;
  cohort: string;
  course: string;
  major: string;
  advisor: string;
  advisor_name: string;
  email: string;
  phone: string;
  avatar: string | null;
  avatar_url: string | null;
  statusCode: string;
  createdAt: string | null;
  updatedAt: string | null;
  note: string | null;
}>;

export const mapBackendStudent = (input: BackendStudent | null | undefined): Student => {
  const item: BackendStudent = input ?? {};

  const rawClasses = item.classList ?? item.classes;
  const classList = Array.isArray(rawClasses)
    ? rawClasses
    : typeof rawClasses === "string"
      ? rawClasses.split(",").map((cls) => cls.trim()).filter(Boolean)
      : undefined;

  const statusSource = item.status?.toLowerCase();
  const status = statusSource === "bị khóa" || statusSource === "locked" ? "Bị khóa" : "Hoạt động";

  return {
    id: item.id || item.student_id || item.mssv || crypto.randomUUID(),
    mssv: item.mssv || item.student_id || "",
    name: item.name || item.full_name || "",
    className: item.className || item.class_name || (classList ? classList[0] || "" : ""),
    cohort: item.cohort || item.course || "",
    major: item.major || "",
    advisor: item.advisor || item.advisor_name || "",
    status,
    email: item.email || "",
    phone: item.phone || "",
    avatar: item.avatar ?? item.avatar_url ?? null,
    classList,
    statusCode: item.statusCode || item.status || undefined,
    createdAt: item.createdAt ?? null,
    updatedAt: item.updatedAt ?? null,
    note: typeof item.note === "string" ? item.note : "",
  };
};
