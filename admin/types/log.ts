export type LogLevel =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR";

export type LogType =
  | "USER_CREATED"
  | "TIME_ADDED"
  | "DEVICE_ASSIGNED"
  | "DEVICE_DISCONNECTED"
  | "SESSION_STARTED"
  | "SESSION_ENDED"
  | "DEVICE_STATUS_CHANGED";

export interface AdminLog {
  _id: string;
  type: LogType;
  level: LogLevel;
  message: string;

  target_user_id?: {
    _id: string;
    username: string;
    name?: string;
  };

  target_device_id?: {
    _id: string;
    name: string;
    serial_number?: string;
  };

  admin_username?: string;
  meta?: Record<string, any>;

  /** ISO / numeric string from API; may be missing on legacy rows (use _id time). */
  createdAt?: string;
  updatedAt?: string;
}