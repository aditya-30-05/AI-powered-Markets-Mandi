import { Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  className?: string;
}

export function TextInput({ 
  value, 
  onChange, 
  onSubmit, 
  placeholder = "Or type here...",
  className 
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      onSubmit();
    }
  };

  return (
    <div 
      className={cn(
        "premium-input",
        isFocused && "ring-1 ring-primary/10",
        className
      )}
    >
      <div className="flex items-center gap-4 px-6 py-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
          <Search 
            size={20} 
            className="text-muted-foreground" 
            strokeWidth={1.5}
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={cn(
            "flex-1 bg-transparent text-lg font-medium",
            "placeholder:text-muted-foreground/40 placeholder:font-normal",
            "focus:outline-none",
            "min-w-0"
          )}
        />
        <div 
          className={cn(
            "transition-all duration-300",
            value.trim() ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
          )}
        >
          <button
            onClick={onSubmit}
            className={cn(
              "flex-shrink-0 w-12 h-12 rounded-xl",
              "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground",
              "flex items-center justify-center",
              "shadow-lg shadow-primary/20",
              "hover:shadow-xl hover:shadow-primary/25 hover:scale-105",
              "active:scale-95",
              "transition-all duration-200"
            )}
            aria-label="Submit"
          >
            <ArrowRight size={22} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
