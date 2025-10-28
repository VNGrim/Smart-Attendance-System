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
};

export type StudentOptions = {
  classes: { id: string; name: string }[];
  cohorts: string[];
  majors: string[];
  advisors: { id: string; name: string; subject: string | null }[];
};

export const mapBackendStudent = (item: any): Student => {
  const classList = Array.isArray(item?.classList)
    ? item.classList
    : typeof item?.classes === "string"
      ? item.classes.split(",").map((cls: string) => cls.trim()).filter(Boolean)
      : undefined;

  const status = item?.status === "Bị khóa" || item?.status === "locked" ? "Bị khóa" : "Hoạt động" as const;

  return {
    id: item?.id || item?.student_id || item?.mssv || crypto.randomUUID(),
    mssv: item?.mssv || item?.student_id || "",
    name: item?.name || item?.full_name || "",
    className: item?.className || item?.class_name || (classList ? classList[0] || "" : ""),
    cohort: item?.cohort || item?.course || "",
    major: item?.major || "",
    advisor: item?.advisor || item?.advisor_name || "",
    status,
    email: item?.email || "",
    phone: item?.phone || "",
    avatar: item?.avatar || item?.avatar_url || null,
    classList,
    statusCode: item?.statusCode || item?.status || undefined,
    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
  };
};
