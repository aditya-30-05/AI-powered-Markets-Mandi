interface Buyer {
  id: string;
  name: string;
  verified: boolean;
  active: boolean;
  location: string;
}

interface BuyerListProps {
  onSelectBuyer: (buyer: Buyer) => void;
}

// Mock buyer data
const mockBuyers: Buyer[] = [
  { id: '1', name: 'Ramesh Traders', verified: true, active: true, location: 'Azadpur Mandi' },
  { id: '2', name: 'Fresh Farms Co.', verified: true, active: true, location: 'Azadpur Mandi' },
  { id: '3', name: 'Delhi Vegetables', verified: true, active: true, location: 'Azadpur Mandi' },
];

export default function BuyerList({ onSelectBuyer }: BuyerListProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">Connect to Buyers at Azadpur Mandi</h2>
      {mockBuyers.map((buyer) => (
        <div key={buyer.id} className="border p-3 rounded-lg flex justify-between items-center">
          <div>
            <p className="font-semibold">{buyer.name}</p>
            <p className="text-sm text-gray-600">
              {buyer.verified ? '✅ Verified Buyer' : 'Buyer'} • {buyer.active ? '🟢 Active now' : 'Offline'}
            </p>
          </div>
          <button
            onClick={() => onSelectBuyer(buyer)}
            className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
          >
            Connect
          </button>
        </div>
      ))}
    </div>
  );
}