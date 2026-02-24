import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  business_name: string | null;
  mandi_location: string | null;
  product_categories: string[];
  avatar_url: string | null;
  is_verified: boolean;
  email_notifications: boolean | null;
  sms_notifications: boolean | null;
  price_alerts: boolean | null;
  market_updates: boolean | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async () => {
    try {
      // Skip if Supabase is not configured
      if (!supabase) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error loading profile",
          description: error.message,
          variant: "destructive"
        });
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Omit<Profile, "id" | "user_id" | "created_at" | "updated_at">>) => {
    try {
      // Skip if Supabase is not configured
      if (!supabase) {
        throw new Error("Supabase is not configured");
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setProfile(data);
      return { success: true, data };
    } catch (err: any) {
      console.error("Profile update error:", err);
      toast({
        title: "Error updating profile",
        description: err.message,
        variant: "destructive"
      });
      return { success: false, error: err };
    }
  };

  useEffect(() => {
    fetchProfile();

    // Skip auth listener if Supabase is not configured
    if (!supabase) {
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    profile,
    isLoading,
    updateProfile,
    refreshProfile: fetchProfile
  };
}