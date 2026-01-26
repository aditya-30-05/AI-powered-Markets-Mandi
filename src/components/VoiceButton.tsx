import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  isListening: boolean;
  onClick: () => void;
  disabled?: boolean;
  size?: "default" | "large";
}

export function VoiceButton({ 
  isListening, 
  onClick, 
  disabled = false,
  size = "large" 
}: VoiceButtonProps) {
  const sizeClasses = {
    default: "w-20 h-20",
    large: "w-32 h-32 sm:w-36 sm:h-36"
  };

  const iconSize = size === "large" ? 40 : 28;

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse rings when listening */}
      {isListening && (
        <>
          <span className="pulse-ring" />
          <span className="pulse-ring" />
          <span className="pulse-ring" />
        </>
      )}
      
      {/* Ambient glow behind button */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full transition-opacity duration-700",
          isListening ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)',
          transform: 'scale(2)',
          filter: 'blur(20px)'
        }}
      />
      
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "voice-button relative z-10",
          "flex items-center justify-center",
          "text-primary-foreground",
          "focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:ring-offset-4 focus-visible:ring-offset-background",
          sizeClasses[size],
          isListening && "voice-button-listening",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label={isListening ? "Stop listening" : "Start speaking"}
      >
        {isListening ? (
          <div className="listening-wave">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        ) : (
          <Mic size={iconSize} strokeWidth={1.5} />
        )}
      </button>
    </div>
  );
}
