import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HelpCircle, User, Store, Settings, LogOut, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  className?: string;
  onHome?: () => void;
}

export function Header({ className, onHome }: HeaderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { profile, isLoading } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      // Skip if Supabase is not configured
      if (!supabase) {
        setIsLoggedIn(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();

    // Skip auth listener if Supabase is not configured
    if (!supabase) {
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    // Skip if Supabase is not configured
    if (!supabase) {
      navigate("/auth");
      return;
    }

    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getInitials = () => {
    if (profile?.business_name) {
      return profile.business_name.slice(0, 2).toUpperCase();
    }
    if (profile?.full_name) {
      return profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    }
    return "VB";
  };

  const getDisplayName = () => {
    if (profile?.business_name) return profile.business_name;
    if (profile?.full_name) return profile.full_name;
    return "Vendor";
  };

  return (
    <header className={cn(
      "flex items-center justify-between px-6 sm:px-8 py-6",
      "safe-top",
      className
    )}>
      {/* Logo / Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            onHome?.();
            navigate("/");
          }}
          className="flex items-center gap-3 hover:opacity-80 transition-all duration-200 cursor-pointer group"
          title="Go to Home"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/85 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 group-hover:scale-105 transition-all duration-200">
            <span className="text-primary-foreground font-bold text-lg">म</span>
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-lg text-foreground tracking-tight group-hover:text-primary transition-colors duration-200">Multilingual Mandi</span>
            <p className="text-xs text-muted-foreground font-medium -mt-0.5">Fair prices, every language</p>
          </div>
        </button>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* AI Demo Button */}
        <button
          onClick={() => navigate("/ai-demo")}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl",
            "bg-primary/10 text-primary font-medium text-sm",
            "hover:bg-primary/15 transition-colors tap-feedback",
            "border border-primary/20"
          )}
        >
          <Sparkles size={16} />
          <span className="hidden sm:inline">AI Demo</span>
        </button>

        {/* Guided Voice Demo Button */}
        <button
          onClick={() => navigate("/guided-voice-demo")}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl",
            "bg-green-500/10 text-green-600 font-medium text-sm",
            "hover:bg-green-500/15 transition-colors tap-feedback",
            "border border-green-500/20"
          )}
          title="7-Step Voice Form Demo"
        >
          🎤
          <span className="hidden sm:inline">Voice Demo</span>
        </button>

        {/* Help Button */}
        <button
          className={cn(
            "w-11 h-11 rounded-2xl flex items-center justify-center",
            "text-muted-foreground hover:text-foreground",
            "bg-secondary/50 hover:bg-secondary",
            "transition-all duration-200 tap-feedback",
            "border border-border/50"
          )}
          aria-label="Help"
        >
          <HelpCircle size={20} strokeWidth={1.5} />
        </button>

        {/* Profile Dropdown or Login Button */}
        {isLoggedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-2 pl-1 pr-3 py-1 rounded-2xl",
                  "bg-secondary/50 hover:bg-secondary",
                  "transition-all duration-200 tap-feedback",
                  "border border-border/50"
                )}
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">{getInitials()}</span>
                </div>
                <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
                  {isLoading ? "..." : getDisplayName()}
                </span>
                <ChevronDown size={16} className="text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-card border border-border shadow-xl z-50"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold text-foreground">{getDisplayName()}</p>
                  {profile?.mandi_location && (
                    <p className="text-xs text-muted-foreground truncate">
                      📍 {profile.mandi_location}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate("/onboarding")}
                className="cursor-pointer"
              >
                <Store className="mr-2 h-4 w-4" />
                <span>Edit Business Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/settings")}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={() => navigate("/auth")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl",
              "bg-primary text-primary-foreground font-medium text-sm",
              "hover:bg-primary/90 transition-colors tap-feedback"
            )}
          >
            <User size={18} />
            <span>Login</span>
          </button>
        )}
      </div>
    </header>
  );
}
