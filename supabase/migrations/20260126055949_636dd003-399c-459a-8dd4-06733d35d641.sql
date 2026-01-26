-- Add notification preferences columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_notifications boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS price_alerts boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS market_updates boolean DEFAULT true;