import { useState } from 'react';
import BuyerList from '@/components/BuyerList';
import { PriceCard } from '@/components/PriceCard';
import ChatWindow from '@/components/ui/ChatWindow';

interface Buyer {
  id: string;
  name: string;
  verified: boolean;
  active: boolean;
  location: string;
}

const mockPriceData = {
  productName: 'Tomato',
  minPrice: 100,
  maxPrice: 140,
  suggestedPrice: 130,
  confidence: 'high' as const,
  nearbyMarket: 'Azadpur Mandi',
  nearbyPrice: 135,
};

// Mock IDs – in a real app, these come from authentication
const CURRENT_VENDOR_ID = 'vendor-123';
const CURRENT_VENDOR_PHONE = '+919876543210';
const LISTING_ID = 'listing-456';

export default function ConnectToBuyers() {
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);

  const handleSelectBuyer = (buyer: Buyer) => setSelectedBuyer(buyer);
  const handleCloseChat = () => setSelectedBuyer(null);

  if (selectedBuyer) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <button
          onClick={handleCloseChat}
          className="mb-4 text-blue-600 hover:underline"
        >
          ← Back to buyers
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PriceCard {...mockPriceData} />
          <ChatWindow
            listingId={LISTING_ID}
            buyerId={selectedBuyer.id}
            buyerName={selectedBuyer.name}
            buyerPhone="+911234567890"   // mock buyer phone
            sellerId={CURRENT_VENDOR_ID}
            commodity="Tomato"
            onClose={handleCloseChat}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <PriceCard {...mockPriceData} />
      <div className="mt-6">
        <BuyerList onSelectBuyer={handleSelectBuyer} />
      </div>
    </div>
  );
}