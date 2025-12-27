"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Smartphone, Activity, CheckCircle, AlertCircle, TrendingUp } from "lucide-react"
import { motion } from "framer-motion"

const stats = [
  {
    title: "Total Devices",
    value: "1,240",
    icon: Smartphone,
    trend: "+12%",
    trendLabel: "from last month",
    bgColor: "bg-slate-800/50",
    iconBg: "bg-slate-700/50",
  },
  {
    title: "Devices In Use",
    value: "845",
    subtitle: "68% utilization rate",
    icon: Activity,
    bgColor: "bg-card",
    iconBg: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  {
    title: "Available Devices",
    value: "390",
    subtitle: "Ready for immediate allocation",
    icon: CheckCircle,
    bgColor: "bg-card",
    iconBg: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
  {
    title: "Error Devices",
    value: "5",
    subtitle: "Requires attention",
    icon: AlertCircle,
    bgColor: "bg-card",
    iconBg: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function StatsCards() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
    >
      {stats.map((stat, index) => (
        <motion.div key={stat.title} variants={item}>
          <Card className={`${stat.bgColor} ${stat.borderColor || "border-border"}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
                  {stat.trend && (
                    <div className="flex items-center gap-1 text-xs text-green-500">
                      <TrendingUp className="w-3 h-3" />
                      <span className="font-medium">{stat.trend}</span>
                      <span className="text-muted-foreground">{stat.trendLabel}</span>
                    </div>
                  )}
                  {stat.subtitle && <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>}
                </div>
                <div className={`w-12 h-12 rounded-lg ${stat.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon
                    className={`h-5 w-5 ${
                      index === 1
                        ? "text-blue-500"
                        : index === 2
                          ? "text-green-500"
                          : index === 3
                            ? "text-red-500"
                            : "text-foreground"
                    }`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}
