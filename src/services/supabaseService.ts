import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check your .env file.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==================== Type Definitions ====================

export interface Conversation {
  id: string;
  listing_id?: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_offer: boolean;
  offered_price?: number;
  created_at: string;
}

export interface CallLog {
  id: string;
  conversation_id: string;
  caller_id: string;
  receiver_id: string;
  started_at: string;
  ended_at?: string;
}

// ==================== Service Functions ====================

export const supabaseService = {
  /**
   * Get an existing conversation between buyer and seller for a listing,
   * or create a new one if it doesn't exist.
   */
  async getOrCreateConversation(
    listingId: string,
    buyerId: string,
    sellerId: string
  ): Promise<Conversation> {
    // Try to find existing conversation
    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select('*')
      .eq('listing_id', listingId)
      .eq('buyer_id', buyerId)
      .eq('seller_id', sellerId)
      .maybeSingle(); // Use maybeSingle() to avoid 406 error when no rows

    if (findError && findError.code !== 'PGRST116') {
      // PGRST116 means no rows returned – that's fine
      console.error('Error finding conversation:', findError);
      throw findError;
    }

    if (existing) return existing;

    // Create new conversation
    const { data: newConv, error: insertError } = await supabase
      .from('conversations')
      .insert({
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: sellerId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating conversation:', insertError);
      throw insertError;
    }

    return newConv;
  },

  /**
   * Fetch all messages for a given conversation, ordered by creation time.
   */
  async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Send a new message (text or offer) in a conversation.
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    isOffer = false,
    offeredPrice?: number
  ): Promise<Message> {
    const messageData: any = {
      conversation_id: conversationId,
      sender_id: senderId,
      content: isOffer ? `💰 Offer: ₹${offeredPrice}` : content,
      is_offer: isOffer,
    };

    if (isOffer && offeredPrice !== undefined) {
      messageData.offered_price = offeredPrice;
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }

    return data;
  },

  /**
   * Subscribe to real-time messages in a conversation.
   * Returns the subscription object so it can be unsubscribed later.
   */
  subscribeToMessages(
    conversationId: string,
    onMessage: (message: Message) => void
  ) {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onMessage(payload.new as Message);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to messages in conversation ${conversationId}`);
        }
      });

    return channel;
  },

  /**
   * Log a call event (when user clicks the call button).
   */
  async logCall(
    conversationId: string,
    callerId: string,
    receiverId: string
  ): Promise<void> {
    const { error } = await supabase.from('calls').insert({
      conversation_id: conversationId,
      caller_id: callerId,
      receiver_id: receiverId,
      started_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to log call:', error);
      // Don't throw – call logging is non‑critical
    }
  },
};