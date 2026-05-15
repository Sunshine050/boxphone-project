"use client";

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
import type { Device } from "@/app/devices/page";

/* =========================
   PROPS
========================= */
interface Props {
  devices: Device[];
  loading: boolean;
  onStartSession: (device: Device) => void;
  onBack: () => void;
}

/* =========================
   COMPONENT (UI ONLY)
========================= */
export function DeviceSelection({
  devices,
  loading,
  onStartSession,
  onBack,
}: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={onBack}
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

        {/* Content */}
        {loading ? (
          <p className="text-center text-slate-400">กำลังโหลดอุปกรณ์...</p>
        ) : devices.length === 0 ? (
          <p className="text-center text-slate-400">
            ไม่มีอุปกรณ์ที่พร้อมใช้งาน
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {devices.map((device) => (
              <Card
                key={device.id || device._id}
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
                        {device.model && (
                          <CardDescription className="text-slate-400">
                            {device.model}
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
                  {device.sdk_version && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Cpu className="h-4 w-4 text-cyan-400" />
                      Android SDK {device.sdk_version}
                    </div>
                  )}

                  <Button
                    onClick={() => onStartSession(device)}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700"
                  >
                    Start Session
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
