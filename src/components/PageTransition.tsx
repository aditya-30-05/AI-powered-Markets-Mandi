import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

// Apple-inspired easing curves
export const appleEasing = [0.25, 0.1, 0.25, 1] as const;
export const appleSpring = { type: "spring", stiffness: 300, damping: 30 };

// Shared page variants for consistent transitions
export const pageVariants = {
  initial: { 
    opacity: 0, 
    y: 8,
    scale: 0.99
  },
  enter: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: { 
      duration: 0.4, 
      ease: appleEasing,
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  },
  exit: { 
    opacity: 0, 
    y: -4,
    scale: 0.995,
    transition: { 
      duration: 0.25, 
      ease: appleEasing 
    }
  }
};

// Stagger children for cascading reveals
export const staggerContainer = {
  initial: {},
  enter: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.15
    }
  }
};

export const staggerItem = {
  initial: { opacity: 0, y: 16 },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: appleEasing }
  }
};

// Card reveal animation
export const cardReveal = {
  initial: { opacity: 0, y: 20, scale: 0.96 },
  enter: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.5, ease: appleEasing }
  }
};

// Slide variants for deeper navigation
export const slideFromRight = {
  initial: { x: "100%", opacity: 0 },
  enter: { 
    x: 0, 
    opacity: 1,
    transition: { duration: 0.4, ease: appleEasing }
  },
  exit: { 
    x: "100%", 
    opacity: 0,
    transition: { duration: 0.3, ease: appleEasing }
  }
};

export const slideFromBottom = {
  initial: { y: "100%", opacity: 0 },
  enter: { 
    y: 0, 
    opacity: 1,
    transition: { duration: 0.45, ease: appleEasing }
  },
  exit: { 
    y: "100%", 
    opacity: 0,
    transition: { duration: 0.3, ease: appleEasing }
  }
};

// Fade scale for modals/overlays
export const fadeScale = {
  initial: { opacity: 0, scale: 0.92 },
  enter: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: appleEasing }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2, ease: appleEasing }
  }
};

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ children, className = "" }: PageTransitionProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="enter"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }: PageTransitionProps) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}
