import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, Bell, Shield, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AmbientBackground } from "@/components/AmbientBackground";
import { PageTransition, staggerItem, appleEasing } from "@/components/PageTransition";

const sectionVariants = {
  initial: { opacity: 0, y: 24 },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: appleEasing }
  }
};

export default function Settings() {
  const navigate = useNavigate();
  const { profile, updateProfile, isLoading: profileLoading } = useProfile();
  const { toast } = useToast();

  // Auth state
  const [userEmail, setUserEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [marketUpdates, setMarketUpdates] = useState(true);

  // Loading states
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        setNewEmail(user.email);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (profile) {
      setEmailNotifications(profile.email_notifications ?? true);
      setSmsNotifications(profile.sms_notifications ?? true);
      setPriceAlerts(profile.price_alerts ?? true);
      setMarketUpdates(profile.market_updates ?? true);
    }
  }, [profile]);

  const handleUpdateEmail = async () => {
    if (!newEmail || newEmail === userEmail) {
      toast({
        title: "No changes",
        description: "Please enter a different email address.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast({
        title: "Verification email sent",
        description: "Please check your new email to confirm the change."
      });
    } catch (err: any) {
      toast({
        title: "Error updating email",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill in all password fields.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully."
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        title: "Error updating password",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleUpdateNotifications = async () => {
    setIsUpdatingNotifications(true);
    try {
      const result = await updateProfile({
        email_notifications: emailNotifications,
        sms_notifications: smsNotifications,
        price_alerts: priceAlerts,
        market_updates: marketUpdates
      });

      if (result.success) {
        toast({
          title: "Preferences saved",
          description: "Your notification preferences have been updated."
        });
      }
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative">
        <AmbientBackground />
        
        <div className="relative z-10">
          {/* Header */}
          <motion.header 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: appleEasing }}
            className="flex items-center gap-4 px-6 sm:px-8 py-6 safe-top"
          >
            <button
              onClick={() => navigate(-1)}
              className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center",
                "text-muted-foreground hover:text-foreground",
                "bg-secondary/50 hover:bg-secondary",
                "transition-all duration-200 tap-feedback",
                "border border-border/50"
              )}
            >
              <ArrowLeft size={20} strokeWidth={1.5} />
            </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Account Settings</h1>
            <p className="text-sm text-muted-foreground">Multilingual Mandi</p>
          </div>
          </motion.header>

          {/* Content */}
          <main className="px-6 sm:px-8 pb-12 max-w-2xl mx-auto space-y-6">
            {/* Email Section */}
            <motion.div
              variants={sectionVariants}
              initial="initial"
              animate="enter"
              transition={{ delay: 0.1 }}
            >
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Mail size={20} className="text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Email Address</CardTitle>
                      <CardDescription>Update your email for login and notifications</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="bg-background/50"
                    />
                  </div>
                  <Button 
                    onClick={handleUpdateEmail} 
                    disabled={isUpdatingEmail || newEmail === userEmail}
                    className="w-full sm:w-auto"
                  >
                    {isUpdatingEmail ? "Updating..." : "Update Email"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Password Section */}
            <motion.div 
              variants={sectionVariants}
              initial="initial"
              animate="enter"
              transition={{ delay: 0.2 }}
            >
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Lock size={20} className="text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Password</CardTitle>
                      <CardDescription>Change your account password</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="bg-background/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="bg-background/50"
                    />
                  </div>
                  <Button 
                    onClick={handleUpdatePassword} 
                    disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                    className="w-full sm:w-auto"
                  >
                    {isUpdatingPassword ? "Updating..." : "Change Password"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Notification Preferences */}
            <motion.div 
              variants={sectionVariants}
              initial="initial"
              animate="enter"
              transition={{ delay: 0.3 }}
            >
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Bell size={20} className="text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Notifications</CardTitle>
                      <CardDescription>Choose what updates you receive</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive updates via email</p>
                      </div>
                      <Switch
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">SMS Notifications</Label>
                        <p className="text-sm text-muted-foreground">Get text messages for alerts</p>
                      </div>
                      <Switch
                        checked={smsNotifications}
                        onCheckedChange={setSmsNotifications}
                      />
                    </div>

                    <div className="border-t border-border/50 pt-4">
                      <p className="text-sm font-medium text-foreground mb-4">Notification Types</p>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-base">Price Alerts</Label>
                            <p className="text-sm text-muted-foreground">When prices change significantly</p>
                          </div>
                          <Switch
                            checked={priceAlerts}
                            onCheckedChange={setPriceAlerts}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-base">Market Updates</Label>
                            <p className="text-sm text-muted-foreground">Daily mandi price summaries</p>
                          </div>
                          <Switch
                            checked={marketUpdates}
                            onCheckedChange={setMarketUpdates}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleUpdateNotifications} 
                    disabled={isUpdatingNotifications}
                    className="w-full sm:w-auto"
                  >
                    {isUpdatingNotifications ? "Saving..." : "Save Preferences"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Security Info */}
            <motion.div 
              variants={sectionVariants}
              initial="initial"
              animate="enter"
              transition={{ delay: 0.4 }}
            >
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <Shield size={20} className="text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Account Security</CardTitle>
                      <CardDescription>Your account is protected</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>Password authentication enabled</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>Secure session management</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>Data encrypted at rest</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </main>
        </div>
      </div>
    </PageTransition>
  );
}
