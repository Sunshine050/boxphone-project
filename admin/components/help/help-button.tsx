"use client";

import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { HelpSheet } from "./help-sheet";

interface HelpButtonProps {
  topic?: string;
  className?: string;
}

export function HelpButton({ topic, className }: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "inline-flex items-center justify-center",
              "h-7 w-7 rounded-full",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-accent",
              "transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className
            )}
          >
            <CircleHelp className="h-4 w-4" />
            <span className="sr-only">ช่วยเหลือ</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>ช่วยเหลือ</TooltipContent>
      </Tooltip>

      <HelpSheet open={open} onOpenChange={setOpen} topic={topic} />
    </>
  );
}
