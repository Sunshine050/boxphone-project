"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { AuthService } from "@/services/auth.service";

export default function LoginPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    setError("");

    try {
      // backend ใช้ username → map จาก email
      const res: any = await AuthService.login({
        username,
        password,
      });

      // เก็บ token
      localStorage.setItem("access_token", res.access_token);

      // redirect
      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "เข้าสู่ระบบไม่สำเร็จ");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoginForm onSubmit={handleLogin} isLoading={isLoading} error={error} />
    </div>
  );
}
