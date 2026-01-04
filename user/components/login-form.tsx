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

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock authentication - in production, this would validate against a backend
    if (username && password) {
      localStorage.setItem("user", username);
      router.push("/dashboard");
    }
  };
  const fillDemo = () => {
  setUsername("demo")
  setPassword("admin123")
}

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="w-full max-w-md"
    >
      <Card className="overflow-hidden border-none bg-slate-900/90 shadow-2xl backdrop-blur-xl">
        {/* Logo Section */}
        <div className="relative h-36 overflow-hidden rounded-t-lg bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 sm:h-40">
          <div className="absolute inset-0 bg-[url('/night-sky-stars.png')] bg-cover opacity-30" />
          <div className="relative flex h-full items-center justify-center">
            <div className="text-center">
              <div className="relative mb-2 inline-block">
                {/* Wolf Logo */}
                <svg
                  className="h-14 w-14 text-white drop-shadow-lg sm:h-16 sm:w-16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2L10.5 3.5L8 3L7 5L4.5 5.5L4 8L2 10L3 12L2 14L4 16L4.5 18.5L7 19L8 21L10.5 20.5L12 22L13.5 20.5L16 21L17 19L19.5 18.5L20 16L22 14L21 12L22 10L20 8L19.5 5.5L17 5L16 3L13.5 3.5L12 2Z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold leading-tight text-white drop-shadow-lg sm:text-2xl">
                MY REAL
                <br />
                PHONE
              </h1>
            </div>
          </div>
        </div>

        {/* Login Form Section */}
        <CardContent className="p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold sm:text-xl">
              <span className="text-blue-400">Login</span>{" "}
              <span className="text-white">Your Account</span>
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Field */}
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

            {/* Password Field */}
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
              className="w-full bg-blue-600 py-5 text-base font-semibold text-white transition-colors hover:bg-blue-700 sm:py-6"
            >
              Login
            </Button>
          </form>

          <div className="mt-6 space-y-4 text-center">
            <p className="text-sm text-slate-400">www.MyrealPhone.cloud</p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="
    mt-4 rounded-xl
    border border-white/10
    bg-slate-800/40
    px-4 py-3
    text-sm
  "
            >
              <p className="text-slate-400 mb-1 font-medium">Demo Account</p>

              <div className="flex flex-col gap-1 text-slate-300">
                <span>
                  Username:{" "}
                  <span className="font-mono text-blue-400">demo</span>
                </span>
                <span>
                  Password:{" "}
                  <span className="font-mono text-blue-400">admin123</span>
                </span>
              </div>

              <button
                type="button"
                onClick={fillDemo}
                className="
      mt-3 w-full
      rounded-lg
      bg-blue-600/20
      py-2
      text-sm font-semibold
      text-blue-400
      transition
      hover:bg-blue-600 hover:text-white
    "
              >
                Use Demo Account
              </button>
            </motion.div>

            {/* Social Media Icons */}
            <div className="flex items-center justify-center gap-3">
              <motion.a
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                whileHover={{ scale: 1.1 }}
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5865F2] shadow-md transition-shadow hover:shadow-lg"
                aria-label="Discord"
              >
                <svg
                  className="h-5 w-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z" />
                </svg>
              </motion.a>
              <motion.a
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                whileHover={{ scale: 1.1 }}
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] shadow-md transition-shadow hover:shadow-lg"
                aria-label="Facebook"
              >
                <svg
                  className="h-5 w-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </motion.a>
              <motion.a
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                whileHover={{ scale: 1.1 }}
                href="https://line.me"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#06C755] shadow-md transition-shadow hover:shadow-lg"
                aria-label="LINE"
              >
                <svg
                  className="h-5 w-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .628.285.628.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.348 0 .629.283.629.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .629.283.629.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
              </motion.a>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
