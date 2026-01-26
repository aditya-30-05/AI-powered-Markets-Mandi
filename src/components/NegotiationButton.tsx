import { cn } from "@/lib/utils";
import { LucideIcon, ChevronRight } from "lucide-react";

interface NegotiationButtonProps {
  icon: LucideIcon;
  label: string;
  sublabel?: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "success";
  className?: string;
}

export function NegotiationButton({
  icon: Icon,
  label,
  sublabel,
  onClick,
  variant = "secondary",
  className
}: NegotiationButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "action-button flex items-center gap-4 w-full p-4 sm:p-5",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
        variant === "primary" && "action-button-primary text-primary-foreground",
        variant === "secondary" && "bg-card border border-border/60 text-foreground hover:bg-secondary/50",
        variant === "success" && "bg-success text-success-foreground",
        className
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
        variant === "primary" && "bg-primary-foreground/15",
        variant === "secondary" && "bg-muted",
        variant === "success" && "bg-success-foreground/15"
      )}>
        <Icon size={22} strokeWidth={1.5} />
      </div>
      <div className="text-left flex-1">
        <p className="text-base font-semibold">{label}</p>
        {sublabel && (
          <p className={cn(
            "text-sm mt-0.5",
            variant === "primary" && "text-primary-foreground/70",
            variant === "secondary" && "text-muted-foreground",
            variant === "success" && "text-success-foreground/70"
          )}>
            {sublabel}
          </p>
        )}
      </div>
      <ChevronRight size={20} className={cn(
        "flex-shrink-0",
        variant === "primary" && "text-primary-foreground/50",
        variant === "secondary" && "text-muted-foreground",
        variant === "success" && "text-success-foreground/50"
      )} />
    </button>
  );
}
