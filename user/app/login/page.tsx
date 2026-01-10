"use client";

import { LoginForm } from "@/components/login-form";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

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
      {/* ================= Left Banner Section (Desktop) ================= */}
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
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-4"
          >
            <h1
              className="
    text-5xl font-extrabold text-white
    tracking-wide
    drop-shadow-[0_0_18px_rgba(59,130,246,0.55)]
  "
            >
              <span className="text-blue-400">Myreal</span> Phone
            </h1>
          </motion.div>

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

      {/* ================= Tablet/Mobile Layout ================= */}
      <div className="lg:hidden flex flex-col h-full">
        <AutoScrollCarousel />

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex-1 flex items-center justify-center px-4 py-10"
        >
          <LoginForm />
        </motion.div>
      </div>

      {/* ================= Right Login Section (Desktop) ================= */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="
          hidden lg:flex
          h-full
          items-center
          justify-center
          px-4
        "
      >
        <LoginForm />
      </motion.div>
    </div>
  );
}

function AutoScrollCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const totalCards = 3;

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % totalCards;
        const cardWidth = scrollContainer.scrollWidth / totalCards;
        scrollContainer.scrollTo({
          left: cardWidth * next,
          behavior: "smooth",
        });
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="px-4 py-8 md:px-8 md:py-12"
    >
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mb-6 text-center"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
          Myreal Phone
        </h1>
      </motion.div>

      {/* Auto-scrolling horizontal cards */}
      <div
        ref={scrollRef}
        className="overflow-x-auto -mx-4 px-4 scrollbar-hide"
      >
        <div className="flex gap-4 pb-4 snap-x snap-mandatory">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              className="
                snap-center shrink-0
                w-[280px] h-[240px]
                md:w-[320px] md:h-[260px]
                rounded-3xl
                border border-white/10
                bg-gradient-to-br from-slate-800/30 to-slate-900/30
                backdrop-blur-md
              "
            />
          ))}
        </div>
      </div>

      {/* Scroll indicator dots */}
      <div className="flex justify-center gap-2 mt-4">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              activeIndex === index ? "bg-blue-500" : "bg-slate-600"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}
