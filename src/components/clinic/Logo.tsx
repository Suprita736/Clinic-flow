import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Activity className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight text-foreground">
        ClinicFlow
      </span>
    </span>
  );
}
