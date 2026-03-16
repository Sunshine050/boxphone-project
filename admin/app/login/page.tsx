"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { AuthService } from "@/services/auth.service";
import { getSafeLoginErrorMessage, sanitizeLoginInput } from "@/lib/login-error";
import { setToken } from "@/lib/cookies";

export default function LoginPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    setError("");

    const { username: u, password: p } = sanitizeLoginInput(username, password);

    try {
      const res: any = await AuthService.login({
        username: u,
        password: p,
      });

      setToken(res.access_token);
      router.push("/admin");
    } catch (err: any) {
      setError(getSafeLoginErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoginForm onSubmit={handleLogin} isLoading={isLoading} error={error} />
    </div>
  );
}
