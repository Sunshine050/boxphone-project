"use client";

import type React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Smartphone,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";


const container = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      staggerChildren: 0.08,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

/* ================= Component ================= */

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    await new Promise((r) => setTimeout(r, 1000));

    if (email === "admin@cloudphone.com" && password === "admin123") {
      window.location.href = "/admin";
    } else {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full max-w-md"
    >
      <Card className="border-border/70 shadow-lg">
        <CardHeader className="space-y-2 text-center">
          {/* Logo */}
          <motion.div variants={item} className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Smartphone className="h-9 w-9 text-primary" />
            </div>
          </motion.div>

          <motion.div variants={item}>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Admin Myreal-Phone
            </CardTitle>
          </motion.div>

          <motion.div variants={item}>
            <CardDescription className="text-muted-foreground">
              Cloud Phone Device Management System
            </CardDescription>
          </motion.div>
        </CardHeader>

        <CardContent>
          <motion.form
            variants={container}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Email */}
            <motion.div variants={item} className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@cloudphone.com"
                required
              />
            </motion.div>

            {/* Password + Eye Toggle */}
            <motion.div variants={item} className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>

              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  className="pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="
                    absolute right-2 top-1/2 -translate-y-1/2
                    text-muted-foreground
                    hover:text-foreground
                    transition
                  "
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </motion.div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-500 text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <motion.div variants={item}>
              <Button
                type="submit"
                className="w-full font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังเข้าสู่ระบบ...
                  </>
                ) : (
                  "เข้าสู่ระบบ"
                )}
              </Button>
            </motion.div>

            {/* Demo */}
            <motion.div
              variants={item}
              className="text-xs text-muted-foreground text-center pt-2"
            >
              Demo: admin@cloudphone.com / admin123
            </motion.div>
          </motion.form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
