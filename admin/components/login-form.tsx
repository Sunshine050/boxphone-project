"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Smartphone } from "lucide-react"

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.target as HTMLFormElement)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    // Demo credentials
    if (email === "admin@cloudphone.com" && password === "admin123") {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      window.location.href = "/admin"
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setError("Invalid credentials")
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-border">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-semibold">Admin Portal</CardTitle>
        <CardDescription className="text-muted-foreground">Cloud Phone Device Management System</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="admin@cloudphone.com"
              required
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="bg-background"
            />
          </div>
          {error && <div className="text-sm text-red-500 text-center">{error}</div>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
          <div className="text-xs text-muted-foreground text-center pt-2">Demo: admin@cloudphone.com / admin123</div>
        </form>
      </CardContent>
    </Card>
  )
}
