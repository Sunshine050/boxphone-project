export interface Session {
  id: string
  userName: string
  deviceName: string
  startTime: string
  remainingTime: string
  status: "in-use" | "available" | "error" | "maintenance"
}

export const mockSessions: Session[] = [
  {
    id: "1",
    userName: "john.doe@email.com",
    deviceName: "VIP03",
    startTime: "2h 14m ago",
    remainingTime: "00:45:12",
    status: "in-use",
  },
  {
    id: "2",
    userName: "—",
    deviceName: "VIP05",
    startTime: "-",
    remainingTime: "-",
    status: "available",
  },
  {
    id: "3",
    userName: "bob@email.com",
    deviceName: "VIP08",
    startTime: "3h ago",
    remainingTime: "01:12:40",
    status: "in-use",
  },
  {
    id: "4",
    userName: "—",
    deviceName: "VIP11",
    startTime: "-",
    remainingTime: "-",
    status: "error",
  },
  {
    id: "5",
    userName: "—",
    deviceName: "VIP12",
    startTime: "-",
    remainingTime: "-",
    status: "maintenance",
  },
]
