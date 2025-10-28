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
};

export const LECTURER_STATUSES: LecturerStatus[] = ["Đang dạy", "Tạm nghỉ", "Thôi việc"];
