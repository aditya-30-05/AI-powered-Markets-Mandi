console.log("🔍 Env check:", {
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.slice(0, 10) + "..."
});
import { useState, useEffect } from 'react';
import CallButton from '../CallButton';
import { supabaseService, Message } from '@/services/supabaseService';

interface ChatWindowProps {
  conversationId?: string;        // if already exists, reuse
  listingId: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  sellerId: string;               // current user ID (vendor)
  commodity: string;
  onClose: () => void;
}

export default function ChatWindow({
  conversationId: existingConvId,
  listingId,
  buyerId,
  buyerName,
  buyerPhone,
  sellerId,
  commodity,
  onClose,
}: ChatWindowProps) {
  const [conversationId, setConversationId] = useState(existingConvId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);

  // Initialize conversation and load messages
  useEffect(() => {
    const init = async () => {
      try {
        let convId = existingConvId;
        if (!convId) {
          const conv = await supabaseService.getOrCreateConversation(
            listingId,
            buyerId,
            sellerId
          );
          convId = conv.id;
          setConversationId(convId);
        }
        // Load existing messages
        const msgs = await supabaseService.getMessages(convId);
        setMessages(msgs);
        setLoading(false);

        // Subscribe to new messages (real-time)
        const subscription = supabaseService.subscribeToMessages(convId, (newMsg) => {
          setMessages((prev) => [...prev, newMsg]);
        });

        // Cleanup on unmount
        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error('Chat initialization error:', err);
        setLoading(false);
      }
    };
    init();
  }, [existingConvId, listingId, buyerId, sellerId]);

  const sendMessage = async (content: string, isOffer = false, offeredPrice?: number) => {
  console.log("sendMessage called", { conversationId, content, isOffer, offeredPrice });
  if (!conversationId) return;
  try {
    await supabaseService.sendMessage(conversationId, sellerId, content, isOffer, offeredPrice);
    setInputText('');
  } catch (err) {
    console.error('Failed to send message:', err);
    alert('Failed to send message. Check console for details.');
  }
};

  const handleSend = () => {
  console.log("Send clicked, conversationId:", conversationId);
  if (inputText.trim() && conversationId) {
    sendMessage(inputText);
  } else {
    console.log("Cannot send: missing conversationId or empty text");
  }
};
  const handleOffer = () => {
    const amount = prompt('Enter your offer amount (₹):');
    if (amount && !isNaN(parseFloat(amount))) {
      sendMessage('', true, parseFloat(amount));
    }
  };

  const handleCallClick = async () => {
    if (conversationId) {
      await supabaseService.logCall(conversationId, sellerId, buyerId);
    }
    // The href="tel:" will handle the actual call
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px] border rounded-lg bg-white">
        <p className="text-gray-500">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] border rounded-lg bg-white shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b bg-green-50 rounded-t-lg">
        <div>
          <h3 className="font-bold">{buyerName}</h3>
          <p className="text-xs text-gray-500">Commodity: {commodity}</p>
        </div>
        <div className="flex gap-2">
          <CallButton phoneNumber={buyerPhone} buyerName={buyerName} onClick={handleCallClick} />
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender_id === sellerId ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] p-2 rounded-lg ${
                msg.is_offer
                  ? 'bg-yellow-100 border border-yellow-300'
                  : msg.sender_id === sellerId
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100'
              }`}
            >
              {msg.is_offer ? (
                <span className="font-bold">💰 Offer: ₹{msg.offered_price}</span>
              ) : (
                <span>{msg.content}</span>
              )}
              <div className="text-xs mt-1 opacity-70">
                {new Date(msg.created_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input area */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleSend}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Send
          </button>
          <button
            onClick={handleOffer}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600"
          >
            💰 Offer
          </button>
        </div>
      </div>
    </div>
  );
}