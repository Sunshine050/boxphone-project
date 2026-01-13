export type UserStatus = "PENDING" | "INUSE" | "INACTIVE";
export type UserRole = "ADMIN" | "USER";

export type UserAction = "assign" | "disconnect" | "delete" | "time";

export interface User {
  id: string;
  _id?: string;

  name: string;
  username: string;
  password_plain?: string;

  role: UserRole;
  status: UserStatus;

  total_seconds: number;
  remaining_seconds: number;

  device_id: string | null;

  createdAt?: string;
  updatedAt?: string;
}
