import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageBadgeProps {
  language: string;
  className?: string;
}

const languageNames: Record<string, string> = {
  hi: "हिंदी",
  en: "English",
  ta: "தமிழ்",
  te: "తెలుగు",
  bn: "বাংলা",
  mr: "मराठी",
  gu: "ગુજરાતી",
  kn: "ಕನ್ನಡ",
  ml: "മലയാളം",
  pa: "ਪੰਜਾਬੀ",
};

export function LanguageBadge({ language, className }: LanguageBadgeProps) {
  const displayName = languageNames[language] || language;

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-2.5 px-4 py-2",
        "bg-gradient-to-r from-accent/80 to-accent/50",
        "text-accent-foreground rounded-full",
        "text-sm font-semibold",
        "border border-accent-foreground/10",
        "shadow-sm",
        "scale-in",
        className
      )}
    >
      <Globe size={15} strokeWidth={2} />
      <span>Detected: {displayName}</span>
    </div>
  );
}
