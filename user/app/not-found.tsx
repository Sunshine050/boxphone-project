import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-bold tabular-nums text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold tracking-tight">ไม่พบหน้าที่ต้องการ</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        ลิงก์อาจหมดอายุหรือพิมพ์ที่อยู่ไม่ถูกต้อง
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link href="/dashboard">ไปแดชบอร์ด</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login">เข้าสู่ระบบ</Link>
        </Button>
      </div>
    </div>
  );
}
