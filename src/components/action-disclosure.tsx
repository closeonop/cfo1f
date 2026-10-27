import { Children, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Native disclosure keeps forms, links and buttons usable by keyboard and touch. */
export function ActionDisclosure({ label = "More options", children, className, tourId }: {
  label?: string;
  children: ReactNode;
  className?: string;
  tourId?: string;
}) {
  if (Children.toArray(children).length === 0) return null;
  return (
    <details className={cn("action-disclosure", className)}>
      <summary data-tour={tourId}><span>{label}</span><ChevronDown aria-hidden="true" className="h-4 w-4" /></summary>
      <div className="action-disclosure-content">{children}</div>
    </details>
  );
}
