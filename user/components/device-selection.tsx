"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Smartphone, Cpu } from "lucide-react";

interface Device {
  id: string;
  name: string;
  androidVersion?: string;
  status?: "available" | "in-use";
  specs?: string;
}

export function DeviceSelection() {
  const router = useRouter();
  const [devices] = useState<Device[]>([]); // TODO: จะเชื่อมกับ API ภายหลัง

  useEffect(() => {
    // Check if we're in browser
    if (typeof window === "undefined") return;
    
    // Check if user is logged in
    const user = localStorage.getItem("user");
    if (!user) {
      router.push("/login");
    }
  }, [router]);

  const handleStartSession = (device: Device) => {
    // Create new session
    const newSession = {
      id: Math.random().toString(36).substr(2, 9),
      deviceName: device.name,
      status: "running" as const,
      startTime: Date.now(),
      duration: 30, // 30 minutes
    };

    // Save to localStorage (only in browser)
    if (typeof window !== "undefined") {
      const savedSessions = localStorage.getItem("sessions");
      const sessions = savedSessions ? JSON.parse(savedSessions) : [];
      sessions.push(newSession);
      localStorage.setItem("sessions", JSON.stringify(sessions));
    }

    // Navigate to control page
    router.push(`/control/${newSession.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-white">Select Device</h1>
          <p className="mt-2 text-slate-400">
            Choose an available Android device to start your session
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {devices.length === 0 && (
            <p className="col-span-full text-center text-slate-400">
              ยังไม่มีข้อมูลอุปกรณ์ (รอเชื่อมต่อ API)
            </p>
          )}

          {devices.map((device) => (
            <Card
              key={device.id}
              className="border-slate-800 bg-slate-900/50 backdrop-blur-xl"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20">
                      <Smartphone className="h-7 w-7 text-cyan-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white">
                        {device.name}
                      </CardTitle>
                      {device.androidVersion && (
                        <CardDescription className="text-slate-400">
                          {device.androidVersion}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400">
                    Available
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Cpu className="h-4 w-4 text-cyan-400" />
                    {device.specs && (
                      <span className="text-slate-300">{device.specs}</span>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => handleStartSession(device)}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700"
                >
                  Start Session
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
