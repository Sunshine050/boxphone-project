"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ChevronLeft } from "lucide-react";
import type { Session } from "@/types/session";
import { SessionPhoneControl } from "@/components/session-phone-control";

export function AndroidControl() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();

  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<Session[] | null>("/sessions/me");
        const found = data?.find((s) => s._id === sessionId);
        if (!found) {
          router.push("/dashboard");
          return;
        }
        setSession(found);
      } catch {
        router.push("/login");
      }
    }
    load();
  }, [sessionId, router]);

  if (!session) return null;

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-slate-950 text-white">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1 text-slate-400 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">กลับ</span>
        </button>
        <span className="text-sm text-slate-500">โหมดเต็มจอ</span>
        <span className="w-16" aria-hidden />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-3">
        <SessionPhoneControl session={session} />
      </div>
    </div>
  );
}
