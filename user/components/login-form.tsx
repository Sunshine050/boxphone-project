"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

/* =========================
   PROPS
========================= */
interface LoginFormProps {
  onSubmit: (username: string, password: string) => Promise<void> | void;
}

/* =========================
   COMPONENT
========================= */
export function LoginForm({ onSubmit }: LoginFormProps) {
  const router = useRouter(); // ✅ เพิ่มแค่นี้
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mock authentication - in production, this would validate against a backend
    if (username && password) {
      localStorage.setItem("user", username);
      router.push("/dashboard");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="w-full max-w-md"
    >
      <Card className="overflow-hidden border-none bg-slate-900/90 shadow-2xl backdrop-blur-xl p-0">
        {/* ================= Logo Section ================= */}
        <div className="relative h-44 sm:h-52 md:h-56 overflow-hidden rounded-t-lg">
          <div
            className="
              absolute inset-0
              bg-[url('/login-header.png')]
              bg-cover
              bg-[center_35%]
            "
          />
          <div
            className="
              absolute inset-0
              bg-gradient-to-b
              from-black/0
              via-black/25
              to-slate-900
            "
          />
        </div>

        {/* ================= Login Form ================= */}
        <CardContent className="p-6 sm:p-4">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold sm:text-xl">
              <span className="text-blue-400">Login</span>{" "}
              <span className="text-white">Your Account</span>
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm text-slate-300">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="border-slate-700 bg-slate-800/50 pl-10 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-slate-300">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-slate-700 bg-slate-800/50 pl-10 pr-10 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 py-5 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60 sm:py-6"
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>

          {/* ================= Contact / Social (ไม่ตัด) ================= */}
          <div className="mt-6 space-y-4 text-center">
            <p className="text-sm text-slate-400">www.MyrealPhone.cloud</p>

            <div className="flex items-center justify-center gap-3">
              {/* Discord */}
              <motion.a
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                whileHover={{ scale: 1.1 }}
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5865F2] shadow-md transition-shadow hover:shadow-lg"
              >
                {/* svg เดิม */}
              </motion.a>

              {/* Facebook */}
              <motion.a
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                whileHover={{ scale: 1.1 }}
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] shadow-md transition-shadow hover:shadow-lg"
              >
                {/* svg เดิม */}
              </motion.a>

              {/* LINE */}
              <motion.a
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                whileHover={{ scale: 1.1 }}
                href="https://line.me"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#06C755] shadow-md transition-shadow hover:shadow-lg"
              >
                {/* svg เดิม */}
              </motion.a>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
