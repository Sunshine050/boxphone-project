import { Loader2 } from "lucide-react";

export default function AdminSegmentLoading() {
  return (
    <div className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 p-6 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm">กำลังโหลด…</p>
    </div>
  );
}
