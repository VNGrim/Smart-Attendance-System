export type LecturerStatus = "Đang dạy" | "Tạm nghỉ" | "Thôi việc";

export type Lecturer = {
  id: string;
  code: string;
  name: string;
  dept: string;
  faculty: string;
  classes: number;
  status: LecturerStatus;
  email?: string;
  phone?: string;
  avatar?: string | null;
  classList?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export const LECTURER_STATUSES: LecturerStatus[] = ["Đang dạy", "Tạm nghỉ", "Thôi việc"];

export function mapBackendLecturer(record: any): Lecturer {
  if (!record) {
    throw new Error("Invalid lecturer payload");
  }

  const classList = Array.isArray(record.classList)
    ? record.classList.filter((item: any) => typeof item === "string" && item.trim())
    : [];

  return {
    id: record.id ?? record.teacher_id ?? record.code,
    code: record.code ?? record.teacher_id ?? "",
    name: record.name ?? record.full_name ?? "",
    dept: record.dept ?? record.subject ?? "",
    faculty: record.faculty ?? "",
    classes: typeof record.classes === "number" ? record.classes : classList.length,
    status: (record.status as LecturerStatus) ?? "Đang dạy",
    email: record.email ?? undefined,
    phone: record.phone ?? undefined,
    avatar: record.avatar ?? record.avatar_url ?? null,
    classList,
    createdAt: record.createdAt ?? record.created_at ?? null,
    updatedAt: record.updatedAt ?? record.updated_at ?? null,
  };
}
