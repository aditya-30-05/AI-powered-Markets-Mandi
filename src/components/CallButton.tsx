interface CallButtonProps {
  phoneNumber: string;
  buyerName?: string;
  onClick?: () => void;
}

export default function CallButton({ phoneNumber, buyerName, onClick }: CallButtonProps) {
  const handleClick = () => {
    if (onClick) onClick();
  };
  
  return (
    <a
      href={`tel:${phoneNumber}`}
      onClick={handleClick}
      className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700"
    >
      📞 Call {buyerName || 'Buyer'}
    </a>
  );
}