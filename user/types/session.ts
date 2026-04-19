export interface Session {
  _id: string;
  status: "ACTIVE" | "PAUSED" | "EXPIRED";
  start_time: string;
  resume_time?: string;
  remaining_seconds: number;
  device_id: {
    _id: string;
    name: string;
    serial_number: string;
  };
}
