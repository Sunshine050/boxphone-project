"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { helpSections } from "./help-content";

interface HelpSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic?: string;
}

export function HelpSheet({ open, onOpenChange, topic }: HelpSheetProps) {
  const [activeSection, setActiveSection] = useState<string | undefined>(
    topic ?? "workflow"
  );

  useEffect(() => {
    if (open && topic) {
      setActiveSection(topic);
    }
  }, [open, topic]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <SheetTitle className="text-lg">
            คู่มือการใช้งาน
          </SheetTitle>
          <SheetDescription>
            คำแนะนำและขั้นตอนการทำงานสำหรับ Admin
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-5 py-4">
            <Accordion
              type="single"
              collapsible
              value={activeSection}
              onValueChange={setActiveSection}
              className="w-full"
            >
              {helpSections.map((section, sectionIdx) => (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger className="text-left gap-3">
                    <span className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="shrink-0 font-mono text-[10px] px-1.5"
                      >
                        {sectionIdx + 1}
                      </Badge>
                      <span>{section.title}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {section.description && (
                      <p className="text-muted-foreground text-xs mb-3">
                        {section.description}
                      </p>
                    )}
                    <ol className="space-y-2.5">
                      {section.steps.map((step, stepIdx) => (
                        <li key={stepIdx} className="flex gap-2.5 text-sm leading-relaxed">
                          <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                            {stepIdx + 1}
                          </span>
                          <span className="text-foreground/90">{step.text}</span>
                        </li>
                      ))}
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
