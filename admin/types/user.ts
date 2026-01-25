export type UserStatus = "PENDING" | "INUSE" | "INACTIVE";
export type UserRole = "ADMIN" | "USER";

export type UserDeviceItem = {
  device_id: string;
  total_seconds: number;
  remaining_seconds: number;
  started_at: string | null;
  status: UserStatus;
};

export type User = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  status: UserStatus;

  total_seconds?: number;
  remaining_seconds?: number;

  password_plain?: string;

  devices?: UserDeviceItem[];

  device_id?: string | null;
};

export type UserAction = "assign" | "disconnect" | "delete" | "time";
