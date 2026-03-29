"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { AuthService } from "@/services/auth.service";
import { getSafeLoginErrorMessage, sanitizeLoginInput } from "@/lib/login-error";

export default function LoginPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    setError("");

    const { username: u, password: p } = sanitizeLoginInput(username, password);

    try {
      await AuthService.login({ username: u, password: p });
      router.replace("/admin");
    } catch (err: any) {
      setError(getSafeLoginErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-background px-4 sm:px-6">
      <LoginForm onSubmit={handleLogin} isLoading={isLoading} error={error} />
    </div>
  );
}
