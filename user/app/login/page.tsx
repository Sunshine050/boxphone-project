"use client";

import { LoginForm } from "@/components/login-form";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = async (username: string, password: string) => {
    try {
      await AuthService.login(username, password);
      router.push("/dashboard");
    } catch (err: any) {
      alert(err.message || "Login failed");
    }
  };

  return (
    <div className="relative min-h-screen w-screen overflow-y-auto lg:h-screen lg:overflow-hidden">

      {/* ================= Background Image Layer (ห้ามตัด) ================= */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/bg-boxphone.jpg"
          alt="Background"
          fill
          priority
          quality={100}
          className="object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />
      </div>

      {/* ================= Main Content Layer ================= */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[60%_40%] min-h-screen w-full">

        {/* Left Banner Section (Desktop Only) */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="hidden lg:flex items-center justify-center h-full px-10 relative"
        >
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-[1px] w-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-transparent to-transparent" />
          </div>
          <div className="flex h-full w-full max-w-5xl flex-col gap-6 py-10 justify-center">

            {/* Top Banner Box */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="relative h-64 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md"
            >
              <Image
                src="/banner-boxphone.jpg"
                alt="Top Banner"
                fill
                className="object-cover"
                priority
              />
            </motion.div>

            {/* Bottom Banners Grid */}
            <div className="grid grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md"
              >
                <Image
                  src="/poster-1.jpg"
                  alt="Poster 1"
                  fill
                  className="object-cover"
                  priority
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md"
              >
                <Image
                  src="/poster-2.jpg"
                  alt="Poster 2"
                  fill
                  className="object-cover"
                  priority
                />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Tablet/Mobile Layout (ปรับปรุงให้ Responsive ดีขึ้น) */}
        <div className="lg:hidden flex flex-col min-h-screen relative z-10 overflow-x-hidden">
          <AutoScrollCarousel />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex-1 flex items-center justify-center px-4 py-6"
          >
            <LoginForm onSubmit={handleLogin} />
          </motion.div>
        </div>

        {/* Right Login Section (Desktop Only) */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="hidden lg:flex h-full items-center justify-center px-4 relative z-10"
        >
          <LoginForm onSubmit={handleLogin} />
        </motion.div>
      </div>
    </div>
  );
}

// ================= ฟังก์ชัน Carousel ที่แก้ไขให้โชว์ภาพครบ (Mobile/iPad) =================
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
        const cardWidth = scrollContainer.offsetWidth;
        scrollContainer.scrollTo({
          left: cardWidth * next,
          behavior: "smooth",
        });
        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const handleScroll = () => {
    if (scrollRef.current) {
      const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
      if (index !== activeIndex) setActiveIndex(index);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="w-full px-4 pt-8 pb-4 md:px-12"
    >

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-x-auto flex snap-x snap-mandatory scrollbar-hide no-scrollbar touch-pan-x"
        style={{ scrollbarWidth: 'none' }}
      >
        {["/banner-boxphone.jpg", "/poster-1.jpg", "/poster-2.jpg"].map((src, index) => (
          <div key={index} className="w-full shrink-0 px-1.5 snap-center">
            <motion.div className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden shadow-2xl">
              {/* ภาพพื้นหลังแบบเบลอ (เฉพาะภาพ Poster) */}
              {index !== 0 && (
                <Image
                  src={src}
                  alt="blur-bg"
                  fill
                  className="object-cover blur-xl opacity-50 scale-110"
                />
              )}

              <Image
                src={src}
                alt={`Slide ${index}`}
                fill
                className={`relative z-10 ${index === 0 ? "object-cover" : "object-contain p-2"}`}
                priority={index === 0}
              />
            </motion.div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-2 mt-5">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`h-1.5 rounded-full transition-all duration-300 ${activeIndex === index ? "bg-blue-500 w-8" : "bg-slate-600 w-1.5"
              }`}
          />
        ))}
      </div>
    </motion.div>
  );
}