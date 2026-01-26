import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, Mic, TrendingUp, MessageSquare } from "lucide-react";

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

const steps = [
  { number: 1, label: "Enter Details", icon: Mic },
  { number: 2, label: "Price Insight", icon: TrendingUp },
  { number: 3, label: "Negotiate", icon: MessageSquare },
];

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4 px-4 relative z-20">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = step.number === currentStep;
        const isCompleted = step.number < currentStep;
        
        return (
          <div key={step.number} className="flex items-center">
            {/* Step */}
            <div 
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300",
                isActive && "bg-primary/10 border border-primary/30",
                isCompleted && "bg-success/10",
                !isActive && !isCompleted && "opacity-50"
              )}
            >
              {/* Icon or Check */}
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center",
                isActive && "bg-primary text-primary-foreground",
                isCompleted && "bg-success text-success-foreground",
                !isActive && !isCompleted && "bg-muted text-muted-foreground"
              )}>
                {isCompleted ? (
                  <Check size={12} strokeWidth={3} />
                ) : (
                  <Icon size={10} strokeWidth={2.5} />
                )}
              </div>
              
              {/* Label */}
              <span
                className={cn(
                  "text-xs font-semibold transition-colors duration-300",
                  isActive && "text-primary",
                  isCompleted && "text-success",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              
              {/* Active pulse */}
              {isActive && (
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="mx-1 flex items-center">
                <div
                  className={cn(
                    "w-4 sm:w-6 h-0.5 rounded-full transition-colors duration-300",
                    isCompleted ? "bg-success/60" : "bg-border"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
