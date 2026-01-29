"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { DeviceSelection } from "@/components/device-selection";

/* =========================
   TYPES
========================= */
export interface Device {
  id: string;
  _id?: string;
  name: string;
  model?: string;
  sdk_version?: number;
  status: "AVAILABLE" | "INUSE" | "OFFLINE";
}

/* =========================
   PAGE
========================= */
export default function DevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  /* =========================
     AUTH GUARD
  ========================= */
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      router.push("/login");
    }
  }, [router]);

  /* =========================
     FETCH + FILTER LOGIC
  ========================= */
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);

        // 🔥 ดึง device ทั้งหมด
        const allDevices = await apiFetch<Device[]>("/devices");

        // 🔥 filter เอาเฉพาะ AVAILABLE
        const availableDevices = allDevices.filter(
          (d) => d.status === "AVAILABLE"
        );

        setDevices(availableDevices);
      } catch (err: any) {
        alert(err.message || "โหลดอุปกรณ์ไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  /* =========================
     START SESSION (DEMO)
     (ต่อ backend จริงได้ทีหลัง)
  ========================= */
  const handleStartSession = (device: Device) => {
    const newSession = {
      id: Math.random().toString(36).slice(2),
      deviceId: device.id || device._id,
      deviceName: device.name,
      startTime: Date.now(),
      duration: 30,
    };

    const raw = localStorage.getItem("sessions");
    const sessions = raw ? JSON.parse(raw) : [];
    sessions.push(newSession);
    localStorage.setItem("sessions", JSON.stringify(sessions));

    router.push(`/control/${newSession.id}`);
  };

  /* =========================
     RENDER UI
  ========================= */
  return (
    <DeviceSelection
      devices={devices}
      loading={loading}
      onStartSession={handleStartSession}
      onBack={() => router.back()}
    />
  );
}
