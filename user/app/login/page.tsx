"use client"

import { LoginForm } from "@/components/login-form"
import { motion } from "framer-motion"

export default function LoginPage() {
  return (
    <div
      className="
        relative
        h-screen w-screen
        overflow-hidden
        grid grid-cols-1
        bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900
        lg:grid-cols-[60%_40%]
      "
    >
      {/* ================= Left Banner Section ================= */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="
          hidden lg:flex
          items-center justify-center
          h-full
          px-10
        "
      >
        <div className="flex h-full w-full max-w-5xl flex-col gap-6 py-10">
          {/* Top Banner */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="
              h-64
              rounded-3xl
              border border-white/10
              bg-gradient-to-br from-slate-800/30 to-slate-900/30
              backdrop-blur-md
            "
          />

          {/* Bottom Banners */}
          <div className="grid flex-1 grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="
                rounded-3xl
                border border-white/10
                bg-gradient-to-br from-slate-800/30 to-slate-900/30
                backdrop-blur-md
              "
            />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="
                rounded-3xl
                border border-white/10
                bg-gradient-to-br from-slate-800/30 to-slate-900/30
                backdrop-blur-md
              "
            />
          </div>
        </div>
      </motion.div>

      {/* ================= Right Login Section ================= */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="
          flex
          h-full
          items-center
          justify-center
          px-4
        "
      >
        <LoginForm />
      </motion.div>
    </div>
  )
}
