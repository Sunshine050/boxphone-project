"use client";

import type React from "react";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { User, Lock, Eye, EyeOff, Facebook } from "lucide-react";
import { motion } from "framer-motion";

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

interface LoginFormProps {
  onSubmit: (username: string, password: string) => Promise<void> | void;
  error?: string;
  loading?: boolean;
}

export function LoginForm({ onSubmit, error = "", loading: externalLoading = false }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = externalLoading || internalLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInternalLoading(true);
    try {
      await onSubmit(username, password);
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      // แก้ไข: ใช้ h-fit สำหรับ mobile และล็อคความสูงเฉพาะ desktop (lg)
      className="w-full max-w-[380px] px-2 sm:px-0 h-fit lg:h-[600px] flex flex-col"
    >
      <Card className="flex-1 flex flex-col overflow-hidden border-none bg-slate-900/90 shadow-2xl backdrop-blur-xl p-0">

        {/* ================= Logo Section ================= */}
        <div className="relative h-40 sm:h-44 shrink-0 overflow-hidden rounded-t-3xl bg-[#001a4d]">
          <Image
            src="/bg-header-boxphone.png"
            alt="Header Background"
            fill
            priority
            className="object-cover scale-165"
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative h-full w-full">
              <Image
                src="/logo-boxhone.png"
                alt="Myreal Phone Logo"
                fill
                priority
                className="object-contain"
              />
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900" />
        </div>

        {/* ================= Login Form Section ================= */}
        <CardContent className="flex-1 flex flex-col justify-between p-6">

          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-base font-semibold sm:text-lg">
                <span className="text-blue-400">Login</span>{" "}
                <span className="text-white">Your Account</span>
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="username" className="text-[11px] text-slate-400 uppercase tracking-wider ml-1">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="username"
                    className="h-10 border-slate-700 bg-slate-800/40 pl-10 text-sm text-white focus:border-blue-500"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-[11px] text-slate-400 uppercase tracking-wider ml-1">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="h-10 border-slate-700 bg-slate-800/40 pl-10 pr-10 text-sm text-white focus:border-blue-500"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error ? (
                <p className="text-sm text-red-400 text-center" role="alert">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 h-10 mt-2 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-md"
              >
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </div>

          {/* ================= Contact Section ================= */}
          <div className="mt-6 space-y-3 text-center">

            <div className="flex items-center justify-center gap-4">
              <motion.a
                whileHover={{ scale: 1.1, y: -2 }}
                href="https://discord.com"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5865F2] text-white shadow-lg transition-colors hover:bg-[#4752c4]"
                title="Join our Discord"
              >
                <DiscordIcon className="h-6 w-6" />
              </motion.a>

              <motion.a
                whileHover={{ scale: 1.1, y: -2 }}
                href="https://facebook.com"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-lg transition-colors hover:bg-[#145dbf]"
                title="Follow us on Facebook"
              >
                <Facebook className="h-6 w-6" />
              </motion.a>
            </div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold">www.MyrealPhone.cloud</p>
          </div>

        </CardContent>
      </Card>
    </motion.div>
  );
}